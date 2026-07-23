"""
Parcels router — dispatch, list, get.
POST /parcels/{id}/dispatch → sets OUT_FOR_DELIVERY, pushes to customer channel.
"""
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.db import get_session
from app.models import Parcel, ParcelStatus, Customer
from app.ws_hub import manager
from app.schemas import ParcelResponse, DispatchRequest

router = APIRouter(prefix="/parcels", tags=["parcels"])


@router.get("", response_model=list[ParcelResponse])
def list_parcels(session: Session = Depends(get_session)):
    """List all parcels."""
    parcels = session.exec(select(Parcel)).all()
    return parcels


@router.get("/{parcel_id}", response_model=ParcelResponse)
def get_parcel(parcel_id: int, session: Session = Depends(get_session)):
    """Get a single parcel."""
    parcel = session.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")
    return parcel


@router.post("/{parcel_id}/dispatch")
async def dispatch_parcel(
    parcel_id: int, req: Optional[DispatchRequest] = None, session: Session = Depends(get_session)
):
    """
    Dispatch a parcel — sets status to OUT_FOR_DELIVERY.
    Pushes push_out_for_delivery to customer channel via WebSocket.

    If req.lat/lng are given, they become the parcel's geofence anchor —
    used by the live two-phone flow, where the rider's real position at
    accept time IS the delivery address (no separate registered address).
    """
    parcel = session.get(Parcel, parcel_id)
    if not parcel:
        raise HTTPException(status_code=404, detail="Parcel not found")

    if req and req.lat is not None and req.lng is not None:
        parcel.lat = req.lat
        parcel.lng = req.lng

    parcel.status = ParcelStatus.OUT_FOR_DELIVERY
    session.add(parcel)
    session.commit()
    session.refresh(parcel)

    # Push to customer channel
    await manager.send_to_channel("customer", "push_out_for_delivery", {
        "parcel_id": parcel.id,
        "tracking_no": parcel.tracking_no,
        "message": "Your parcel is out for delivery! Tap to enable Delivery Protection.",
    })

    # Notify ops
    await manager.send_to_channel("ops", "parcel_dispatched", {
        "parcel_id": parcel.id,
        "tracking_no": parcel.tracking_no,
        "status": parcel.status.value,
    })

    return {"status": "dispatched", "parcel_id": parcel.id, "tracking_no": parcel.tracking_no}
