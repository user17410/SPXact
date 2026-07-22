"""
Seed script — loads exact demo parcels for the three acts + historical fraud events.
Per MVP_SPEC §3:
  - 1 "customer present but rider lies" parcel (Act 1)
  - 1 "clean delivery" parcel (Act 2)
  - 1 "customer genuinely absent" parcel (Act 3)
  - ~5 historical "blocked/suspicious" events for the heatmap

Coordinates: synthetic but plausible Metro Manila (Las Piñas / Parañaque area).
Run: python -m app.seed
"""
import sys
import os
from datetime import datetime, timedelta
import random

# Allow running as module from backend/
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlmodel import Session
from app.db import create_db_and_tables, engine
from app.models import (
    Customer, Rider, Parcel, ParcelStatus,
    DeliveryAttempt, VerdictState, FraudEvent, FraudType
)


def seed():
    """Seed the database with demo data."""
    create_db_and_tables()

    with Session(engine) as session:
        # --- Customers ---
        customer_present = Customer(
            id=1,
            name="Maria Santos",
            phone="+639171234567",
            device_id="customer_device_001",
            protection_opt_in=True,
        )
        customer_clean = Customer(
            id=2,
            name="Juan Dela Cruz",
            phone="+639181234567",
            device_id="customer_device_002",
            protection_opt_in=True,
        )
        customer_absent = Customer(
            id=3,
            name="Ana Reyes",
            phone="+639191234567",
            device_id="customer_device_003",
            protection_opt_in=True,
        )

        session.add_all([customer_present, customer_clean, customer_absent])

        # --- Riders ---
        rider = Rider(
            id=1,
            name="Kuya Pedro",
            device_id="rider_device_001",
            trust_score=100.0,
        )
        session.add(rider)

        # --- Parcels (3 demo acts + extras) ---

        # Act 1: Customer present, rider will try to lie "Not Available"
        # Location: Las Piñas (HUB_C_SOUTH)
        parcel_act1 = Parcel(
            id=1,
            tracking_no="SPX-ACT1-CONTRADICTION",
            hub_id="HUB_C_SOUTH",
            address_text="123 Moonwalk St, Las Piñas, Metro Manila",
            lat=14.4506,
            lng=120.9833,
            geofence_m=90,
            promised_window="2024-01-15 09:00-12:00",
            status=ParcelStatus.CREATED,
            customer_id=1,
            rider_id=1,
        )

        # Act 2: Clean delivery — BLE handshake + OTP
        # Location: Parañaque (HUB_C_SOUTH)
        parcel_act2 = Parcel(
            id=2,
            tracking_no="SPX-ACT2-HANDSHAKE",
            hub_id="HUB_C_SOUTH",
            address_text="456 Sucat Rd, Parañaque, Metro Manila",
            lat=14.4783,
            lng=120.9917,
            geofence_m=90,
            promised_window="2024-01-15 09:00-12:00",
            status=ParcelStatus.CREATED,
            customer_id=2,
            rider_id=1,
        )

        # Act 3: Customer genuinely absent — honest failure
        # Location: Eastern Manila (HUB_E_WEST)
        parcel_act3 = Parcel(
            id=3,
            tracking_no="SPX-ACT3-HONEST-FAIL",
            hub_id="HUB_E_WEST",
            address_text="789 Shaw Blvd, Mandaluyong, Metro Manila",
            lat=14.5547,
            lng=121.0244,
            geofence_m=90,
            promised_window="2024-01-15 14:00-17:00",
            status=ParcelStatus.CREATED,
            customer_id=3,
            rider_id=1,
        )

        # Extra parcels for variety
        parcel_extra1 = Parcel(
            id=4,
            tracking_no="SPX-HIST-001",
            hub_id="HUB_E_WEST",
            address_text="101 Ortigas Ave, Pasig, Metro Manila",
            lat=14.5633,
            lng=121.0356,
            geofence_m=90,
            status=ParcelStatus.DELIVERED,
            customer_id=1,
            rider_id=1,
        )
        parcel_extra2 = Parcel(
            id=5,
            tracking_no="SPX-HIST-002",
            hub_id="HUB_N_CENTRAL",
            address_text="202 Quezon Ave, Quezon City, Metro Manila",
            lat=14.6512,
            lng=121.0150,
            geofence_m=90,
            status=ParcelStatus.FAILED,
            customer_id=2,
            rider_id=1,
        )

        session.add_all([parcel_act1, parcel_act2, parcel_act3, parcel_extra1, parcel_extra2])

        # --- Pre-seed DeliveryAttempts for the 3 acts (in PENDING state) ---
        attempt1 = DeliveryAttempt(
            id=1,
            parcel_id=1,
            rider_id=1,
            verdict_state=VerdictState.PENDING,
            otp="1234",
        )
        attempt2 = DeliveryAttempt(
            id=2,
            parcel_id=2,
            rider_id=1,
            verdict_state=VerdictState.PENDING,
            otp="5678",
        )
        attempt3 = DeliveryAttempt(
            id=3,
            parcel_id=3,
            rider_id=1,
            verdict_state=VerdictState.PENDING,
            otp="9012",
        )
        session.add_all([attempt1, attempt2, attempt3])

        # --- Historical fraud events for heatmap (5+ events) ---
        now = datetime.utcnow()
        fraud_events = [
            FraudEvent(
                lat=14.5550 + random.uniform(-0.003, 0.003),
                lng=121.0300 + random.uniform(-0.003, 0.003),
                type=FraudType.BLOCKED_CONTRADICTION,
                ts=now - timedelta(days=2, hours=3),
            ),
            FraudEvent(
                lat=14.5580 + random.uniform(-0.003, 0.003),
                lng=121.0320 + random.uniform(-0.003, 0.003),
                type=FraudType.FLAGGED_SUSPICIOUS,
                ts=now - timedelta(days=1, hours=8),
            ),
            FraudEvent(
                lat=14.4506 + random.uniform(-0.003, 0.003),
                lng=120.9833 + random.uniform(-0.003, 0.003),
                type=FraudType.BLOCKED_CONTRADICTION,
                ts=now - timedelta(days=3, hours=14),
            ),
            FraudEvent(
                lat=14.6389 + random.uniform(-0.003, 0.003),
                lng=121.0289 + random.uniform(-0.003, 0.003),
                type=FraudType.FLAGGED_SUSPICIOUS,
                ts=now - timedelta(days=4, hours=10),
            ),
            FraudEvent(
                lat=14.5520 + random.uniform(-0.003, 0.003),
                lng=121.0280 + random.uniform(-0.003, 0.003),
                type=FraudType.BLOCKED_CONTRADICTION,
                ts=now - timedelta(days=5, hours=16),
            ),
            FraudEvent(
                lat=14.4621 + random.uniform(-0.003, 0.003),
                lng=120.9756 + random.uniform(-0.003, 0.003),
                type=FraudType.FLAGGED_SUSPICIOUS,
                ts=now - timedelta(hours=6),
            ),
        ]
        session.add_all(fraud_events)

        session.commit()
        print("✓ Database seeded successfully!")
        print("  - 3 customers (Maria, Juan, Ana)")
        print("  - 1 rider (Kuya Pedro)")
        print("  - 3 demo parcels (Act 1: contradiction, Act 2: handshake, Act 3: honest fail)")
        print("  - 2 historical parcels")
        print("  - 3 pre-created attempts (PENDING)")
        print(f"  - {len(fraud_events)} historical fraud events for heatmap")


if __name__ == "__main__":
    seed()
