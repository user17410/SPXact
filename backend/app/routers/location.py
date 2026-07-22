"""
Location router — ingest rider + customer location pings (REST fallback).
POST /location/ping
POST /customers/{id}/share-location
POST /customers/{id}/opt-in
"""
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import (
    LocationPing, EntityType, Parcel, DeliveryAttempt, 
    VerdictState, Customer, ParcelStatus
)
from app.schemas import LocationPingRequest, CustomerShareLocationRequest, OptInRequest
from app.services.geo import is_within_geofence, is_customer_co_located
from app.services.spoof import check_teleport
from app.ws_hub import manager
from app.config import GEOFENCE_M

router = APIRouter(tags=["location"])


@router.post("/location/ping")
async def ingest_location_ping(req: LocationPingRequest, session: Session = Depends(get_session)):
    """
    Ingest a location ping from rider or customer.
    Triggers geofence/teleport checks for riders.
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

    # For riders, check geofence and teleport
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

            # Update ping with attempt_id
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
        attempt_stmt = select(DeliveryAttempt).where(
            DeliveryAttempt.parcel_id == parcel.id,
            DeliveryAttempt.verdict_state.in_([  # type: ignore
                VerdictState.PENDING,
                VerdictState.ATTEMPT_WINDOW_OPEN,
            ])
        )
        attempt = session.exec(attempt_stmt).first()

        if attempt:
            attempt.customer_signal_present = True
            ping.attempt_id = attempt.id

            # Check proximity with last rider ping
            rider_ping_stmt = (
                select(LocationPing)
                .where(
                    LocationPing.entity_type == EntityType.RIDER,
                    LocationPing.entity_id == attempt.rider_id,
                )
                .order_by(LocationPing.ts.desc())  # type: ignore
                .limit(1)
            )
            rider_ping = session.exec(rider_ping_stmt).first()

            if rider_ping:
                co_located = is_customer_co_located(
                    rider_ping.lat, rider_ping.lng,
                    req.lat, req.lng,
                )
                attempt.customer_presence_confirmed = co_located

            session.add(attempt)

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
