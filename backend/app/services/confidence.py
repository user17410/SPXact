"""
Confidence score computation — PRD §6.1 exact.
Additive, clamped to [0, 100]. Negatives dominate.
"""
from app.config import WEIGHTS


def compute_confidence(signals: dict) -> int:
    """
    Compute confidence score from a signals dictionary.
    
    signals keys should be booleans matching WEIGHTS keys:
        geofence_entered, dwell_satisfied, ble_handshake,
        customer_presence_confirmed, otp_verified,
        attestation_pass, accuracy_good,
        mock_location, teleport, no_geofence_entry, attestation_fail
    
    Returns: int clamped to [0, 100]
    """
    score = 0
    for signal_name, weight in WEIGHTS.items():
        if signals.get(signal_name, False):
            score += weight
    # Clamp to [0, 100]
    return max(0, min(100, score))
