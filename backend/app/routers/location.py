"""
Location router — ingest rider + customer location pings (REST fallback).
POST /location/ping
POST /customers/{id}/share-location
POST /customers/{id}/opt-in
"""
import logging
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    LocationPing, EntityType, Parcel, DeliveryAttempt,
    VerdictState, Customer, ParcelStatus
)
from app.schemas import LocationPingRequest, CustomerShareLocationRequest, OptInRequest
from app.services.geo import is_within_geofence, is_customer_co_located, haversine_distance_m
from app.services.spoof import check_teleport
from app.ws_hub import manager
from app.config import GEOFENCE_M, PROXIMITY_M

router = APIRouter(tags=["location"])
logger = logging.getLogger("spxact.presence")

# Smooth over the last few pings from EACH device before comparing distance.
# A single instantaneous GPS fix is noisy (a few meters of jitter is normal
# even outdoors); when the true distance is large that noise doesn't matter,
# but right at a tight threshold it can push either device's reading over the
# line in either direction. Averaging recent points cancels most of that
# jitter out. 3 samples at the ~2-3s ping interval both apps use is ~6-9s of
# smoothing — enough to stabilize the reading without feeling laggy.
PRESENCE_SMOOTHING_SAMPLES = 3


def _active_attempt_for_parcel(session: Session, parcel_id: int) -> DeliveryAttempt | None:
    stmt = select(DeliveryAttempt).where(
        DeliveryAttempt.parcel_id == parcel_id,
        DeliveryAttempt.verdict_state.in_([  # type: ignore
            VerdictState.PENDING,
            VerdictState.ATTEMPT_WINDOW_OPEN,
        ])
    )
    return session.exec(stmt).first()


def _latest_ping(session: Session, entity_type: EntityType, entity_id: int) -> LocationPing | None:
    stmt = (
        select(LocationPing)
        .where(LocationPing.entity_type == entity_type, LocationPing.entity_id == entity_id)
        .order_by(LocationPing.ts.desc())  # type: ignore
        .limit(1)
    )
    return session.exec(stmt).first()


def _smoothed_position(
    session: Session, entity_type: EntityType, entity_id: int, n: int = PRESENCE_SMOOTHING_SAMPLES
) -> tuple[float, float] | None:
    """Average the last n pings for one device — see PRESENCE_SMOOTHING_SAMPLES."""
    stmt = (
        select(LocationPing)
        .where(LocationPing.entity_type == entity_type, LocationPing.entity_id == entity_id)
        .order_by(LocationPing.ts.desc())  # type: ignore
        .limit(n)
    )
    pings = session.exec(stmt).all()
    if not pings:
        return None
    return (sum(p.lat for p in pings) / len(pings), sum(p.lng for p in pings) / len(pings))


async def _recompute_and_notify(
    session: Session, attempt: DeliveryAttempt, parcel_id: int,
    rider_lat: float, rider_lng: float, customer_lat: float, customer_lng: float,
) -> bool:
    """
    Single source of truth for the near/not-near check — used on the initial
    share, and again on every subsequent ping from EITHER side, so presence
    never goes stale waiting on one particular device to move. Always pushes
    a fresh presence_update to the rider channel (near/not-near only, never
    coordinates) so the UI reflects reality within one ping cycle.
    """
    distance = haversine_distance_m(rider_lat, rider_lng, customer_lat, customer_lng)
    co_located = distance <= PROXIMITY_M

    logger.info(
        "presence check parcel=%s distance=%.1fm threshold=%sm -> %s",
        parcel_id, distance, PROXIMITY_M, "NEAR" if co_located else "not near",
    )
    # Visible in the built-in test panel (http://<host>:8000) on the ops feed —
    # the actual distance never goes to the rider, only the near/not-near flag.
    await manager.send_to_channel("ops", "presence_debug", {
        "parcel_id": parcel_id,
        "distance_m": round(distance, 1),
        "threshold_m": PROXIMITY_M,
        "near": co_located,
    })

    if co_located != attempt.customer_presence_confirmed:
        attempt.customer_presence_confirmed = co_located
        session.add(attempt)
        session.commit()
    await manager.send_to_channel("rider", "presence_update", {
        "near": co_located,
        "responded": True,
        "parcel_id": parcel_id,
    })
    return co_located


