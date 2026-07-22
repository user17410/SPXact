"""
BLE handshake router — simulated handshake token exchange.
POST /ble/handshake
In demo: exchanges signed token over WebSocket. Both panels flash green.
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import DeliveryAttempt, VerdictState, Parcel
from app.schemas import HandshakeRequest
from app.ws_hub import manager

router = APIRouter(prefix="/ble", tags=["ble"])


@router.post("/handshake")
async def simulate_handshake(req: HandshakeRequest, session: Session = Depends(get_session)):
    """
    Simulate BLE handshake between rider and customer devices.
    Sets ble_handshake=true on the active attempt.
    Broadcasts handshake_confirmed to all channels (triggers flash+sound+haptic).
    """
    parcel = session.get(Parcel, req.parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    # Find active attempt
    attempt = session.exec(
        select(DeliveryAttempt).where(
            DeliveryAttempt.parcel_id == req.parcel_id,
            DeliveryAttempt.verdict_state.in_([  # type: ignore
                VerdictState.PENDING,
                VerdictState.ATTEMPT_WINDOW_OPEN,
            ])
        )
    ).first()

    if not attempt:
        raise HTTPException(status_code=404, detail="No active attempt for this parcel")

    # Set BLE handshake
    attempt.ble_handshake = True
    attempt.customer_presence_confirmed = True
    attempt.geofence_entered = True  # BLE means physically close
    session.add(attempt)
    session.commit()

    # Broadcast handshake_confirmed to ALL channels (triggers the flash moment)
    handshake_payload = {
        "parcel_id": req.parcel_id,
        "attempt_id": attempt.id,
        "confirmed": True,
        "message": "PRESENCE CONFIRMED ✓",
        "timestamp": datetime.utcnow().isoformat(),
    }

    await manager.send_to_channel("rider", "handshake_confirmed", handshake_payload)
    await manager.send_to_channel("customer", "handshake_confirmed", handshake_payload)
    await manager.send_to_channel("ops", "handshake_confirmed", handshake_payload)

    # Signal update for ops dial
    await manager.send_to_channel("ops", "signal_update", {
        "signal": "ble_handshake",
        "points": 35,
        "confidence": 0,  # Will be computed at verdict time
        "parcel_id": req.parcel_id,
    })

    return {
        "handshake": True,
        "parcel_id": req.parcel_id,
        "attempt_id": attempt.id,
        "message": "BLE handshake confirmed — presence verified.",
    }
