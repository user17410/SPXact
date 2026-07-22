"""
Test the Verdict Engine — all 8 states + 3 edge combos.
Per DoD §1.1: ≥ 1 case per state + spoof+present, silent+dwell, no-dwell.
"""
import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from app.models import VerdictState, OutcomeRequested
from app.services.verdict import decide


# --- One test per state ---

def test_delivered_verified():
    """BLE handshake + OTP + geofence + dwell → DELIVERED_VERIFIED"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "ble_handshake": True,
        "otp_verified": True,
        "customer_presence_confirmed": True,
        "accuracy_good": True,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.DELIVERED, signals)
    assert state == VerdictState.DELIVERED_VERIFIED
    assert conf >= 70
    assert allowed is True


def test_delivered_unverified():
    """Delivered but no BLE/OTP → DELIVERED_UNVERIFIED"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.DELIVERED, signals)
    assert state == VerdictState.DELIVERED_UNVERIFIED
    assert allowed is True


def test_failed_verified_customer_elsewhere():
    """Customer signal present but NOT co-located → FAILED_VERIFIED"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "customer_signal_present": True,
        "customer_presence_confirmed": False,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FAILED_VERIFIED
    assert allowed is True


def test_failed_verified_access_blocked_with_photo():
    """Access blocked with photo evidence → FAILED_VERIFIED"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "photo": True,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.ACCESS_BLOCKED, signals)
    assert state == VerdictState.FAILED_VERIFIED
    assert allowed is True


def test_failed_unverified():
    """Dwell satisfied, no customer signal → FAILED_UNVERIFIED"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "customer_signal_present": False,
        "customer_presence_confirmed": False,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FAILED_UNVERIFIED
    assert allowed is True


def test_blocked_contradiction():
    """Customer co-located but rider says NOT_AVAILABLE → BLOCKED_CONTRADICTION"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "customer_signal_present": True,
        "customer_presence_confirmed": True,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.BLOCKED_CONTRADICTION
    assert allowed is False
    assert "Contradiction" in msg


def test_flagged_suspicious_mock_location():
    """Mock location → FLAGGED_SUSPICIOUS"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "mock_location": True,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FLAGGED_SUSPICIOUS
    assert allowed is False


def test_flagged_suspicious_no_dwell():
    """No dwell (never stayed long enough) → FLAGGED_SUSPICIOUS"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": False,
        "dwell_seconds": 30,  # way under 180s
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FLAGGED_SUSPICIOUS
    assert allowed is False


# --- Edge combos (DoD §1.1) ---

def test_edge_spoof_plus_customer_present():
    """Spoof + customer present: spoof check fires first → FLAGGED_SUSPICIOUS"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "mock_location": True,
        "customer_presence_confirmed": True,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    # Mock location check comes before contradiction check
    assert state == VerdictState.FLAGGED_SUSPICIOUS
    assert allowed is False


def test_edge_silent_customer_with_dwell():
    """Silent customer + good dwell → FAILED_UNVERIFIED (not guilty)"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 300,
        "customer_signal_present": False,
        "customer_presence_confirmed": False,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FAILED_UNVERIFIED
    assert allowed is True


def test_edge_no_geofence_entry():
    """Never entered geofence at all → FLAGGED_SUSPICIOUS"""
    signals = {
        "geofence_entered": False,
        "dwell_satisfied": False,
        "dwell_seconds": 0,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FLAGGED_SUSPICIOUS
    assert allowed is False


def test_teleport_blocks():
    """Teleport detected → FLAGGED_SUSPICIOUS regardless of other signals"""
    signals = {
        "geofence_entered": True,
        "dwell_satisfied": True,
        "dwell_seconds": 200,
        "teleport": True,
        "customer_signal_present": True,
        "customer_presence_confirmed": True,
    }
    state, conf, allowed, msg = decide(OutcomeRequested.NOT_AVAILABLE, signals)
    assert state == VerdictState.FLAGGED_SUSPICIOUS
    assert allowed is False
