# SPXact Backend

**Proves the rider and the customer were in the same place at the same time — and makes lying about a delivery attempt impossible.**

## Quick Start (One Command)

```bash
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python -m app.seed
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Open `http://localhost:8000` for the test panel.

## For Expo Go / React Native

The backend binds to `0.0.0.0:8000` with CORS `allow_origins=["*"]`, so your Expo Go app on the same LAN can connect:

- REST: `http://<your-ip>:8000`
- WebSocket: `ws://<your-ip>:8000/ws/{channel}` (channels: `rider`, `customer`, `ops`)

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/parcels/{id}/dispatch` | Set parcel to OUT_FOR_DELIVERY |
| POST | `/attempts/{parcel_id}/start` | Open attempt window, get OTP |
| POST | `/attempts/{parcel_id}/close` | Run Verdict Engine → get verdict |
| POST | `/attempts/{parcel_id}/fast-forward-dwell` | Demo: skip 3min dwell |
| POST | `/customers/{id}/share-location` | One-shot customer location |
| POST | `/customers/{id}/opt-in` | Record consent |
| POST | `/location/ping` | Ingest rider/customer location |
| POST | `/ble/handshake` | Simulate BLE handshake |
| GET | `/attempts/{parcel_id}` | Current attempt state |
| GET | `/parcels` | List all parcels |
| GET | `/ledger` | Trust Ledger entries |
| GET | `/ledger/verify` | Verify hash chain integrity |
| GET | `/fraud/heatmap` | Fraud events for map |
| POST | `/fraud/simulate-week` | Demo: generate heatmap bloom |
| POST | `/demo/reset` | Reset to clean seeded state |
| GET | `/health` | Health check |

## WebSocket Channels

Connect to `ws://host:8000/ws/{channel}`:

- **rider** — receives: `attempt_window_open`, `verdict`, `handshake_confirmed` (NO customer coords)
- **customer** — receives: `push_out_for_delivery`, `rider_nearby`, `otp_generated`, `verdict`, `handshake_confirmed`
- **ops** — receives: all events + `signal_update`, `ledger_append`, `fraud_event`

## The Three Demo Acts

1. **Act 1 (Contradiction Block)**: Dispatch P1 → rider enters geofence → customer shares location → rider claims "Not Available" → **BLOCKED_CONTRADICTION**
2. **Act 2 (Handshake)**: Dispatch P2 → BLE handshake → rider delivers with OTP → **DELIVERED_VERIFIED** (confidence ~95)
3. **Act 3 (Honest Failure)**: Dispatch P3 → rider dwells 3min → no customer signal → "Not Available" → **FAILED_UNVERIFIED** (allowed, rider protected)

## Running Tests

```bash
python -m pytest tests/ -v
```

## Tech Stack

- FastAPI + SQLModel + SQLite (zero infrastructure)
- Shapely + Geopy (geo math)
- WebSockets (real-time sync)
- All open source, no paid API keys
