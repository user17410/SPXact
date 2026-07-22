"""
Fraud router — heatmap events + simulate-week for demo bloom.
GET  /fraud/heatmap
POST /fraud/simulate-week
"""
import random
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlmodel import Session, select

from app.db import get_session
from app.models import FraudEvent, FraudType
from app.schemas import FraudEventResponse
from app.ws_hub import manager

router = APIRouter(prefix="/fraud", tags=["fraud"])


@router.get("/heatmap", response_model=list[FraudEventResponse])
def get_heatmap(session: Session = Depends(get_session)):
    """Get all fraud events for the heatmap display."""
    events = session.exec(
        select(FraudEvent).order_by(FraudEvent.ts.desc())  # type: ignore
    ).all()
    return events


@router.post("/simulate-week")
async def simulate_week(session: Session = Depends(get_session)):
    """
    Demo: replay seeded fraud events over a simulated week.
    Creates ~15 fraud events spread across Metro Manila hubs
    and broadcasts them to ops for the heatmap bloom effect.
    """
    # Metro Manila hub coordinates
    hub_coords = [
        # Las Piñas / Parañaque area
        (14.4506, 120.9833, "HUB_C_SOUTH"),
        (14.4783, 120.9917, "HUB_C_SOUTH"),
        (14.4621, 120.9756, "HUB_C_SOUTH"),
        # Eastern Manila
        (14.5547, 121.0244, "HUB_E_WEST"),
        (14.5633, 121.0356, "HUB_E_WEST"),
        (14.5489, 121.0478, "HUB_E_WEST"),
        (14.5712, 121.0189, "HUB_E_WEST"),
        (14.5601, 121.0567, "HUB_E_WEST"),
        # Northern Manila
        (14.6512, 121.0150, "HUB_N_CENTRAL"),
        (14.6389, 121.0289, "HUB_N_CENTRAL"),
        # Southern Manila
        (14.4100, 120.9500, "HUB_S_COAST"),
        (14.4250, 120.9650, "HUB_S_COAST"),
        # Concentrated fraud cluster (HUB_E_WEST has highest failure rate)
        (14.5550, 121.0300, "HUB_E_WEST"),
        (14.5580, 121.0320, "HUB_E_WEST"),
        (14.5520, 121.0280, "HUB_E_WEST"),
    ]

    created_events = []
    now = datetime.utcnow()

    for i, (lat, lng, hub) in enumerate(hub_coords):
        # Spread events over the simulated week
        event_time = now - timedelta(days=random.randint(0, 6), hours=random.randint(6, 20))
        fraud_type = random.choice([FraudType.BLOCKED_CONTRADICTION, FraudType.FLAGGED_SUSPICIOUS])

        # Add small random jitter to coordinates
        jitter_lat = lat + random.uniform(-0.002, 0.002)
        jitter_lng = lng + random.uniform(-0.002, 0.002)

        event = FraudEvent(
            lat=jitter_lat,
            lng=jitter_lng,
            type=fraud_type,
            ts=event_time,
        )
        session.add(event)
        session.commit()
        session.refresh(event)
        created_events.append(event)

        # Broadcast each event to ops for the bloom animation
        await manager.send_to_channel("ops", "fraud_event", {
            "id": event.id,
            "lat": event.lat,
            "lng": event.lng,
            "type": event.type.value,
            "hub": hub,
            "ts": event.ts.isoformat(),
        })

    return {
        "simulated": True,
        "events_created": len(created_events),
        "message": f"Simulated {len(created_events)} fraud events across Metro Manila hubs.",
    }
