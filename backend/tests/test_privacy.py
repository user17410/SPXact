"""
Test the privacy invariant: rider NEVER receives customer coordinates.
Per DoD §0: proven by test, not just hidden in UI.
Per Architecture §10: unit-tested in test_privacy.py.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.schemas import rider_safe_payload, WSMessage


def test_rider_safe_payload_strips_customer_lat_lng():
    """Direct customer coordinates are stripped."""
    data = {
        "type": "signal_update",
        "customer_lat": 14.45,
        "customer_lng": 120.95,
        "nearby": True,
        "confidence": 35,
    }
    safe = rider_safe_payload(data)
    assert "customer_lat" not in safe
    assert "customer_lng" not in safe
    assert safe["nearby"] is True
    assert safe["confidence"] == 35


def test_rider_safe_payload_strips_nested_customer_location():
    """Nested customer object coords are stripped."""
    data = {
        "type": "rider_nearby",
        "customer": {
            "lat": 14.45,
            "lng": 120.95,
            "name": "Juan",
        },
        "nearby": True,
    }
    safe = rider_safe_payload(data)
    assert "lat" not in safe["customer"]
    assert "lng" not in safe["customer"]
    assert safe["customer"]["name"] == "Juan"
    assert safe["nearby"] is True


def test_rider_safe_payload_strips_customer_location_key():
    """customer_location key is removed entirely."""
    data = {
        "type": "update",
        "customer_location": {"lat": 14.45, "lng": 120.95},
        "rider_location": {"lat": 14.46, "lng": 120.96},
    }
    safe = rider_safe_payload(data)
    assert "customer_location" not in safe
    assert safe["rider_location"] == {"lat": 14.46, "lng": 120.96}


def test_rider_nearby_message_has_no_coordinates():
    """The rider_nearby WS message must only contain {nearby: true}, no coords."""
    msg = WSMessage(type="rider_nearby", payload={"nearby": True})
    assert "lat" not in msg.payload
    assert "lng" not in msg.payload
    assert msg.payload == {"nearby": True}


def test_rider_safe_payload_preserves_non_customer_data():
    """Non-customer data passes through untouched."""
    data = {
        "type": "verdict",
        "state": "DELIVERED_VERIFIED",
        "confidence": 95,
        "rider_lat": 14.46,
        "rider_lng": 120.96,
    }
    safe = rider_safe_payload(data)
    assert safe == data  # nothing stripped


def test_empty_payload_safe():
    """Empty dict doesn't crash."""
    safe = rider_safe_payload({})
    assert safe == {}


def test_multiple_customer_fields_all_stripped():
    """All customer coordinate variants are stripped in one pass."""
    data = {
        "customer_lat": 14.1,
        "customer_lng": 120.1,
        "customer_location": {"lat": 14.2, "lng": 120.2},
        "customer": {"lat": 14.3, "lng": 120.3, "id": 1},
        "signal": "presence",
    }
    safe = rider_safe_payload(data)
    assert "customer_lat" not in safe
    assert "customer_lng" not in safe
    assert "customer_location" not in safe
    assert "lat" not in safe["customer"]
    assert "lng" not in safe["customer"]
    assert safe["customer"]["id"] == 1
    assert safe["signal"] == "presence"
