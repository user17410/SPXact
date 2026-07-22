"""
SPXact Configuration — tunables and Verdict Engine weights.
All values from PRD §6.1 and Architecture §6.
"""
import os

# --- Geofence & Dwell ---
DWELL_MIN: int = int(os.getenv("DWELL_MIN", "180"))  # seconds
GEOFENCE_M: int = int(os.getenv("GEOFENCE_M", "90"))  # meters
PROXIMITY_M: int = int(os.getenv("PROXIMITY_M", "50"))  # customer<->rider "co-located" threshold

# --- Verdict thresholds ---
CONF_DELIVERED_MIN: int = 70  # minimum confidence for DELIVERED_VERIFIED

# --- Anti-spoof ---
TELEPORT_MPS: float = float(os.getenv("TELEPORT_MPS", "55"))  # m/s (~200km/h)

# --- Confidence weights (PRD §6.1 exact) ---
WEIGHTS: dict[str, int] = {
    # Positive signals
    "geofence_entered": +15,
    "dwell_satisfied": +20,
    "ble_handshake": +35,
    "customer_presence_confirmed": +20,
    "otp_verified": +25,
    "attestation_pass": +5,
    "accuracy_good": +5,
    # Negative signals
    "mock_location": -60,
    "teleport": -40,
    "no_geofence_entry": -30,
    "attestation_fail": -20,
}

# --- Server ---
CORS_ORIGINS: list[str] = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://localhost:8081,http://localhost:19006,exp://192.168.*"
).split(",")

DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./spxact.db")