@router.post("/location/ping")
async def ingest_location_ping(req: LocationPingRequest, session: Session = Depends(get_session)):
    """
    Ingest a location ping from rider or customer.
    Triggers geofence/teleport checks for riders, and re-checks proximity
    for whichever attempt this entity is party to (see _recompute_and_notify).
    """
    ping = LocationPing(
        entity_type=EntityType(req.entity_type),
        entity_id=req.entity_id,
        lat=req.lat,
        lng=req.lng,
        accuracy_m=req.accuracy,
        is_mock=req.is_mock,
        speed_mps=req.speed,
        ts=datetime.utcnow(),
    )
    session.add(ping)
    session.commit()

    result = {"stored": True, "geofence_entered": False, "teleport": False, "mock": req.is_mock}

    if req.entity_type == "RIDER":
        # Find active attempt for this rider
        statement = select(DeliveryAttempt).where(
            DeliveryAttempt.rider_id == req.entity_id,
            DeliveryAttempt.verdict_state.in_([  # type: ignore
                VerdictState.PENDING,
                VerdictState.ATTEMPT_WINDOW_OPEN,
            ])
        )
        attempt = session.exec(statement).first()

        if attempt:
            parcel = session.get(Parcel, attempt.parcel_id)
            if parcel:
                # Geofence check
                if is_within_geofence(req.lat, req.lng, parcel.lat, parcel.lng, parcel.geofence_m):
                    if not attempt.geofence_entered:
                        attempt.geofence_entered = True
                        if attempt.verdict_state == VerdictState.PENDING:
                            attempt.verdict_state = VerdictState.ATTEMPT_WINDOW_OPEN
                            attempt.started_at = datetime.utcnow()
                        session.add(attempt)
                        session.commit()
                        result["geofence_entered"] = True

                        # Notify ops + rider
                        await manager.send_to_channel("ops", "attempt_window_open", {
                            "parcel_id": parcel.id,
                            "rider_id": req.entity_id,
                        })
                        await manager.send_to_channel("rider", "attempt_window_open", {
                            "parcel_id": parcel.id,
                        })

                # Teleport check — compare with previous ping
                prev_ping_stmt = (
                    select(LocationPing)
                    .where(
                        LocationPing.entity_type == EntityType.RIDER,
                        LocationPing.entity_id == req.entity_id,
                        LocationPing.id != ping.id,
                    )
                    .order_by(LocationPing.ts.desc())  # type: ignore
                    .limit(1)
                )
                prev_ping = session.exec(prev_ping_stmt).first()
                if prev_ping:
                    is_teleport = check_teleport(
                        prev_ping.lat, prev_ping.lng, prev_ping.ts,
                        req.lat, req.lng, ping.ts,
                    )
                    if is_teleport:
                        attempt.teleport = True
                        session.add(attempt)
                        session.commit()
                        result["teleport"] = True

                # Mock location
                if req.is_mock:
                    attempt.mock_location = True
                    session.add(attempt)
                    session.commit()

                # Live proximity recompute — the customer may have shared earlier
                # in this attempt; re-check against fresh (smoothed) positions so
                # presence tracks both devices as they move, not a stale snapshot.
                if attempt.customer_signal_present:
                    rider_pos = _smoothed_position(session, EntityType.RIDER, req.entity_id)
                    customer_pos = _smoothed_position(session, EntityType.CUSTOMER, parcel.customer_id)
                    if rider_pos and customer_pos:
                        await _recompute_and_notify(
                            session, attempt, parcel.id,
                            rider_pos[0], rider_pos[1], customer_pos[0], customer_pos[1],
                        )

            # Update ping with attempt_id
            ping.attempt_id = attempt.id
            session.add(ping)
            session.commit()

    elif req.entity_type == "CUSTOMER":
        # Symmetric to the RIDER branch above — if the recipient is the one
        # moving (or just has a fresher GPS fix) while the rider stands still,
        # presence should update off THEIR ping too, not wait on the rider's
        # next cycle. Only applies once they've actually opted in via the
        # share-location prompt (customer_signal_present).
        parcel_stmt = select(Parcel).where(
            Parcel.customer_id == req.entity_id,
            Parcel.status == ParcelStatus.OUT_FOR_DELIVERY,
        )
        parcel = session.exec(parcel_stmt).first()
        if parcel:
            attempt = _active_attempt_for_parcel(session, parcel.id)
            if attempt and attempt.customer_signal_present:
                rider_pos = _smoothed_position(session, EntityType.RIDER, attempt.rider_id)
                customer_pos = _smoothed_position(session, EntityType.CUSTOMER, req.entity_id)
                if rider_pos and customer_pos:
                    await _recompute_and_notify(
                        session, attempt, parcel.id,
                        rider_pos[0], rider_pos[1], customer_pos[0], customer_pos[1],
                    )
                ping.attempt_id = attempt.id
                session.add(ping)
                session.commit()

    return result


