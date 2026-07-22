import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const { width } = Dimensions.get('window');

interface Props {
  riderName: string;
  eta: string;
  parcelId: string;
  onAllow?: () => void;
  onReject?: () => void;
  onTimeout?: () => void;
}

const COUNTDOWN_SECONDS = 180; // 3 minutes

export default function RiderOnWayScreen({ riderName, eta, parcelId, onAllow, onReject, onTimeout }: Props) {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim = useRef(new Animated.Value(0)).current;
  const timerPulseAnim = useRef(new Animated.Value(1)).current;
  const [secondsLeft, setSecondsLeft] = useState(COUNTDOWN_SECONDS);
  const [responded, setResponded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.3, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    Animated.loop(
      Animated.timing(dotAnim, { toValue: 1, duration: 2000, useNativeDriver: true })
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(timerPulseAnim, { toValue: 1.08, duration: 800, useNativeDriver: true }),
        Animated.timing(timerPulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  // Countdown timer
  useEffect(() => {
    if (responded) return;

    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [responded]);

  // Handle timeout
  useEffect(() => {
    if (secondsLeft === 0 && !responded) {
      setResponded(true);
      onTimeout?.();
    }
  }, [secondsLeft, responded, onTimeout]);

  const handleAllow = useCallback(() => {
    if (responded) return;
    setResponded(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onAllow?.();
  }, [responded, onAllow]);

  const handleReject = useCallback(() => {
    if (responded) return;
    setResponded(true);
    if (intervalRef.current) clearInterval(intervalRef.current);
    onReject?.();
  }, [responded, onReject]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const isUrgent = secondsLeft <= 30;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="notifications" size={24} color={Colors.primary} />
        <Text style={styles.headerTitle}>Delivery Update</Text>
      </View>

      <View style={styles.content}>
        {/* Location Permission Section */}
        {!responded && (
          <View style={styles.permissionSection}>
            <View style={styles.permissionHeader}>
              <Ionicons name="location" size={28} color={Colors.primary} />
              <Text style={styles.permissionTitle}>Location Sharing Request</Text>
            </View>

            <Text style={styles.permissionMessage}>
              Allow {riderName} to see your location for secure delivery?
            </Text>

            {/* Countdown Timer */}
            <Animated.View
              style={[
                styles.timerContainer,
                isUrgent && styles.timerContainerUrgent,
                isUrgent && { transform: [{ scale: timerPulseAnim }] },
              ]}
            >
              <Ionicons
                name="timer"
                size={22}
                color={isUrgent ? Colors.error : Colors.primary}
              />
              <Text style={[styles.timerText, isUrgent && styles.timerTextUrgent]}>
                {formatTime(secondsLeft)}
              </Text>
            </Animated.View>

            <Text style={styles.timerSubtext}>
              {isUrgent ? 'Expiring soon!' : 'Auto-expires when timer ends'}
            </Text>

            {/* Action Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={styles.rejectButton}
                onPress={handleReject}
                activeOpacity={0.7}
              >
                <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                <Text style={styles.rejectButtonText}>Reject</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.allowButton}
                onPress={handleAllow}
                activeOpacity={0.7}
              >
                <Ionicons name="checkmark-circle" size={20} color={Colors.white} />
                <Text style={styles.allowButtonText}>Allow</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Animated rider icon */}
        <Animated.View style={[styles.riderCircle, { transform: [{ scale: pulseAnim }] }]}>
          <View style={styles.riderInner}>
            <Ionicons name="bicycle" size={40} color={Colors.white} />
          </View>
        </Animated.View>

        <Text style={styles.mainText}>Your rider is on the way!</Text>
        <Text style={styles.subText}>{riderName} is heading to your location</Text>

        {/* ETA Card */}
        <View style={styles.etaCard}>
          <View style={styles.etaRow}>
            <Ionicons name="time" size={20} color={Colors.primary} />
            <Text style={styles.etaLabel}>Estimated Arrival</Text>
          </View>
          <Text style={styles.etaValue}>{eta}</Text>
        </View>

        {/* Parcel info */}
        <View style={styles.parcelCard}>
          <View style={styles.parcelRow}>
            <Ionicons name="cube" size={18} color={Colors.textSecondary} />
            <Text style={styles.parcelText}>Parcel {parcelId}</Text>
          </View>
          <View style={styles.statusRow}>
            <View style={styles.liveIndicator}>
              <Animated.View style={[styles.liveDot, { opacity: pulseAnim }]} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
        </View>

        {/* Progress dots */}
        <View style={styles.progressRow}>
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressLine, styles.progressLineDone]} />
          <View style={[styles.progressDot, styles.progressDotDone]} />
          <View style={[styles.progressLine, styles.progressLineActive]} />
          <Animated.View style={[styles.progressDot, styles.progressDotActive, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.progressLine} />
          <View style={styles.progressDot} />
        </View>
        <View style={styles.progressLabels}>
          <Text style={styles.progressLabel}>Picked up</Text>
          <Text style={styles.progressLabel}>In transit</Text>
          <Text style={[styles.progressLabel, { color: Colors.primary }]}>Arriving</Text>
          <Text style={styles.progressLabel}>Delivered</Text>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary },
  content: { flex: 1, alignItems: 'center', paddingHorizontal: 24, paddingTop: 24 },

  // Permission section styles
  permissionSection: {
    width: '100%',
    backgroundColor: Colors.primaryLight,
    borderRadius: 16,
    padding: 20,
    marginBottom: 28,
    borderWidth: 1,
    borderColor: Colors.primary,
    alignItems: 'center',
  },
  permissionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  permissionTitle: {
    ...Typography.h3,
    color: Colors.textPrimary,
  },
  permissionMessage: {
    ...Typography.body,
    color: Colors.textPrimary,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.white,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 24,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  timerContainerUrgent: {
    borderColor: Colors.error,
    backgroundColor: '#FFF5F5',
  },
  timerText: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    letterSpacing: 1,
  },
  timerTextUrgent: {
    color: Colors.error,
  },
  timerSubtext: {
    ...Typography.small,
    color: Colors.textSecondary,
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  allowButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.success,
    paddingVertical: 14,
    borderRadius: 12,
  },
  allowButtonText: {
    ...Typography.body,
    color: Colors.white,
    fontWeight: '700',
  },
  rejectButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.white,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.error,
  },
  rejectButtonText: {
    ...Typography.body,
    color: Colors.error,
    fontWeight: '700',
  },

  // Existing styles
  riderCircle: { width: 100, height: 100, borderRadius: 50, backgroundColor: 'rgba(238,77,45,0.1)', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  riderInner: { width: 72, height: 72, borderRadius: 36, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  mainText: { ...Typography.h2, color: Colors.textPrimary, textAlign: 'center', marginBottom: 8 },
  subText: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', marginBottom: 32 },
  etaCard: { width: '100%', backgroundColor: Colors.primaryLight, borderRadius: 12, padding: 16, marginBottom: 16 },
  etaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  etaLabel: { ...Typography.body, color: Colors.textSecondary },
  etaValue: { ...Typography.h2, color: Colors.primary, marginLeft: 28 },
  parcelCard: { width: '100%', backgroundColor: Colors.gray50, borderRadius: 12, padding: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  parcelRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  parcelText: { ...Typography.body, color: Colors.textPrimary },
  statusRow: { flexDirection: 'row' },
  liveIndicator: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.success },
  liveText: { ...Typography.small, color: Colors.success, fontWeight: '700' },
  progressRow: { flexDirection: 'row', alignItems: 'center', width: '100%', paddingHorizontal: 8 },
  progressDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.gray300 },
  progressDotDone: { backgroundColor: Colors.success },
  progressDotActive: { backgroundColor: Colors.primary, width: 16, height: 16, borderRadius: 8 },
  progressLine: { flex: 1, height: 3, backgroundColor: Colors.gray200, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: Colors.success },
  progressLineActive: { backgroundColor: Colors.primary },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', width: '100%', marginTop: 8, paddingHorizontal: 0 },
  progressLabel: { ...Typography.small, color: Colors.textLight, textAlign: 'center', width: 60 },
});
