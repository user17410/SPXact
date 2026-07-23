export type VerdictState =
  | 'PENDING'
  | 'ATTEMPT_WINDOW_OPEN'
  | 'DELIVERED_VERIFIED'
  | 'FAILED_VERIFIED'
  | 'BLOCKED_CONTRADICTION'
  | 'FLAGGED_SUSPICIOUS';

export type OutcomeRequested = 'DELIVERED' | 'NOT_AVAILABLE' | 'ACCESS_BLOCKED';

export interface DispatchResponse {
  status: string;
  parcel_id: number;
  tracking_no: string;
}

export interface StartAttemptResponse {
  attempt_id: number;
  parcel_id: number;
  state: VerdictState;
  otp: string;
  started_at: string | null;
}

export interface VerdictResponse {
  state: VerdictState;
  confidence: number;
  signals: Record<string, unknown>;
  allowed: boolean;
  message: string;
}

export interface HandshakeResponse {
  handshake: boolean;
  parcel_id: number;
  attempt_id: number;
  message: string;
}

export interface ShareLocationResponse {
  shared: boolean;
  customer_id: number;
}

export interface FastForwardDwellResponse {
  parcel_id: number;
  dwell_seconds: number;
  dwell_satisfied: boolean;
}

export interface AttemptStatusResponse {
  id: number;
  parcel_id: number;
  verdict_state: VerdictState;
  confidence: number;
  dwell_seconds: number;
  signals: Record<string, unknown>;
  started_at: string | null;
  ended_at: string | null;
}
