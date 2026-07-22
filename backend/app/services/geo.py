"""
Geo service — geofence entry, dwell timer, proximity (hidden from rider).
Uses geopy for Haversine distance (no PostGIS needed for demo).
"""
from geopy.distance import geodesic

from app.config import GEOFENCE_M, PROXIMITY_M


def haversine_distance_m(lat1: float, lng1: float, lat2: float, lng2: float) -> float:
    """Calculate distance in meters between two lat/lng points."""
    return geodesic((lat1, lng1), (lat2, lng2)).meters


def is_within_geofence(rider_lat: float, rider_lng: float,
                       parcel_lat: float, parcel_lng: float,
                       geofence_m: int = GEOFENCE_M) -> bool:
    """Check if rider is within the parcel's geofence radius."""
    distance = haversine_distance_m(rider_lat, rider_lng, parcel_lat, parcel_lng)
    return distance <= geofence_m


def is_customer_co_located(rider_lat: float, rider_lng: float,
                           customer_lat: float, customer_lng: float,
                           proximity_m: int = PROXIMITY_M) -> bool:
    """
    Check if customer and rider are co-located (within proximity threshold).
    This check is done SERVER-SIDE. Customer coords are NEVER sent to rider.
    """
    distance = haversine_distance_m(rider_lat, rider_lng, customer_lat, customer_lng)
    return distance <= proximity_m