@router.post("/customers/{customer_id}/share-location")
async def customer_share_location(
    customer_id: int,
    req: CustomerShareLocationRequest,
    session: Session = Depends(get_session)
):
    """
    Customer one-shot location share (opt-in).
    Sets customer_signal_present. Server computes proximity.
    Customer coords are NEVER sent to rider.
    """
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    # Store ping
    ping = LocationPing(
        entity_type=EntityType.CUSTOMER,
        entity_id=customer_id,
        lat=req.lat,
        lng=req.lng,
        accuracy_m=req.accuracy,
        ts=datetime.utcnow(),
    )
    session.add(ping)

    # Find active attempt for this customer's parcel
    statement = select(Parcel).where(
        Parcel.customer_id == customer_id,
        Parcel.status == ParcelStatus.OUT_FOR_DELIVERY,
    )
    parcel = session.exec(statement).first()

    if parcel:
        attempt = _active_attempt_for_parcel(session, parcel.id)

        if attempt:
            attempt.customer_signal_present = True
            ping.attempt_id = attempt.id
            session.add(attempt)
            session.commit()

            # Check proximity with the rider's recent positions, and push the
            # result to the rider immediately (near/not-near only — never coords).
            rider_pos = _smoothed_position(session, EntityType.RIDER, attempt.rider_id)
            if rider_pos:
                await _recompute_and_notify(
                    session, attempt, parcel.id,
                    rider_pos[0], rider_pos[1], req.lat, req.lng,
                )
            else:
                # No rider ping yet to compare against — tell the rider the
                # customer responded, without claiming a (currently unknown) verdict.
                await manager.send_to_channel("rider", "presence_update", {
                    "near": False,
                    "responded": True,
                    "parcel_id": parcel.id,
                })

    session.commit()

    # Notify ops (with coords for internal use)
    await manager.send_to_channel("ops", "signal_update", {
        "signal": "customer_location_shared",
        "customer_id": customer_id,
        "points": 20,
        "confidence": 0,  # Will be computed at verdict time
    })

    return {"shared": True, "customer_id": customer_id}


@router.post("/customers/{customer_id}/opt-in")
def customer_opt_in(customer_id: int, req: OptInRequest, session: Session = Depends(get_session)):
    """Record customer consent for Delivery Protection."""
    customer = session.get(Customer, customer_id)
    if not customer:
        raise HTTPException(status_code=404, detail="Customer not found")

    customer.protection_opt_in = req.opt_in
    session.add(customer)
    session.commit()

    return {"customer_id": customer_id, "protection_opt_in": req.opt_in}
