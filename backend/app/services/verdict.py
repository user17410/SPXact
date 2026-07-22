"""
Verdict Engine — PRD §6.3 decision tree, EXACT implementation.
Deterministic, auditable rules. No AI. No black box.

8 states:
    PENDING, ATTEMPT_WINDOW_OPEN, DELIVERED_VERIFIED, DELIVERED_UNVERIFIED,
    FAILED_VERIFIED, FAILED_UNVERIFIED, BLOCKED_CONTRADICTION, FLAGGED_SUSPICIOUS
"""
from app.config import DWELL_MIN, CONF_DELIVERED_MIN
from app.models import VerdictState, OutcomeRequested
from app.services.confidence import compute_confidence


def decide(outcome: OutcomeRequested, signals: dict) -> tuple[VerdictState, int, bool, str]:
    """
    Run the Verdict Engine decision tree.
    
    Args:
        outcome: What the rider requested (DELIVERED, NOT_AVAILABLE, ACCESS_BLOCKED)
        signals: Dict of boolean signal flags
        
    Returns:
        (verdict_state, confidence_score, allowed, message)
    """
    confidence = compute_confidence(signals)

    if outcome == OutcomeRequested.DELIVERED:
        has_strong_proof = signals.get("ble_handshake", False) or signals.get("otp_verified", False)
        if has_strong_proof and confidence >= CONF_DELIVERED_MIN:
            return (
                VerdictState.DELIVERED_VERIFIED,
                confidence,
                True,
                "Delivery verified with strong proof."
            )
        else:
            return (
                VerdictState.DELIVERED_UNVERIFIED,
                confidence,
                True,  # allowed but flagged
                "Delivery recorded but proof is weak. Consider OTP or BLE handshake."
            )

    # outcome is NOT_AVAILABLE or ACCESS_BLOCKED
    if signals.get("mock_location", False) or signals.get("teleport", False):
        return (
            VerdictState.FLAGGED_SUSPICIOUS,
            confidence,
            False,
            "Suspicious activity detected — mock location or impossible movement."
        )

    geofence_entered = signals.get("geofence_entered", False)
    dwell_seconds = signals.get("dwell_seconds", 0)
    dwell_satisfied = dwell_seconds >= DWELL_MIN if isinstance(dwell_seconds, (int, float)) else signals.get("dwell_satisfied", False)

    if not geofence_entered or not dwell_satisfied:
        return (
            VerdictState.FLAGGED_SUSPICIOUS,
            confidence,
            False,
            "No genuine attempt detected — insufficient geofence presence or dwell time."
        )

    if outcome == OutcomeRequested.ACCESS_BLOCKED:
        if signals.get("photo", False):
            return (
                VerdictState.FAILED_VERIFIED,
                confidence,
                True,
                "Access blocked verified with photo evidence."
            )
        else:
            return (
                VerdictState.DELIVERED_UNVERIFIED,
                confidence,
                True,
                "Access blocked claimed but no photo — please provide photo evidence."
            )

    # outcome == NOT_AVAILABLE, genuine attempt confirmed (geofence + dwell)
    if signals.get("customer_presence_confirmed", False):
        return (
            VerdictState.BLOCKED_CONTRADICTION,
            confidence,
            False,
            "Contradiction — customer device detected nearby. Attempt rejected."
        )

    if signals.get("customer_signal_present", False) and not signals.get("customer_presence_confirmed", False):
        # Customer responded but is confirmed NOT co-located → genuine failure
        return (
            VerdictState.FAILED_VERIFIED,
            confidence,
            True,
            "Verified attempt — customer confirmed elsewhere."
        )

    # Customer silent — no signal at all
    return (
        VerdictState.FAILED_UNVERIFIED,
        confidence,
        True,
        "Attempt recorded — customer unreachable. Labeled unverified."
    )
