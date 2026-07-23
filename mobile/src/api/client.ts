import { API_BASE_URL } from './config';
import type {
  DispatchResponse,
  StartAttemptResponse,
  VerdictResponse,
  HandshakeResponse,
  ShareLocationResponse,
  FastForwardDwellResponse,
  AttemptStatusResponse,
  OutcomeRequested,
} from './types';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, {
      headers: { 'Content-Type': 'application/json' },
      ...options,
    });
  } catch (err) {
    throw new ApiError(
      `Can't reach backend at ${API_BASE_URL}. Is uvicorn running and is your phone on the same Wi-Fi as the LAN_IP in src/api/config.ts? (${(err as Error).message})`
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(`${options.method ?? 'GET'} ${path} failed (${res.status}): ${body}`, res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  dispatchParcel: (parcelId: number, lat?: number, lng?: number) =>
    request<DispatchResponse>(`/parcels/${parcelId}/dispatch`, {
      method: 'POST',
      ...(lat !== undefined && lng !== undefined ? { body: JSON.stringify({ lat, lng }) } : {}),
    }),

  startAttempt: (parcelId: number) =>
    request<StartAttemptResponse>(`/attempts/${parcelId}/start`, { method: 'POST' }),

  closeAttempt: (parcelId: number, outcome: OutcomeRequested, otp?: string) =>
    request<VerdictResponse>(`/attempts/${parcelId}/close`, {
      method: 'POST',
      body: JSON.stringify({ outcome, ...(otp ? { otp } : {}) }),
    }),

  fastForwardDwell: (parcelId: number) =>
    request<FastForwardDwellResponse>(`/attempts/${parcelId}/fast-forward-dwell`, { method: 'POST' }),

  getAttemptStatus: (parcelId: number) =>
    request<AttemptStatusResponse>(`/attempts/${parcelId}`),

  bleHandshake: (parcelId: number, riderDevice = 'rider_device_001', customerDevice = 'customer_device_001') =>
    request<HandshakeResponse>('/ble/handshake', {
      method: 'POST',
      body: JSON.stringify({ parcel_id: parcelId, rider_device: riderDevice, customer_device: customerDevice }),
    }),

  shareLocation: (customerId: number, lat: number, lng: number, accuracy = 10) =>
    request<ShareLocationResponse>(`/customers/${customerId}/share-location`, {
      method: 'POST',
      body: JSON.stringify({ lat, lng, accuracy }),
    }),

  locationPing: (entityType: 'RIDER' | 'CUSTOMER', entityId: number, lat: number, lng: number, accuracy?: number) =>
    request(`/location/ping`, {
      method: 'POST',
      body: JSON.stringify({
        entity_type: entityType, entity_id: entityId, lat, lng,
        ...(accuracy !== undefined ? { accuracy } : {}),
      }),
    }),

  resetDemo: () => request<{ reset: boolean; message: string }>(`/demo/reset`, { method: 'POST' }),

  health: () => request<{ status: string }>(`/health`),
};
