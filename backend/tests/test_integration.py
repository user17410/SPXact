"""
Integration test — verifies the full three-act demo flow end-to-end.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_demo_reset():
    r = client.post("/demo/reset")
    assert r.status_code == 200
    assert r.json()["reset"] is True


def test_parcels_seeded():
    client.post("/demo/reset")
    r = client.get("/parcels")
    assert r.status_code == 200
    assert len(r.json()) >= 3


def test_act1_contradiction_block():
    """Act 1: rider lies 'Not Available' while customer is co-located → BLOCKED."""
    client.post("/demo/reset")

    # Dispatch
    r = client.post("/parcels/1/dispatch")
    assert r.status_code == 200

    # Start attempt
    r = client.post("/attempts/1/start")
    assert r.status_code == 200

    # Rider location ping inside geofence FIRST (so co-location check has a rider ping)
    r = client.post("/location/ping", json={
        "entity_type": "RIDER", "entity_id": 1,
        "lat": 14.4506, "lng": 120.9833, "accuracy": 10, "is_mock": False, "speed": 0
    })
    assert r.status_code == 200

    # Customer shares location (co-located with parcel/rider)
    r = client.post("/customers/1/share-location", json={"lat": 14.4506, "lng": 120.9833, "accuracy": 10})
    assert r.status_code == 200

    # Fast forward dwell
    r = client.post("/attempts/1/fast-forward-dwell")
    assert r.status_code == 200

    # Close attempt: NOT_AVAILABLE → should be BLOCKED_CONTRADICTION
    r = client.post("/attempts/1/close", json={"outcome": "NOT_AVAILABLE"})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "BLOCKED_CONTRADICTION"
    assert data["allowed"] is False


def test_act2_handshake_delivered():
    """Act 2: BLE handshake + OTP → DELIVERED_VERIFIED."""
    client.post("/demo/reset")

    # Dispatch
    r = client.post("/parcels/2/dispatch")
    assert r.status_code == 200

    # Start attempt
    r = client.post("/attempts/2/start")
    assert r.status_code == 200
    otp = r.json()["otp"]

    # Rider enters geofence
    r = client.post("/location/ping", json={
        "entity_type": "RIDER", "entity_id": 1,
        "lat": 14.4783, "lng": 120.9917, "accuracy": 10, "is_mock": False, "speed": 0
    })
    assert r.status_code == 200

    # BLE handshake
    r = client.post("/ble/handshake", json={"parcel_id": 2, "rider_device": "r1", "customer_device": "c2"})
    assert r.status_code == 200
    assert r.json()["handshake"] is True

    # Fast forward dwell
    r = client.post("/attempts/2/fast-forward-dwell")
    assert r.status_code == 200

    # Close: DELIVERED with OTP
    r = client.post("/attempts/2/close", json={"outcome": "DELIVERED", "otp": otp})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "DELIVERED_VERIFIED"
    assert data["allowed"] is True
    assert data["confidence"] >= 70


def test_act3_honest_failure():
    """Act 3: rider dwells, customer absent → FAILED_UNVERIFIED (allowed)."""
    client.post("/demo/reset")

    # Dispatch
    r = client.post("/parcels/3/dispatch")
    assert r.status_code == 200

    # Start attempt
    r = client.post("/attempts/3/start")
    assert r.status_code == 200

    # Rider enters geofence
    r = client.post("/location/ping", json={
        "entity_type": "RIDER", "entity_id": 1,
        "lat": 14.5547, "lng": 121.0244, "accuracy": 10, "is_mock": False, "speed": 0
    })
    assert r.status_code == 200

    # Fast forward dwell (customer never responds)
    r = client.post("/attempts/3/fast-forward-dwell")
    assert r.status_code == 200

    # Close: NOT_AVAILABLE with no customer signal → FAILED_UNVERIFIED
    r = client.post("/attempts/3/close", json={"outcome": "NOT_AVAILABLE"})
    assert r.status_code == 200
    data = r.json()
    assert data["state"] == "FAILED_UNVERIFIED"
    assert data["allowed"] is True


def test_privacy_rider_nearby_no_coords():
    """Verify rider_nearby WS message contains no customer coordinates."""
    # This is tested in test_privacy.py at the unit level.
    # Here we verify the API response from share-location doesn't leak coords.
    client.post("/demo/reset")
    client.post("/parcels/1/dispatch")
    client.post("/attempts/1/start")

    r = client.post("/customers/1/share-location", json={"lat": 14.4506, "lng": 120.9833, "accuracy": 10})
    assert r.status_code == 200
    # Response should not contain customer lat/lng in any rider-facing field
    data = r.json()
    assert "lat" not in data
    assert "lng" not in data


def test_ledger_and_fraud():
    """Verify ledger and fraud endpoints work after a verdict."""
    client.post("/demo/reset")
    client.post("/parcels/1/dispatch")
    client.post("/attempts/1/start")
    client.post("/customers/1/share-location", json={"lat": 14.4506, "lng": 120.9833, "accuracy": 10})
    client.post("/attempts/1/fast-forward-dwell")
    client.post("/location/ping", json={
        "entity_type": "RIDER", "entity_id": 1,
        "lat": 14.4506, "lng": 120.9833, "accuracy": 10, "is_mock": False, "speed": 0
    })
    client.post("/attempts/1/close", json={"outcome": "NOT_AVAILABLE"})

    # Ledger should have entry
    r = client.get("/ledger")
    assert r.status_code == 200
    assert len(r.json()) >= 1

    # Verify chain
    r = client.get("/ledger/verify")
    assert r.status_code == 200
    assert r.json()["valid"] is True

    # Fraud heatmap
    r = client.get("/fraud/heatmap")
    assert r.status_code == 200
    # Should have seeded events + the one from Act 1
    assert len(r.json()) >= 1
