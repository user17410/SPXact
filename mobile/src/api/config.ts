/**
 * Backend connection settings.
 *
 * LAN_IP must be the IP address of the laptop running `uvicorn app.main:app --host 0.0.0.0 --port 8000`.
 * Your phone (Expo Go) and that laptop must be on the same Wi-Fi network.
 *
 * Find your laptop's LAN IP:
 *   macOS:   ipconfig getifaddr en0
 *   Windows: ipconfig   (look for "IPv4 Address" under your Wi-Fi adapter)
 *
 * Update this value if it changes (e.g. you switch networks).
 */
const LAN_IP = '192.168.227.172';
const BACKEND_PORT = 8000;

export const API_BASE_URL = `http://${LAN_IP}:${BACKEND_PORT}`;
export const WS_BASE_URL = API_BASE_URL.replace('http', 'ws');
