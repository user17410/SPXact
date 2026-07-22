"""
SQLModel tables — data model from Architecture §4.
"""
import enum
from datetime import datetime
from typing import Optional

from sqlmodel import SQLModel, Field


# --- Enums ---

class ParcelStatus(str, enum.Enum):
    CREATED = "CREATED"
    OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    RESCHEDULED = "RESCHEDULED"


class VerdictState(str, enum.Enum):
    PENDING = "PENDING"
    ATTEMPT_WINDOW_OPEN = "ATTEMPT_WINDOW_OPEN"
    DELIVERED_VERIFIED = "DELIVERED_VERIFIED"
    DELIVERED_UNVERIFIED = "DELIVERED_UNVERIFIED"
    FAILED_VERIFIED = "FAILED_VERIFIED"
    FAILED_UNVERIFIED = "FAILED_UNVERIFIED"
    BLOCKED_CONTRADICTION = "BLOCKED_CONTRADICTION"
    FLAGGED_SUSPICIOUS = "FLAGGED_SUSPICIOUS"


class OutcomeRequested(str, enum.Enum):
    DELIVERED = "DELIVERED"
    NOT_AVAILABLE = "NOT_AVAILABLE"
    ACCESS_BLOCKED = "ACCESS_BLOCKED"


class EntityType(str, enum.Enum):
    RIDER = "RIDER"
    CUSTOMER = "CUSTOMER"


class FraudType(str, enum.Enum):
    BLOCKED_CONTRADICTION = "BLOCKED_CONTRADICTION"
    FLAGGED_SUSPICIOUS = "FLAGGED_SUSPICIOUS"


# --- Tables ---

class Customer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    phone: str = ""
    device_id: str = ""
    protection_opt_in: bool = False


class Rider(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    device_id: str = ""
    trust_score: float = 100.0


class Parcel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    tracking_no: str
    hub_id: str = ""
    address_text: str = ""
    lat: float = 0.0
    lng: float = 0.0
    geofence_m: int = 90
    promised_window: str = ""
    status: ParcelStatus = ParcelStatus.CREATED
    customer_id: Optional[int] = Field(default=None, foreign_key="customer.id")
    rider_id: Optional[int] = Field(default=None, foreign_key="rider.id")


class DeliveryAttempt(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    parcel_id: int = Field(foreign_key="parcel.id")
    rider_id: int = Field(foreign_key="rider.id")
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    dwell_seconds: int = 0
    verdict_state: VerdictState = VerdictState.PENDING
    confidence: int = 0
    signals_json: str = "{}"
    otp: str = ""
    ble_handshake: bool = False
    customer_signal_present: bool = False
    customer_presence_confirmed: bool = False
    mock_location: bool = False
    teleport: bool = False
    photo_url: str = ""
    outcome_requested: Optional[OutcomeRequested] = None
    geofence_entered: bool = False
    accuracy_good: bool = False
    attestation_pass: bool = False
    attestation_fail: bool = False
    otp_verified: bool = False


class LocationPing(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    entity_type: EntityType
    entity_id: int
    lat: float
    lng: float
    accuracy_m: float = 10.0
    is_mock: bool = False
    speed_mps: float = 0.0
    ts: datetime = Field(default_factory=datetime.utcnow)
    attempt_id: Optional[int] = Field(default=None, foreign_key="deliveryattempt.id")


class LedgerEntry(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    attempt_id: int = Field(foreign_key="deliveryattempt.id")
    seq: int = 0
    prev_hash: str = "GENESIS"
    hash: str = ""
    payload_json: str = "{}"
    ts: datetime = Field(default_factory=datetime.utcnow)


class FraudEvent(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    attempt_id: Optional[int] = Field(default=None, foreign_key="deliveryattempt.id")
    lat: float = 0.0
    lng: float = 0.0
    type: FraudType = FraudType.FLAGGED_SUSPICIOUS
    ts: datetime = Field(default_factory=datetime.utcnow)
