"""
WebSocket Hub — ConnectionManager with rider/customer/ops channels.
Key privacy invariant: messages to rider channel are ALWAYS passed through
rider_safe_payload() to strip customer coordinates.
"""
import json
from typing import Any

from fastapi import WebSocket

from app.schemas import rider_safe_payload


class ConnectionManager:
    """
    Manages WebSocket connections for three channels: rider, customer, ops.
    Enforces privacy: rider never receives customer coordinates.
    """

    def __init__(self):
        # channel -> list of active websocket connections
        self.active_connections: dict[str, list[WebSocket]] = {
            "rider": [],
            "customer": [],
            "ops": [],
        }

    async def connect(self, websocket: WebSocket, channel: str):
        """Accept and register a WebSocket connection to a channel."""
        await websocket.accept()
        if channel not in self.active_connections:
            self.active_connections[channel] = []
        self.active_connections[channel].append(websocket)

    def disconnect(self, websocket: WebSocket, channel: str):
        """Remove a WebSocket connection from a channel."""
        if channel in self.active_connections:
            self.active_connections[channel] = [
                ws for ws in self.active_connections[channel] if ws != websocket
            ]

    async def send_to_channel(self, channel: str, message_type: str, payload: dict):
        """
        Send a message to all connections in a channel.
        PRIVACY: if channel is 'rider', payload is sanitized.
        """
        msg = {"type": message_type, "payload": payload}

        if channel == "rider":
            # ENFORCE PRIVACY: strip customer coords before sending to rider
            msg["payload"] = rider_safe_payload(payload)

        dead_connections = []
        for connection in self.active_connections.get(channel, []):
            try:
                await connection.send_json(msg)
            except Exception:
                dead_connections.append(connection)

        # Clean up dead connections
        for dc in dead_connections:
            self.disconnect(dc, channel)

    async def broadcast(self, message_type: str, payload: dict, exclude_channels: list[str] | None = None):
        """
        Broadcast to all channels (with privacy enforcement on rider channel).
        """
        exclude = exclude_channels or []
        for channel in self.active_connections:
            if channel not in exclude:
                await self.send_to_channel(channel, message_type, payload)

    async def send_personal(self, websocket: WebSocket, message_type: str, payload: dict):
        """Send a message to a specific connection."""
        try:
            await websocket.send_json({"type": message_type, "payload": payload})
        except Exception:
            pass


# Singleton instance
manager = ConnectionManager()
