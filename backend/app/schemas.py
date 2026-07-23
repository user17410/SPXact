"""
Request/Response DTOs — enforces privacy serializer.
Key invariant: rider-bound payloads NEVER contain customer lat/lng.
"""
from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from app.models import VerdictState, ParcelStatus, OutcomeRequested, FraudType


# --- Request schemas ---

class LocationPingRequest(BaseModel):
    entity_type: str  # "RIDER" or "CUSTOMER"
    entity_id: int
    lat: float
    lng: float
    accuracy: float = 10.0
    is_mock: bool = False
    speed: float = 0.0


class CustomerShareLocationRequest(BaseModel):
    lat: float
    lng: float
    accuracy: float = 10.0


class CloseAttemptRequest(BaseModel):
    outcome: OutcomeRequested
    otp: Optional[str] = None
    photo_url: Optional[str] = None


class HandshakeRequest(BaseModel):
    parcel_id: int
    rider_device: str = ""
    customer_device: str = ""


class OptInRequest(BaseModel):
    opt_in: bool


class DispatchRequest(BaseModel):
    """
    Optional live GPS override — lets the rider's current position become the
    delivery address's geofence anchor. Needed for the two-phone live flow,
    where there's no separately-registered street address: whatever real spot
    the rider is standing at when they accept the booking IS the delivery
    address for geofence purposes.
    """
    lat: Optional[float] = None
    lng: Optional[float] = None


class RescheduleRequest(BaseModel):
    parcel_id: int
    preferred_window: str = ""


# --- Response schemas ---

class VerdictResponse(BaseModel):
    state: VerdictState
    confidence: int
    signals: dict
    allowed: bool
    message: str = ""


class AttemptStatusResponse(BaseModel):
    id: int
    parcel_id: int
    verdict_state: VerdictState
    confidence: int
    dwell_seconds: int
    signals: dict
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None


class LedgerEntryResponse(BaseModel):
    id: int
    attempt_id: int
    seq: int
    prev_hash: str
    hash: str
    payload_json: str
    ts: datetime


class FraudEventResponse(BaseModel):
    id: int
    attempt_id: Optional[int]
    lat: float
    lng: float
    type: FraudType
    ts: datetime


class ParcelResponse(BaseModel):
    id: int
    tracking_no: str
    hub_id: str
    address_text: str
    status: ParcelStatus
    geofence_m: int
    lat: float
    lng: float
    customer_id: Optional[int] = None
    rider_id: Optional[int] = None


# --- WebSocket message schemas ---

class WSMessage(BaseModel):
    """Base WebSocket message."""
    type: str
    payload: dict = {}


# --- Privacy helper ---

def rider_safe_payload(data: dict) -> dict:
    """
    Strip customer coordinates from any payload going to rider.
    This enforces the privacy invariant: rider NEVER receives customer lat/lng.
    """
    stripped = dict(data)
    for key in ("customer_lat", "customer_lng", "customer_location"):
        stripped.pop(key, None)
    # Also strip nested location objects for customer
    if "customer" in stripped and isinstance(stripped["customer"], dict):
        stripped["customer"].pop("lat", None)
        stripped["customer"].pop("lng", None)
    return stripped
