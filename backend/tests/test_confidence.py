"""
Test confidence score computation — additive math, clamping, negative dominance.
Per DoD §1.1: weight math + clamping to [0,100], negatives dominate.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.services.confidence import compute_confidence
from app.config import WEIGHTS


def test_empty_signals_returns_zero():
    """No signals → 0"""
    assert compute_confidence({}) == 0


def test_all_positive_signals():
    """All positive signals → capped at 100"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "ble_handshake": True,
        "customer_presence_confirmed": True,
        "otp_verified": True,
        "attestation_pass": True,
        "accuracy_good": True,
    }
    result = compute_confidence(signals)
    # Sum: 15+20+35+20+25+5+5 = 125 → clamped to 100
    assert result == 100


def test_single_signal_geofence():
    """Geofence only → 15"""
    assert compute_confidence({"geofence_entered": True}) == 15


def test_negative_clamps_to_zero():
    """Negative signals can't go below 0"""
    signals = {
        "mock_location": True,  # -60
        "teleport": True,       # -40
    }
    result = compute_confidence(signals)
    assert result == 0


def test_negative_dominance():
    """Mock location (-60) wipes out most positives"""
    signals = {
        "geofence_entered": True,       # +15
        "dwell_satisfied": True,        # +20
        "mock_location": True,          # -60
    }
    result = compute_confidence(signals)
    # 15 + 20 - 60 = -25 → clamped to 0
    assert result == 0


def test_mixed_signals():
    """Geofence(+15) + dwell(+20) + BLE(+35) + mock(-60) = 10"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "ble_handshake": True,
        "mock_location": True,
    }
    result = compute_confidence(signals)
    # 15 + 20 + 35 - 60 = 10
    assert result == 10


def test_exact_weight_values():
    """Verify exact weight values from PRD §6.1"""
    assert WEIGHTS["geofence_entered"] == 15
    assert WEIGHTS["dwell_satisfied"] == 20
    assert WEIGHTS["ble_handshake"] == 35
    assert WEIGHTS["customer_presence_confirmed"] == 20
    assert WEIGHTS["otp_verified"] == 25
    assert WEIGHTS["attestation_pass"] == 5
    assert WEIGHTS["accuracy_good"] == 5
    assert WEIGHTS["mock_location"] == -60
    assert WEIGHTS["teleport"] == -40
    assert WEIGHTS["no_geofence_entry"] == -30
    assert WEIGHTS["attestation_fail"] == -20


def test_false_signals_ignored():
    """False values in signals dict are not counted"""
    signals = {
        "geofence_entered": True,   # +15
        "ble_handshake": False,     # should NOT add +35
        "mock_location": False,     # should NOT subtract -60
    }
    result = compute_confidence(signals)
    assert result == 15


def test_ble_plus_otp_plus_geofence_plus_dwell():
    """Full handshake scenario: 15+20+35+25 = 95"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "ble_handshake": True,
        "otp_verified": True,
    }
    result = compute_confidence(signals)
    assert result == 95
