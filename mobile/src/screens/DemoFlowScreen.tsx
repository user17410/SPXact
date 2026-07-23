import React, { useRef, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography, DEMO_ACTS, DemoAct } from '../constants';
import { useRole } from '../context';
import { api, ApiError, VerdictResponse, API_BASE_URL } from '../api';
import DeliveryAcceptPopup from './DeliveryAcceptPopup';
import DeliveryMapScreen from './DeliveryMapScreen';
import RiderOnWayScreen from './RiderOnWayScreen';
import BLEHandshakeScreen from './BLEHandshakeScreen';
import FraudPreventionScreen from './FraudPreventionScreen';

type DemoPhase = 'idle' | 'popup' | 'rider-started' | 'map' | 'buyer-notif' | 'handshake' | 'result' | 'fraud';

const BLOCKED_STATES = new Set(['BLOCKED_CONTRADICTION', 'FLAGGED_SUSPICIOUS']);

function showError(e: unknown) {
  const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e);
  Alert.alert('Backend error', message);
}

function reasonsFromVerdict(v: VerdictResponse | null): string[] {
  if (!v) return [];
  const reasons: string[] = [v.message];
  const s = v.signals as Record<string, boolean>;
  if (s.customer_presence_confirmed) reasons.push('Customer device confirmed present at the delivery address');
  if (s.ble_handshake) reasons.push('WiFi handshake was completed earlier in this attempt');
  if (s.geofence_entered) reasons.push('Rider GPS confirms presence within the delivery geofence');
  if (s.dwell_satisfied) reasons.push('Minimum on-site dwell time was satisfied');
  return reasons;
}

