import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Colors, Typography, LIVE_ORDER } from '../constants';
import { api, ApiError, VerdictResponse, WS_BASE_URL } from '../api';
import DeliveryAcceptPopup from './DeliveryAcceptPopup';
import FraudPreventionScreen from './FraudPreventionScreen';

type Phase = 'booking' | 'live' | 'blocked' | 'done';
type Presence = 'unknown' | 'near' | 'away';

// Mirrors backend/app/config.py DWELL_MIN (180s) — the minimum genuine
// on-site time the Verdict Engine requires before "Mark Unsuccessful" is
// even considered (otherwise it's rejected server-side as FLAGGED_SUSPICIOUS,
// regardless of presence). We read the live dwell_seconds from the backend
// rather than run our own disconnected timer, so this never drifts from
// what the server will actually allow.
const DWELL_MIN_SECONDS = 180;

function showError(e: unknown) {
  const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e);
  Alert.alert('Backend error', message);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function reasonsFromVerdict(v: VerdictResponse | null): string[] {
  if (!v) return [];
  const reasons: string[] = [v.message];
  const s = v.signals as Record<string, boolean>;
  if (s.customer_presence_confirmed) reasons.push('Recipient device confirmed present at the delivery address');
  if (s.geofence_entered) reasons.push('Rider GPS confirms presence within the delivery geofence');
  if (s.dwell_satisfied) reasons.push('Minimum on-site dwell time was satisfied');
  return reasons;
}

