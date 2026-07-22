"""
Attempts router — start / close attempt → Verdict Engine.
POST /attempts/{parcel_id}/start
POST /attempts/{parcel_id}/close
GET  /attempts/{parcel_id}
"""
import json
import random
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    Parcel, DeliveryAttempt, VerdictState, ParcelStatus,
    FraudEvent, FraudType, LocationPing, EntityType, OutcomeRequested
)
from app.schemas import CloseAttemptRequest, VerdictResponse, AttemptStatusResponse
from app.services.verdict import decide
from app.services.confidence import compute_confidence
from app.services import ledger as ledger_service
from app.ws_hub import manager
from app.config import DWELL_MIN

router = APIRouter(prefix="/attempts", tags=["attempts"])


def _generate_otp() -> str:
    """Generate a 4-digit OTP for delivery verification."""
    return f"{random.randint(1000, 9999)}"


@router.post("/{parcel_id}/start")
async def start_attempt(parcel_id: int, session: Session = Depends(get_session)):
    """
    Start a delivery attempt — opens ATTEMPT_WINDOW_OPEN, starts dwell, pings customer.
    """
    parcel = session.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    if not parcel.rider_id:
        raise HTTPException(status_code=400, detail="No rider assigned to parcel")

    # Check for existing active attempt
    existing = session.exec(
        select(DeliveryAttempt).where(
            DeliveryAttempt.parcel_id == parcel_id,
            DeliveryAttempt.verdict_state.in_([  # type: ignore
                VerdictState.PENDING,
                VerdictState.ATTEMPT_WINDOW_OPEN,
            ])
        )
    ).first()

    if existing:
        # Update existing to ATTEMPT_WINDOW_OPEN
        attempt = existing
        if attempt.verdict_state == VerdictState.PENDING:
            attempt.verdict_state = VerdictState.ATTEMPT_WINDOW_OPEN
            attempt.started_at = datetime.utcnow()
    else:
        # Create new attempt
        otp = _generate_otp()
        attempt = DeliveryAttempt(
            parcel_id=parcel_id,
            rider_id=parcel.rider_id,
            verdict_state=VerdictState.ATTEMPT_WINDOW_OPEN,
            started_at=datetime.utcnow(),
            otp=otp,
        )

    session.add(attempt)
    session.commit()
    session.refresh(attempt)

    # Notify customer: "Your rider is nearby" — NO coordinates
    await manager.send_to_channel("customer", "rider_nearby", {
        "nearby": True,
        "parcel_id": parcel_id,
        "message": "Your rider is nearby!",
    })

    # Notify ops
    await manager.send_to_channel("ops", "attempt_window_open", {
        "parcel_id": parcel_id,
        "rider_id": parcel.rider_id,
        "attempt_id": attempt.id,
    })

    # Send OTP to customer channel for display
    await manager.send_to_channel("customer", "otp_generated", {
        "parcel_id": parcel_id,
        "otp": attempt.otp,
    })

    return {
        "attempt_id": attempt.id,
        "parcel_id": parcel_id,
        "state": attempt.verdict_state.value,
        "otp": attempt.otp,
        "started_at": attempt.started_at.isoformat() if attempt.started_at else None,
    }