export default function DemoFlowScreen() {
  const { role } = useRole();
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [act, setAct] = useState<DemoAct | null>(null);
  const [otp, setOtp] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [verdict, setVerdict] = useState<VerdictResponse | null>(null);
  const verdictRef = useRef<VerdictResponse | null>(null);

  const resetToIdle = () => {
    setAct(null);
    setOtp('');
    setVerdict(null);
    verdictRef.current = null;
    setPhase('idle');
  };

  const handleSelectAct = async (selected: DemoAct) => {
    setBusy(true);
    try {
      // Reset first: the backend's teleport check compares each rider ping against
      // the rider's previous ping *across all parcels*, so leftover pings from a
      // different act (at a different address) would falsely flag "teleport" here.
      await api.resetDemo();
      setAct(selected);
      setVerdict(null);
      verdictRef.current = null;
      setPhase('popup');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleResetBackend = () => {
    Alert.alert('Reset demo data?', 'This wipes the backend database and re-seeds the three demo acts.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Reset',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.resetDemo();
          } catch (e) {
            showError(e);
          } finally {
            setBusy(false);
          }
        },
      },
    ]);
  };

  const handleAccept = async () => {
    if (!act) return;
    setBusy(true);
    try {
      await api.dispatchParcel(act.parcelId);
      const started = await api.startAttempt(act.parcelId);
      setOtp(started.otp);
      setPhase('rider-started');
    } catch (e) {
      showError(e);
      setPhase('idle');
    } finally {
      setBusy(false);
    }
  };

  const handleArrive = async () => {
    if (!act) return;
    setBusy(true);
    try {
      // The rider ping is what the customer's share-location proximity check compares
      // against, so it's needed for Act 1's contradiction check. fast-forward-dwell
      // additionally force-sets geofence_entered/dwell so we don't have to wait 3 minutes.
      await api.locationPing('RIDER', act.riderId, act.lat, act.lng);
      await api.fastForwardDwell(act.parcelId);
      setPhase('buyer-notif');
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
    }
  };

  const handleAllowShare = async () => {
    if (!act) return;
    setBusy(true);
    try {
      await api.shareLocation(act.customerId, act.lat, act.lng);
    } catch (e) {
      showError(e);
    } finally {
      setBusy(false);
      setPhase('handshake');
    }
  };

  const handleSkipShare = () => {
    // Customer rejected or the request timed out — no presence signal sent.
    setPhase('handshake');
  };

  const handleDeliveredPressed = () => {
    if (!act) return;
    api
      .bleHandshake(act.parcelId)
      .then(() => api.closeAttempt(act.parcelId, 'DELIVERED', otp))
      .then((v) => {
        verdictRef.current = v;
        setVerdict(v);
      })
      .catch((e) => showError(e));
  };

  const handleFailedPressed = () => {
    if (!act) return;
    api
      .closeAttempt(act.parcelId, 'NOT_AVAILABLE')
      .then((v) => {
        verdictRef.current = v;
        setVerdict(v);
        setPhase(BLOCKED_STATES.has(v.state) ? 'fraud' : 'result');
      })
      .catch((e) => {
        showError(e);
        setPhase('idle');
      });
  };

  const handleHandshakeComplete = () => {
    // Fires ~4s after "Package Delivered" was pressed — the closeAttempt call
    // (fired in handleDeliveredPressed) has had time to resolve into verdictRef.
    setPhase(verdictRef.current && BLOCKED_STATES.has(verdictRef.current.state) ? 'fraud' : 'result');
  };

  if (phase === 'popup' && act) {
    return (
      <View style={styles.container}>
        <View style={styles.behindPopup}>
          <Text style={styles.behindText}>Rider Dashboard</Text>
        </View>
        <DeliveryAcceptPopup
          visible={true}
          parcelId={act.trackingNo}
          pickup="SPX Hub — Sorting Center"
          dropoff={act.buyerAddress}
          distance={act.distance}
          fee={act.fee}
          onAccept={handleAccept}
          onDecline={resetToIdle}
        />
        {busy && <BusyOverlay text="Dispatching parcel..." />}
      </View>
    );
  }

  if (phase === 'rider-started' && act) {
    return (
      <View style={styles.container}>
        <View style={styles.riderStartedContainer}>
          <View style={styles.notifCard}>
            <View style={styles.notifIconCircle}>
              <Ionicons name="navigate" size={32} color={Colors.white} />
            </View>
            <Text style={styles.riderStartedTitle}>Rider is on the way!</Text>
            <Text style={styles.riderStartedSubtitle}>
              Kuya Pedro has started heading to your destination.{'\n'}Please be ready to receive your package.
            </Text>
            <View style={styles.riderStartedInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>ETA: ~8 minutes</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="cube" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>Parcel: {act.trackingNo}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>{act.buyerAddress}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="key" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>OTP (customer-side): {otp}</Text>
              </View>
            </View>
          </View>

          <View style={styles.nextOverlay}>
            <TouchableOpacity style={styles.nextButton} onPress={() => setPhase('map')}>
              <Text style={styles.nextText}>Continue to Map →</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }

  if (phase === 'map' && act) {
    return (
      <View style={styles.container}>
        <DeliveryMapScreen
          buyerName={act.buyerName}
          buyerAddress={act.buyerAddress}
          distance={act.distance}
          eta="8 min"
          onArrive={handleArrive}
        />
        {busy && <BusyOverlay text="Pinging rider location + fast-forwarding dwell..." />}
      </View>
    );
  }

  if (phase === 'buyer-notif' && act) {
    return (
      <View style={styles.container}>
        <RiderOnWayScreen
          riderName="Kuya Pedro"
          eta="2 minutes"
          parcelId={act.trackingNo}
          onAllow={handleAllowShare}
          onReject={handleSkipShare}
          onTimeout={handleSkipShare}
        />
        {busy && <BusyOverlay text="Sharing location with backend..." />}
      </View>
    );
  }

  if (phase === 'handshake' && act) {
    return (
      <BLEHandshakeScreen
        mode={role === 'rider' ? 'rider' : 'buyer'}
        onComplete={handleHandshakeComplete}
        onDeliveredPressed={handleDeliveredPressed}
        onFailedPressed={handleFailedPressed}
      />
    );
  }

  if (phase === 'result' && act) {
    const v = verdict;
    return (
      <View style={styles.resultContainer}>
        <View style={[styles.resultIconCircle, styles.resultIconVerified]}>
          <Ionicons name="shield-checkmark" size={48} color={Colors.white} />
        </View>
        <Text style={styles.resultState}>{v?.state.replace(/_/g, ' ') ?? 'UNKNOWN'}</Text>
        <Text style={styles.resultConfidence}>{v?.confidence ?? 0}% confidence</Text>
        <Text style={styles.resultMessage}>{v?.message ?? ''}</Text>
        <TouchableOpacity style={styles.startButton} onPress={resetToIdle}>
          <Text style={styles.startText}>Done</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (phase === 'fraud' && act) {
    return (
      <View style={styles.container}>
        <FraudPreventionScreen secondsAgo={4} reasons={reasonsFromVerdict(verdict)} />
        <View style={styles.resetOverlay}>
          <TouchableOpacity style={styles.resetButton} onPress={resetToIdle}>
            <Text style={styles.resetText}>Reset Demo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Idle state — pick a scenario
  return (
    <View style={styles.idleContainer}>
      <View style={styles.idleContent}>
        <View style={styles.demoIcon}>
          <Ionicons name="play-circle" size={56} color={Colors.primary} />
        </View>
        <Text style={styles.idleTitle}>Live Demo</Text>
        <Text style={styles.idleSubtitle}>
          Every tap below hits the real backend at {API_BASE_URL}.{'\n'}Pick a scenario to start.
        </Text>

        <View style={styles.actList}>
          {DEMO_ACTS.map((a) => (
            <TouchableOpacity key={a.id} style={styles.actCard} onPress={() => handleSelectAct(a)}>
              <View style={styles.actCardIcon}>
                <Ionicons name="cube" size={20} color={Colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actCardLabel}>{a.label}</Text>
                <Text style={styles.actCardHint}>{a.hint}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={Colors.textLight} />
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.resetDataButton} onPress={handleResetBackend}>
          <Ionicons name="refresh" size={16} color={Colors.textSecondary} />
          <Text style={styles.resetDataText}>Reset Backend Data</Text>
        </TouchableOpacity>
      </View>
      {busy && <BusyOverlay text="Talking to backend..." />}
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
  container: { flex: 1 },
  behindPopup: { flex: 1, backgroundColor: Colors.background, justifyContent: 'center', alignItems: 'center' },
  behindText: { ...Typography.h2, color: Colors.gray400 },
  nextOverlay: { position: 'absolute', bottom: 40, left: 24, right: 24 },
  nextButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  nextText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
  resetOverlay: { position: 'absolute', bottom: 40, left: 24, right: 24 },
  resetButton: { backgroundColor: 'rgba(255,255,255,0.15)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  resetText: { ...Typography.bodyBold, color: Colors.white },
  idleContainer: { flex: 1, backgroundColor: Colors.white },
  idleContent: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, paddingTop: 60 },
  demoIcon: { marginBottom: 16 },
  idleTitle: { ...Typography.h1, color: Colors.textPrimary, marginBottom: 8 },
  idleSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },
  startButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginTop: 8 },
  startText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },

  actList: { width: '100%', gap: 12 },
  actCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  actCardIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center' },
  actCardLabel: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 2 },
  actCardHint: { ...Typography.small, color: Colors.textSecondary },

  resetDataButton: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 24, padding: 8 },
  resetDataText: { ...Typography.caption, color: Colors.textSecondary },

  // Rider started notification styles
  riderStartedContainer: { flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', padding: 24 },
  notifCard: {
    width: '100%',
    backgroundColor: Colors.white,
    borderRadius: 20,
    padding: 28,
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  notifIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  riderStartedTitle: {
    ...Typography.h2,
    color: Colors.textPrimary,
    marginBottom: 10,
    textAlign: 'center',
  },
  riderStartedSubtitle: {
    ...Typography.body,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 20,
  },
  riderStartedInfo: {
    width: '100%',
    backgroundColor: Colors.gray50,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  infoText: {
    ...Typography.body,
    color: Colors.textPrimary,
  },

  // Result screen
  resultContainer: { flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', padding: 32 },
  resultIconCircle: { width: 96, height: 96, borderRadius: 48, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  resultIconVerified: { backgroundColor: '#2E7D32' },
  resultState: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8, letterSpacing: 0.5 },
  resultConfidence: { fontSize: 20, fontWeight: '700', color: Colors.primary, marginBottom: 16 },
  resultMessage: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 28 },

  // Busy overlay
  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  busyCard: { backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', gap: 10 },
  busyText: { ...Typography.body, color: Colors.textPrimary },
});