export default function RiderLiveScreen() {
  const [phase, setPhase] = useState<Phase>('booking');
  const [busy, setBusy] = useState(false);
  const [locationStatus, setLocationStatus] = useState<'pending' | 'granted' | 'denied'>('pending');
  const [presence, setPresence] = useState<Presence>('unknown');
  const [dwellSeconds, setDwellSeconds] = useState(0);
  const [geofenceEntered, setGeofenceEntered] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);
  const [wsConnected, setWsConnected] = useState(false);
  const [lastFix, setLastFix] = useState<{ lat: number; lng: number; accuracy: number | null; at: number } | null>(null);

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const reconnectAttemptRef = useRef(0);

  // Always-on rider location: request permission and start tracking as soon
  // as this screen mounts (i.e. as soon as the rider is logged in) — same as
  // any normal delivery-rider app, not gated behind accepting a booking.
  useEffect(() => {
    mountedRef.current = true;
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (!mountedRef.current) return;
      if (status !== 'granted') {
        setLocationStatus('denied');
        return;
      }
      setLocationStatus('granted');
      // High/Highest forces a real GPS fix rather than the coarser network/cell
      // triangulation that "Balanced" can silently fall back to indoors — that
      // fallback is the single biggest cause of "close phones don't show near."
      // distanceInterval: 0 (not 1) matters here — with a nonzero distance
      // filter, iOS in particular can simply stop firing updates while the
      // rider's phone itself isn't moving, even though the recipient is
      // actively walking closer, which reads as "never becomes near."
      watchSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 0 },
        (loc) => {
          setLastFix({
            lat: loc.coords.latitude,
            lng: loc.coords.longitude,
            accuracy: loc.coords.accuracy,
            at: Date.now(),
          });
          api
            .locationPing(
              'RIDER', LIVE_ORDER.riderId, loc.coords.latitude, loc.coords.longitude,
              loc.coords.accuracy ?? undefined
            )
            .catch(() => {});
        }
      );
    })();

    connectWS();

    return () => {
      mountedRef.current = false;
      watchSubRef.current?.remove();
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connectWS = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/rider`);
    wsRef.current = ws;
    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      mountedRef.current && setWsConnected(true);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'presence_update') {
          const near = !!msg.payload?.near;
          const responded = !!msg.payload?.responded || near;
          setPresence(near ? 'near' : responded ? 'away' : 'unknown');
        }
      } catch {
        // ignore malformed frames
      }
    };
    ws.onclose = () => {
      if (!mountedRef.current) return;
      setWsConnected(false);
      // Fast retry for a transient blip (300ms, 800ms), then settle at a 2s
      // cap so a genuinely-down backend doesn't get hammered.
      const delay = [300, 800, 2000][Math.min(reconnectAttemptRef.current, 2)];
      reconnectAttemptRef.current += 1;
      setTimeout(() => mountedRef.current && connectWS(), delay);
    };
    ws.onerror = () => ws.close();
  }, []);

  // Poll live attempt status — this is the source of truth for dwell_seconds
  // and geofence_entered (both wall-clock/GPS facts the backend tracks), and
  // a fallback for presence in case a WS frame is missed.
  useEffect(() => {
    if (phase !== 'live') return;
    const poll = async () => {
      try {
        const status = await api.getAttemptStatus(LIVE_ORDER.parcelId);
        const s = status.signals as Record<string, boolean>;
        setDwellSeconds(status.dwell_seconds);
        setGeofenceEntered(!!s.geofence_entered);
        if (s.customer_presence_confirmed) setPresence('near');
        else if (s.customer_signal_present) setPresence('away');
      } catch {
        // ignore transient failures
      }
    };
    poll();
    pollRef.current = setInterval(poll, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [phase]);

  const handleAccept = async () => {
    setBusy(true);
    try {
      // Get a fresh GPS fix right now — this becomes the delivery address's
      // geofence anchor. There's no separately-registered street address in
      // this flow, so "wherever the rider is standing when they accept" IS
      // the delivery address, which is what makes the geofence check work
      // for a real live demo happening anywhere, not just the seeded coords.
      let lat: number | undefined;
      let lng: number | undefined;
      try {
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        lat = loc.coords.latitude;
        lng = loc.coords.longitude;
      } catch {
        // proceed without a GPS override — falls back to the seeded address
      }

      // Reset first so this run starts from a clean attempt — otherwise a
      // leftover attempt/pings from a previous live run on the same parcel
      // would confuse the geofence/teleport/presence checks.
      await api.resetDemo();
      await api.dispatchParcel(LIVE_ORDER.parcelId, lat, lng);
      await api.startAttempt(LIVE_ORDER.parcelId);
      setPresence('unknown');
      setDwellSeconds(0);
      setGeofenceEntered(false);
      setVerdict(null);
      setPhase('live');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleDeclineTap = () => {
    Alert.alert('Only one booking', 'This live run has a single sample order — tap Accept to continue.');
  };

  const closeWith = async (outcome: 'DELIVERED' | 'NOT_AVAILABLE') => {
    setBusy(true);
    try {
      const v = await api.closeAttempt(LIVE_ORDER.parcelId, outcome);
      setVerdict(v);
      setPhase(v.state === 'BLOCKED_CONTRADICTION' ? 'blocked' : 'done');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleNewBooking = () => {
    setVerdict(null);
    setPresence('unknown');
    setPhase('booking');
  };

  const dwellSatisfied = dwellSeconds >= DWELL_MIN_SECONDS;
  const onSiteConfirmed = geofenceEntered && dwellSatisfied;
  const canMarkUnsuccessful = onSiteConfirmed && presence !== 'near';

  if (phase === 'booking') {
    return (
      <View style={styles.container}>
        <View style={styles.behind}>
          <Ionicons name="bicycle" size={64} color="#C8E6C9" />
          <Text style={styles.behindText}>Rider Dashboard</Text>
          <LocationChip status={locationStatus} />
          <GpsDebugLine fix={lastFix} />
        </View>
        <DeliveryAcceptPopup
          visible={true}
          parcelId={LIVE_ORDER.trackingNo}
          pickup="SPX Hub — Sorting Center"
          dropoff={LIVE_ORDER.buyerAddress}
          distance={LIVE_ORDER.distance}
          fee={LIVE_ORDER.fee}
          onAccept={handleAccept}
          onDecline={handleDeclineTap}
        />
        {busy && <BusyOverlay text="Dispatching parcel to backend..." />}
      </View>
    );
  }

  if (phase === 'blocked') {
    return (
      <View style={styles.container}>
        <FraudPreventionScreen secondsAgo={2} reasons={reasonsFromVerdict(verdict)} />
        <View style={styles.resetOverlay}>
          <TouchableOpacity style={styles.resetButton} onPress={handleNewBooking}>
            <Text style={styles.resetText}>New Booking</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (phase === 'done') {
    return (
      <View style={styles.resultContainer}>
        <View style={[styles.resultIconCircle, styles.resultVerified]}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.white} />
        </View>
        <Text style={styles.resultState}>{verdict?.state.replace(/_/g, ' ') ?? 'UNKNOWN'}</Text>
        <Text style={styles.resultConfidence}>{verdict?.confidence ?? 0}% confidence</Text>
        <Text style={styles.resultMessage}>{verdict?.message ?? ''}</Text>
        <TouchableOpacity style={styles.newBookingButton} onPress={handleNewBooking}>
          <Text style={styles.newBookingText}>New Booking</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // phase === 'live'
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.liveContent}>
      <View style={styles.liveHeader}>
        <View>
          <Text style={styles.liveTitle}>{LIVE_ORDER.trackingNo}</Text>
          <Text style={styles.liveSubtitle}>{LIVE_ORDER.buyerAddress}</Text>
        </View>
        <TouchableOpacity style={styles.resetIconButton} onPress={handleNewBooking}>
          <Ionicons name="refresh" size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
      </View>

      <View style={styles.chipRow}>
        <LocationChip status={locationStatus} />
        <View style={[styles.chip, wsConnected ? styles.chipLive : styles.chipOffline]}>
          <View style={[styles.dot, { backgroundColor: wsConnected ? '#2E7D32' : Colors.gray400 }]} />
          <Text style={styles.chipText}>{wsConnected ? 'Live' : 'Reconnecting…'}</Text>
        </View>
      </View>
      <GpsDebugLine fix={lastFix} />

      <PresenceCard presence={presence} />

      {!onSiteConfirmed && (
        <View style={styles.timerCard}>
          <Ionicons name="timer-outline" size={18} color={Colors.textSecondary} />
          <Text style={styles.timerText}>
            {geofenceEntered
              ? `On-site ${formatTime(dwellSeconds)} / ${formatTime(DWELL_MIN_SECONDS)} — "Mark Unsuccessful" unlocks once you've genuinely dwelled here`
              : "Waiting for GPS to confirm you're at the delivery address before unlocking Mark Unsuccessful"}
          </Text>
        </View>
      )}

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.successButton}
          onPress={() => closeWith('DELIVERED')}
          disabled={busy}
        >
          <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
          <Text style={styles.successText}>Mark Successful</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.failButton, !canMarkUnsuccessful && styles.failButtonDisabled]}
          onPress={() => canMarkUnsuccessful && closeWith('NOT_AVAILABLE')}
          disabled={!canMarkUnsuccessful || busy}
        >
          <Ionicons name="close-circle" size={20} color={canMarkUnsuccessful ? Colors.error : Colors.gray400} />
          <Text style={[styles.failText, !canMarkUnsuccessful && styles.failTextDisabled]}>Mark Unsuccessful</Text>
        </TouchableOpacity>
      </View>

      {onSiteConfirmed && presence === 'near' && (
        <Text style={styles.blockHint}>
          Blocked — the recipient is confirmed nearby, so this can't be marked unsuccessful.
        </Text>
      )}

      {busy && <BusyOverlay text="Talking to backend..." />}
    </ScrollView>
  );
}

