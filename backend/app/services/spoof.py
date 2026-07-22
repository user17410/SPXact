"""
Anti-spoof checks — mock location flag + teleport/impossible speed detection.
Per Architecture §8: feed into confidence score, never binary allow/block alone.
"""
from datetime import datetime
from app.config import TELEPORT_MPS
from app.services.geo import haversine_distance_m


def check_mock_location(is_mock: bool) -> bool:
    """Simple mock location flag check (from device API)."""
    return is_mock


def check_teleport(
    prev_lat: float, prev_lng: float, prev_ts: datetime,
    curr_lat: float, curr_lng: float, curr_ts: datetime,
    max_speed_mps: float = TELEPORT_MPS
) -> bool:
    """
    Detect impossible movement (teleport).
    If distance/time > max_speed (default 55 m/s ≈ 200km/h), flag as teleport.
    """
    dt = (curr_ts - prev_ts).total_seconds()
    if dt <= 0:
        # Same timestamp or backwards — suspicious
        return True
    
    distance = haversine_distance_m(prev_lat, prev_lng, curr_lat, curr_lng)
    speed = distance / dt
    
    return speed > max_speed_mps
