import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import * as Notifications from 'expo-notifications';
import { Colors, Typography, LIVE_ORDER } from '../constants';
import { api, ApiError, WS_BASE_URL } from '../api';
import RiderOnWayScreen from './RiderOnWayScreen';

type Phase = 'idle' | 'notified' | 'sharing-prompt' | 'sharing' | 'shared' | 'declined' | 'result';

function showError(e: unknown) {
  const message = e instanceof ApiError ? e.message : e instanceof Error ? e.message : String(e);
  Alert.alert('Backend error', message);
}

const VERDICT_COPY: Record<string, { title: string; tone: 'good' | 'bad' | 'warn' }> = {
  DELIVERED_VERIFIED: { title: 'Delivery confirmed', tone: 'good' },
  FAILED_VERIFIED: { title: 'Delivery marked unsuccessful', tone: 'warn' },
  BLOCKED_CONTRADICTION: { title: 'Rider was blocked from marking this unsuccessful', tone: 'good' },
  FLAGGED_SUSPICIOUS: { title: 'Attempt flagged for review', tone: 'warn' },
};

export default function RecipientLiveScreen() {
  const [phase, setPhase] = useState<Phase>('idle');
  const [trackingNo, setTrackingNo] = useState<string | null>(null);
  const [verdictState, setVerdictState] = useState<string | null>(null);
  const [wsConnected, setWsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const watchSubRef = useRef<Location.LocationSubscription | null>(null);
  const reconnectAttemptRef = useRef(0);

  const connectWS = useCallback(() => {
    const ws = new WebSocket(`${WS_BASE_URL}/ws/customer`);
    wsRef.current = ws;
    ws.onopen = () => {
      reconnectAttemptRef.current = 0;
      mountedRef.current && setWsConnected(true);
    };
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === 'push_out_for_delivery') {
          setTrackingNo(msg.payload?.tracking_no ?? LIVE_ORDER.trackingNo);
          setPhase((p) => (p === 'idle' ? 'notified' : p));
          // Trigger local push notification with sound
          (async () => {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: '📦 Parcel Out for Delivery!',
                body: `Your parcel ${msg.payload?.tracking_no ?? LIVE_ORDER.trackingNo} is on its way!`,
                sound: true,
              },
              trigger: null, // immediate
            });
          })();
        } else if (msg.type === 'rider_nearby') {
          setPhase('sharing-prompt');
        } else if (msg.type === 'verdict') {
          setVerdictState(msg.payload?.state ?? null);
          setPhase('result');
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

  useEffect(() => {
    mountedRef.current = true;

    // Configure notifications to show even when app is in foreground
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });

    // Request notification permissions
    (async () => {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        console.warn('Notification permissions not granted');
      }
    })();

    connectWS();
    return () => {
      mountedRef.current = false;
      wsRef.current?.close();
      watchSubRef.current?.remove();
    };
  }, [connectWS]);

  const handleAllowShare = async () => {
    setPhase('sharing');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location permission denied', "We couldn't share your location with the rider.");
        setPhase('declined');
        return;
      }

      // Initial one-shot share so backend marks customer_signal_present immediately
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Highest });
      await api.shareLocation(
        LIVE_ORDER.customerId, loc.coords.latitude, loc.coords.longitude,
        loc.coords.accuracy ?? undefined
      );

      // Start continuous location tracking — keeps sending pings every 2s so
      // the backend can recompute proximity in real-time as phones move.
      watchSubRef.current = await Location.watchPositionAsync(
        { accuracy: Location.Accuracy.Highest, timeInterval: 2000, distanceInterval: 0 },
        (position) => {
          api.locationPing(
            'CUSTOMER', LIVE_ORDER.customerId,
            position.coords.latitude, position.coords.longitude,
            position.coords.accuracy ?? undefined
          ).catch(() => {});
        }
      );

      setPhase('shared');
    } catch (e) {
      showError(e);
      setPhase('declined');
    }
  };

  const handleDeclineShare = () => setPhase('declined');

  const handleDismissResult = () => {
    setVerdictState(null);
    setTrackingNo(null);
    setPhase('idle');
  };

  if (phase === 'sharing-prompt' || phase === 'sharing') {
    return (
      <View style={{ flex: 1 }}>
        <RiderOnWayScreen
          riderName="Your rider"
          eta="Arriving now"
          parcelId={trackingNo ?? LIVE_ORDER.trackingNo}
          onAllow={handleAllowShare}
          onReject={handleDeclineShare}
          onTimeout={handleDeclineShare}
        />
        {phase === 'sharing' && (
          <View style={styles.busyOverlay}>
            <View style={styles.busyCard}>
              <ActivityIndicator color={Colors.primary} />
              <Text style={styles.busyText}>Sharing your location...</Text>
            </View>
          </View>
        )}
      </View>
    );
  }

  if (phase === 'result') {
    const copy = (verdictState && VERDICT_COPY[verdictState]) || { title: 'Delivery updated', tone: 'warn' as const };
    const iconName = copy.tone === 'good' ? 'shield-checkmark' : copy.tone === 'bad' ? 'close-circle' : 'information-circle';
    const iconColor = copy.tone === 'good' ? '#2E7D32' : copy.tone === 'bad' ? Colors.error : '#D97706';
    return (
      <View style={styles.centerContainer}>
        <Ionicons name={iconName} size={64} color={iconColor} />
        <Text style={styles.resultTitle}>{copy.title}</Text>
        <TouchableOpacity style={styles.dismissButton} onPress={handleDismissResult}>
          <Text style={styles.dismissText}>OK</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // idle / notified / shared / declined — all share the same shell
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Delivery</Text>
        <View style={[styles.liveChip, wsConnected ? styles.liveChipOn : styles.liveChipOff]}>
          <View style={[styles.dot, { backgroundColor: wsConnected ? '#2E7D32' : Colors.gray400 }]} />
          <Text style={styles.liveChipText}>{wsConnected ? 'Live' : 'Reconnecting…'}</Text>
        </View>
      </View>

      <View style={styles.content}>
        {phase === 'idle' && (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={56} color={Colors.gray300} />
            <Text style={styles.emptyTitle}>No active delivery</Text>
            <Text style={styles.emptySubtitle}>You'll be notified here the moment a rider accepts your booking.</Text>
          </View>
        )}

        {phase === 'notified' && (
          <View style={styles.statusCard}>
            <Ionicons name="cube" size={32} color={Colors.primary} />
            <Text style={styles.statusTitle}>Your parcel is out for delivery</Text>
            <Text style={styles.statusSubtitle}>{trackingNo}</Text>
            <Text style={styles.statusHint}>Waiting for your rider to arrive...</Text>
          </View>
        )}

        {phase === 'shared' && (
          <View style={styles.statusCard}>
            <Ionicons name="checkmark-circle" size={32} color="#2E7D32" />
            <Text style={styles.statusTitle}>Location shared</Text>
            <Text style={styles.statusHint}>
              Your rider will be told only whether you're nearby — never your exact location.
            </Text>
          </View>
        )}

        {phase === 'declined' && (
          <View style={styles.statusCard}>
            <Ionicons name="information-circle" size={32} color={Colors.textSecondary} />
            <Text style={styles.statusTitle}>Location not shared</Text>
            <Text style={styles.statusHint}>Your rider can still complete the delivery.</Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.white, borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  liveChip: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
  liveChipOn: { borderColor: '#C8E6C9' },
  liveChipOff: { borderColor: Colors.gray300 },
  liveChipText: { ...Typography.small, fontWeight: '600', color: Colors.textSecondary },
  dot: { width: 6, height: 6, borderRadius: 3 },

  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyState: { alignItems: 'center', gap: 8 },
  emptyTitle: { ...Typography.h3, color: Colors.textPrimary, marginTop: 8 },
  emptySubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },

  statusCard: { alignItems: 'center', gap: 8, backgroundColor: Colors.white, borderRadius: 16, padding: 28, width: '100%' },
  statusTitle: { ...Typography.h3, color: Colors.textPrimary, textAlign: 'center', marginTop: 4 },
  statusSubtitle: { ...Typography.caption, color: Colors.textSecondary },
  statusHint: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center', lineHeight: 18, marginTop: 4 },

  centerContainer: { flex: 1, backgroundColor: Colors.white, justifyContent: 'center', alignItems: 'center', padding: 32 },
  resultTitle: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginTop: 20, marginBottom: 28 },
  dismissButton: { backgroundColor: Colors.primary, paddingHorizontal: 40, paddingVertical: 14, borderRadius: 12 },
  dismissText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },

  busyOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.25)', justifyContent: 'center', alignItems: 'center' },
  busyCard: { backgroundColor: Colors.white, borderRadius: 14, paddingHorizontal: 24, paddingVertical: 20, alignItems: 'center', gap: 10 },
  busyText: { ...Typography.body, color: Colors.textPrimary },
});