function LocationChip({ status }: { status: 'pending' | 'granted' | 'denied' }) {
  const label = status === 'granted' ? 'GPS tracking on' : status === 'denied' ? 'Location denied' : 'Requesting GPS…';
  const color = status === 'granted' ? '#2E7D32' : status === 'denied' ? Colors.error : Colors.textSecondary;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Ionicons name="navigate" size={13} color={color} />
      <Text style={[styles.chipText, { color }]}>{label}</Text>
    </View>
  );
}

function GpsDebugLine({ fix }: { fix: { lat: number; lng: number; accuracy: number | null; at: number } | null }) {
  if (!fix) {
    return <Text style={styles.gpsDebugText}>No GPS fix yet — waiting for your phone's location...</Text>;
  }
  const ageSec = Math.round((Date.now() - fix.at) / 1000);
  const accuracyText = fix.accuracy != null ? `±${Math.round(fix.accuracy)}m` : 'accuracy unknown';
  return (
    <Text style={styles.gpsDebugText}>
      GPS: {fix.lat.toFixed(5)}, {fix.lng.toFixed(5)} ({accuracyText}) · {ageSec}s ago
    </Text>
  );
}

function PresenceCard({ presence }: { presence: Presence }) {
  const config = {
    unknown: { icon: 'help-circle-outline' as const, color: Colors.textSecondary, bg: Colors.gray50, label: 'Waiting for recipient to share location' },
    near: { icon: 'checkmark-circle' as const, color: '#2E7D32', bg: '#E8F5E9', label: 'Recipient confirmed nearby' },
    away: { icon: 'alert-circle' as const, color: '#D97706', bg: '#FFF8E1', label: 'Recipient confirmed NOT nearby' },
  }[presence];

  return (
    <View style={[styles.presenceCard, { backgroundColor: config.bg }]}>
      <Ionicons name={config.icon} size={32} color={config.color} />
      <Text style={[styles.presenceLabel, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

function BusyOverlay({ text }: { text: string }) {
  return (
    <View style={styles.busyOverlay}>
      <View style={styles.busyCard}>
        <ActivityIndicator color={Colors.primary} />
        <Text style={styles.busyText}>{text}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  behind: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  behindText: { ...Typography.h3, color: Colors.gray400 },

  liveContent: { padding: 20, paddingTop: 56, paddingBottom: 60 },
  liveHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  liveTitle: { ...Typography.h2, color: Colors.textPrimary },
  liveSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  resetIconButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', elevation: 1 },

  chipRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: Colors.white },
  chipLive: { borderColor: '#C8E6C9' },
  chipOffline: { borderColor: Colors.gray300 },
  chipText: { ...Typography.small, fontWeight: '600', color: Colors.textSecondary },
  gpsDebugText: { ...Typography.small, color: Colors.textLight, marginTop: 6, marginBottom: 4, fontFamily: 'Menlo' },
  dot: { width: 6, height: 6, borderRadius: 3 },

  presenceCard: { alignItems: 'center', gap: 10, borderRadius: 16, paddingVertical: 28, marginBottom: 16 },
  presenceLabel: { ...Typography.bodyBold, textAlign: 'center', paddingHorizontal: 20 },

  timerCard: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 10, padding: 12, marginBottom: 20 },
  timerText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 17 },

  actionsRow: { flexDirection: 'row', gap: 12 },
  successButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#2E7D32', borderRadius: 12, paddingVertical: 16 },
  successText: { ...Typography.bodyBold, color: Colors.white },
  failButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderWidth: 2, borderColor: Colors.error, borderRadius: 12, paddingVertical: 16 },
  failButtonDisabled: { borderColor: Colors.gray300, backgroundColor: Colors.gray50 },
  failText: { ...Typography.bodyBold, color: Colors.error },
  failTextDisabled: { color: Colors.gray400 },
  blockHint: { ...Typography.caption, color: '#2E7D32', textAlign: 'center', marginTop: 12, lineHeight: 17 },

  resetOverlay: { position: 'absolute', bottom: 40, left: 24, right: 24 },
  resetButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resetText: { ...Typography.bodyBold, color: Colors.white },

  resultContainer: { flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', padding: 32 },
  resultIconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resultVerified: { backgroundColor: '#2E7D32' },
  resultState: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
  resultConfidence: { fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  resultMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  newBookingButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12 },
  newBookingText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },

  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  busyCard: { backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', gap: 10 },
  busyText: { ...Typography.body, color: Colors.textPrimary },
});
