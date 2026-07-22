"""
SPXact Backend — FastAPI application.
CORS configured for Expo Go (React Native) + browser access.
One-command run: uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
"""
import json
from contextlib import asynccontextmanager

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from sqlmodel import Session, SQLModel

from app.db import create_db_and_tables, engine
from app.ws_hub import manager
from app.routers import parcels, location, attempts, ble, ledger, fraud


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Create tables on startup."""
    create_db_and_tables()
    yield


app = FastAPI(
    title="SPXact API",
    description="SPX Delivery Verification Backend — proves rider and customer were in the same place at the same time.",
    version="1.0.0",
    lifespan=lifespan,
)

# --- CORS: Allow Expo Go, React Native, browser panels ---
# Wide-open for hackathon demo; lock down in production.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Expo Go uses various origins; allow all for demo
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Mount routers ---
app.include_router(parcels.router)
app.include_router(location.router)
app.include_router(attempts.router)
app.include_router(ble.router)
app.include_router(ledger.router)
app.include_router(fraud.router)


# --- WebSocket endpoint ---
@app.websocket("/ws/{channel}")
async def websocket_endpoint(websocket: WebSocket, channel: str):
    """
    WebSocket connection for real-time sync.
    Channels: rider, customer, ops
    Privacy: rider channel never receives customer coordinates.
    """
    if channel not in ("rider", "customer", "ops"):
        await websocket.close(code=4000, reason="Invalid channel. Use: rider, customer, ops")
        return

    await manager.connect(websocket, channel)
    try:
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                msg_type = msg.get("type", "")
                payload = msg.get("payload", {})

                # Handle client→server messages
                if msg_type == "location_ping":
                    # Forward to location processing (simplified for WS)
                    await manager.send_to_channel("ops", "signal_update", {
                        "signal": "location_ping",
                        "entity": payload.get("entity_type"),
                        "entity_id": payload.get("entity_id"),
                    })

                elif msg_type == "handshake_request":
                    # Will be handled via REST /ble/handshake
                    pass

                elif msg_type == "ping":
                    await manager.send_personal(websocket, "pong", {"ts": payload.get("ts")})

            except json.JSONDecodeError:
                await manager.send_personal(websocket, "error", {"message": "Invalid JSON"})

    except WebSocketDisconnect:
        manager.disconnect(websocket, channel)


# --- Demo reset ---
@app.post("/demo/reset")
async def demo_reset():
    """
    Reset the database to clean seeded state for demo.
    Drops all tables and re-seeds. Takes < 2 seconds.
    """
    import os
    # Drop and recreate
    SQLModel.metadata.drop_all(engine)
    create_db_and_tables()

    # Re-seed
    from app.seed import seed
    seed()

    return {"reset": True, "message": "Demo state restored. Ready for the three acts."}


# --- Health check ---
@app.get("/health")
def health():
    return {"status": "ok", "service": "spxact-backend", "version": "1.0.0"}


# --- Minimal static test panel at "/" ---
@app.get("/", response_class=HTMLResponse)
def test_panel():
    """Minimal HTML test panel so the backend is demoable on its own."""
    return """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SPXact — Backend Test Panel</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #0f172a; color: #e2e8f0; padding: 20px; }
        h1 { color: #38bdf8; margin-bottom: 8px; }
        .subtitle { color: #94a3b8; margin-bottom: 24px; font-size: 14px; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; max-width: 1200px; }
        .card { background: #1e293b; border-radius: 12px; padding: 16px; border: 1px solid #334155; }
        .card h3 { color: #38bdf8; margin-bottom: 12px; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; }
        button { background: #2563eb; color: white; border: none; padding: 8px 16px; border-radius: 6px; cursor: pointer; margin: 4px; font-size: 13px; }
        button:hover { background: #1d4ed8; }
        button.danger { background: #dc2626; }
        button.success { background: #16a34a; }
        button.warning { background: #d97706; }
        #log { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px; margin-top: 16px; max-height: 300px; overflow-y: auto; font-family: monospace; font-size: 12px; white-space: pre-wrap; }
        .log-entry { margin-bottom: 4px; padding: 2px 0; border-bottom: 1px solid #1e293b; }
        .log-entry.verdict { color: #38bdf8; }
        .log-entry.error { color: #f87171; }
        .log-entry.success { color: #4ade80; }
        .ws-status { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 6px; }
        .ws-status.connected { background: #4ade80; }
        .ws-status.disconnected { background: #f87171; }
        .confidence { font-size: 48px; font-weight: bold; text-align: center; margin: 16px 0; }
        .confidence.high { color: #4ade80; }
        .confidence.medium { color: #fbbf24; }
        .confidence.low { color: #f87171; }
    </style>
</head>
<body>
    <h1>SPXact Backend Test Panel</h1>
    <p class="subtitle">Proves the rider and the customer were in the same place at the same time.</p>

    <div class="grid">
        <div class="card">
            <h3>Demo Controls</h3>
            <button class="danger" onclick="resetDemo()">Reset Demo</button>
            <button onclick="dispatch(1)">Dispatch Act 1 (Contradiction)</button>
            <button onclick="dispatch(2)">Dispatch Act 2 (Handshake)</button>
            <button onclick="dispatch(3)">Dispatch Act 3 (Honest Fail)</button>
            <br><br>
            <button onclick="startAttempt(1)">Start Attempt P1</button>
            <button onclick="startAttempt(2)">Start Attempt P2</button>
            <button onclick="startAttempt(3)">Start Attempt P3</button>
            <br><br>
            <button onclick="fastForwardDwell(1)">Fast-Fwd Dwell P1</button>
            <button onclick="fastForwardDwell(2)">Fast-Fwd Dwell P2</button>
            <button onclick="fastForwardDwell(3)">Fast-Fwd Dwell P3</button>
        </div>

        <div class="card">
            <h3>Verdict Actions</h3>
            <button class="danger" onclick="closeAttempt(1, 'NOT_AVAILABLE')">P1: Not Available (→Block)</button>
            <button class="success" onclick="closeAttempt(2, 'DELIVERED', '5678')">P2: Delivered + OTP</button>
            <button class="warning" onclick="closeAttempt(3, 'NOT_AVAILABLE')">P3: Not Available (→Honest)</button>
            <br><br>
            <button onclick="shareLocation(1)">Customer 1 Share Location (co-located)</button>
            <button onclick="doHandshake(2)">BLE Handshake P2</button>
            <button onclick="simulateWeek()">Simulate Fraud Week</button>
            <br><br>
            <button onclick="getLedger()">View Trust Ledger</button>
            <button onclick="verifyLedger()">Verify Ledger Chain</button>
            <button onclick="getHeatmap()">View Heatmap Data</button>
        </div>

        <div class="card" style="grid-column: 1 / -1;">
            <h3><span class="ws-status disconnected" id="ws-indicator"></span>WebSocket + Event Log</h3>
            <button onclick="connectWS('ops')">Connect WS (ops)</button>
            <button onclick="connectWS('rider')">Connect WS (rider)</button>
            <button onclick="connectWS('customer')">Connect WS (customer)</button>
            <div id="log"></div>
        </div>
    </div>

    <script>
        const API = window.location.origin;
        const WS_BASE = API.replace('http', 'ws');
        let ws = null;

        function log(msg, cls = '') {
            const el = document.getElementById('log');
            const entry = document.createElement('div');
            entry.className = 'log-entry ' + cls;
            entry.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
            el.prepend(entry);
        }

        async function api(method, path, body) {
            try {
                const opts = { method, headers: { 'Content-Type': 'application/json' } };
                if (body) opts.body = JSON.stringify(body);
                const res = await fetch(API + path, opts);
                const data = await res.json();
                log(`${method} ${path} → ${JSON.stringify(data).substring(0, 200)}`, res.ok ? 'success' : 'error');
                return data;
            } catch (e) {
                log(`ERROR: ${e.message}`, 'error');
            }
        }

        function connectWS(channel) {
            if (ws) ws.close();
            ws = new WebSocket(`${WS_BASE}/ws/${channel}`);
            ws.onopen = () => {
                document.getElementById('ws-indicator').className = 'ws-status connected';
                log(`WebSocket connected to ${channel}`, 'success');
            };
            ws.onmessage = (e) => {
                const msg = JSON.parse(e.data);
                log(`WS [${msg.type}]: ${JSON.stringify(msg.payload).substring(0, 150)}`, 'verdict');
            };
            ws.onclose = () => {
                document.getElementById('ws-indicator').className = 'ws-status disconnected';
                log('WebSocket disconnected', 'error');
            };
        }

        function resetDemo() { api('POST', '/demo/reset'); }
        function dispatch(id) { api('POST', `/parcels/${id}/dispatch`); }
        function startAttempt(id) { api('POST', `/attempts/${id}/start`); }
        function fastForwardDwell(id) { api('POST', `/attempts/${id}/fast-forward-dwell`); }
        function closeAttempt(id, outcome, otp) {
            const body = { outcome };
            if (otp) body.otp = otp;
            api('POST', `/attempts/${id}/close`, body);
        }
        function shareLocation(custId) {
            // Simulate customer co-located with Act 1 parcel (same coords)
            api('POST', `/customers/${custId}/share-location`, { lat: 14.4506, lng: 120.9833, accuracy: 10 });
        }
        function doHandshake(parcelId) {
            api('POST', '/ble/handshake', { parcel_id: parcelId, rider_device: 'rider_001', customer_device: 'customer_002' });
        }
        function simulateWeek() { api('POST', '/fraud/simulate-week'); }
        function getLedger() { api('GET', '/ledger'); }
        function verifyLedger() { api('GET', '/ledger/verify'); }
        function getHeatmap() { api('GET', '/fraud/heatmap'); }

        // Auto-connect to ops on load
        setTimeout(() => connectWS('ops'), 500);
    </script>
</body>
</html>"""