@router.post("/{parcel_id}/close", response_model=VerdictResponse)
async def close_attempt(
    parcel_id: int,
    req: CloseAttemptRequest,
    session: Session = Depends(get_session),
):
    """
    Close a delivery attempt — runs the Verdict Engine.
    Returns verdict state, confidence, and whether action is allowed.
    """
    parcel = session.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    # Find active attempt
    attempt = session.exec(
        select(DeliveryAttempt).where(
            DeliveryAttempt.parcel_id == parcel_id,
            DeliveryAttempt.verdict_state.in_([  # type: ignore
                VerdictState.PENDING,
                VerdictState.ATTEMPT_WINDOW_OPEN,
            ])
        )
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No active attempt for this parcel")

    # Calculate dwell
    if attempt.started_at:
        attempt.dwell_seconds = int((datetime.utcnow() - attempt.started_at).total_seconds())

    # Check OTP
    otp_verified = False
    if req.otp and req.otp == attempt.otp:
        otp_verified = True
        attempt.otp_verified = True

    # Photo
    if req.photo_url:
        attempt.photo_url = req.photo_url

    # Set outcome requested
    attempt.outcome_requested = req.outcome

    # Build signals dict for verdict engine
    signals = {
        "geofence_entered": attempt.geofence_entered,
        "dwell_satisfied": attempt.dwell_seconds >= DWELL_MIN,
        "dwell_seconds": attempt.dwell_seconds,
        "ble_handshake": attempt.ble_handshake,
        "customer_presence_confirmed": attempt.customer_presence_confirmed,
        "customer_signal_present": attempt.customer_signal_present,
        "otp_verified": otp_verified,
        "mock_location": attempt.mock_location,
        "teleport": attempt.teleport,
        "photo": bool(attempt.photo_url),
        "attestation_pass": attempt.attestation_pass,
        "attestation_fail": attempt.attestation_fail,
        "accuracy_good": attempt.accuracy_good,
        "no_geofence_entry": not attempt.geofence_entered,
    }

    # Run Verdict Engine
    state, confidence, allowed, message = decide(req.outcome, signals)

    # Update attempt
    attempt.verdict_state = state
    attempt.confidence = confidence
    attempt.signals_json = json.dumps(signals)
    attempt.ended_at = datetime.utcnow()
    session.add(attempt)

    # Update parcel status based on verdict
    if state in (VerdictState.DELIVERED_VERIFIED, VerdictState.DELIVERED_UNVERIFIED):
        parcel.status = ParcelStatus.DELIVERED
    elif state in (VerdictState.FAILED_VERIFIED, VerdictState.FAILED_UNVERIFIED):
        parcel.status = ParcelStatus.FAILED
    elif state == VerdictState.BLOCKED_CONTRADICTION:
        pass  # parcel stays OUT_FOR_DELIVERY
    elif state == VerdictState.FLAGGED_SUSPICIOUS:
        pass  # parcel stays, routed to review
    session.add(parcel)
    session.commit()

    # Append to Trust Ledger
    ledger_payload = {
        "attempt_id": attempt.id,
        "parcel_id": parcel_id,
        "verdict_state": state.value,
        "confidence": confidence,
        "signals": signals,
        "ts": datetime.utcnow().isoformat(),
    }
    entry = ledger_service.append_entry(session, attempt.id, ledger_payload)

    # Create fraud event if blocked/suspicious
    if state in (VerdictState.BLOCKED_CONTRADICTION, VerdictState.FLAGGED_SUSPICIOUS):
        fraud_event = FraudEvent(
            attempt_id=attempt.id,
            lat=parcel.lat,
            lng=parcel.lng,
            type=FraudType(state.value),
            ts=datetime.utcnow(),
        )
        session.add(fraud_event)
        session.commit()
        session.refresh(fraud_event)

        await manager.send_to_channel("ops", "fraud_event", {
            "id": fraud_event.id,
            "attempt_id": attempt.id,
            "lat": fraud_event.lat,
            "lng": fraud_event.lng,
            "type": fraud_event.type.value,
        })

    # Delete location pings for this attempt (retention rule)
    pings = session.exec(
        select(LocationPing).where(LocationPing.attempt_id == attempt.id)
    ).all()
    for p in pings:
        session.delete(p)
    session.commit()

    # Broadcast verdict to all channels
    verdict_payload = {
        "parcel_id": parcel_id,
        "attempt_id": attempt.id,
        "state": state.value,
        "confidence": confidence,
        "allowed": allowed,
        "message": message,
    }
    await manager.broadcast("verdict", verdict_payload)

    # Broadcast ledger append to ops
    await manager.send_to_channel("ops", "ledger_append", {
        "id": entry.id,
        "seq": entry.seq,
        "hash": entry.hash[:16],
        "verdict_state": state.value,
        "confidence": confidence,
    })

    # Signal updates to ops for the confidence dial
    for signal_name, active in signals.items():
        if active and signal_name in ("geofence_entered", "dwell_satisfied", "ble_handshake",
                                       "customer_presence_confirmed", "otp_verified",
                                       "attestation_pass", "accuracy_good",
                                       "mock_location", "teleport", "no_geofence_entry", "attestation_fail"):
            from app.config import WEIGHTS
            if signal_name in WEIGHTS:
                await manager.send_to_channel("ops", "signal_update", {
                    "signal": signal_name,
                    "points": WEIGHTS[signal_name],
                    "confidence": confidence,
                    "parcel_id": parcel_id,
                })

    return VerdictResponse(
        state=state,
        confidence=confidence,
        signals=signals,
        allowed=allowed,
        message=message,
    )


@router.get("/{parcel_id}", response_model=AttemptStatusResponse)
def get_attempt_status(parcel_id: int, session: Session = Depends(get_session)):
    """Get current attempt state + confidence + signals for a parcel."""
    attempt = session.exec(
        select(DeliveryAttempt).where(DeliveryAttempt.parcel_id == parcel_id)
        .order_by(DeliveryAttempt.id.desc())  # type: ignore
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No attempt found for this parcel")

    signals = json.loads(attempt.signals_json) if attempt.signals_json != "{}" else {}

    return AttemptStatusResponse(
        id=attempt.id,
        parcel_id=attempt.parcel_id,
        verdict_state=attempt.verdict_state,
        confidence=attempt.confidence,
        dwell_seconds=attempt.dwell_seconds,
        signals=signals,
        started_at=attempt.started_at,
        ended_at=attempt.ended_at,
    )


@router.post("/{parcel_id}/fast-forward-dwell")
async def fast_forward_dwell(parcel_id: int, session: Session = Depends(get_session)):
    """
    Demo helper: fast-forward dwell timer to satisfy DWELL_MIN.
    Sets dwell_seconds = DWELL_MIN and marks dwell_satisfied.
    """
    attempt = session.exec(
        select(DeliveryAttempt).where(
            DeliveryAttempt.parcel_id == parcel_id,
            DeliveryAttempt.verdict_state == VerdictState.ATTEMPT_WINDOW_OPEN,
        )
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No active attempt window")

    attempt.dwell_seconds = DWELL_MIN
    attempt.geofence_entered = True  # If dwelling, must be in geofence
    if attempt.started_at:
        # Pretend we started DWELL_MIN seconds ago
        from datetime import timedelta
        attempt.started_at = datetime.utcnow() - timedelta(seconds=DWELL_MIN)
    session.add(attempt)
    session.commit()

    await manager.send_to_channel("ops", "signal_update", {
        "signal": "dwell_satisfied",
        "points": 20,
        "confidence": 0,
        "parcel_id": parcel_id,
    })

    return {"parcel_id": parcel_id, "dwell_seconds": DWELL_MIN, "dwell_satisfied": True}
