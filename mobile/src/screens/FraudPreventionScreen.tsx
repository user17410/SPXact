import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Vibration, Dimensions, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const { width } = Dimensions.get('window');

interface Props {
  secondsAgo: number;
  onDismiss?: () => void;
  reasons?: string[];
}

const DEFAULT_REASONS = [
  'Customer device detected within proximity range',
  'WiFi handshake was successfully completed',
  'GPS location confirms rider at delivery address',
  'Delivery window has not expired',
];

export default function FraudPreventionScreen({ secondsAgo, onDismiss, reasons }: Props) {
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const failReasons = reasons || DEFAULT_REASONS;

  useEffect(() => {
    // Haptic vibration pattern - aggressive
    Vibration.vibrate([0, 200, 100, 200, 100, 400]);

    // Screen shake
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();

    // Pulse the warning icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 500, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();

    // Fade in content
    Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }).start();
  }, []);

  return (
    <Animated.View style={[styles.container, { transform: [{ translateX: shakeAnim }] }]}>
      {/* Scan lines effect */}
      <View style={styles.scanLines}>
        {[...Array(30)].map((_, i) => (
          <View key={i} style={styles.scanLine} />
        ))}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Animated.View style={[styles.content, { opacity: fadeIn }]}>
          {/* Warning icon */}
          <Animated.View style={[styles.warningCircle, { transform: [{ scale: pulseAnim }] }]}>
            <Ionicons name="hand-left" size={56} color="#FF1744" />
          </Animated.View>

          {/* BLOCKED text */}
          <Text style={styles.blockedText}>⛔ BLOCKED</Text>

          {/* Main message */}
          <View style={styles.messageCard}>
            <View style={styles.messageHeader}>
              <Ionicons name="alert-circle" size={20} color="#FF1744" />
              <Text style={styles.messageHeaderText}>CONTRADICTION DETECTED</Text>
            </View>
            <Text style={styles.messageBody}>
              Delivery cannot be marked as failed.
            </Text>
            <Text style={styles.messageExplain}>
              The following conditions contradict a "Failed to Deliver" status:
            </Text>

            {/* Reasons that didn't meet */}
            <View style={styles.reasonsList}>
              {failReasons.map((reason, index) => (
                <View key={index} style={styles.reasonItem}>
                  <View style={styles.reasonBullet}>
                    <Ionicons name="close" size={12} color="#FF1744" />
                  </View>
                  <Text style={styles.reasonText}>{reason}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Evidence card */}
          <View style={styles.evidenceCard}>
            <Text style={styles.evidenceTitle}>EVIDENCE LOG</Text>
            <View style={styles.evidenceRow}>
              <Text style={styles.evidenceLabel}>Last WiFi handshake:</Text>
              <Text style={styles.evidenceValue}>{secondsAgo}s ago</Text>
            </View>
            <View style={styles.evidenceRow}>
              <Text style={styles.evidenceLabel}>Signal strength:</Text>
              <Text style={styles.evidenceValue}>-42 dBm (STRONG)</Text>
            </View>
            <View style={styles.evidenceRow}>
              <Text style={styles.evidenceLabel}>Device verified:</Text>
              <Text style={styles.evidenceValue}>✓ Confirmed</Text>
            </View>
            <View style={styles.evidenceRow}>
              <Text style={styles.evidenceLabel}>Contradiction:</Text>
              <Text style={[styles.evidenceValue, { color: '#FF1744' }]}>FLAGGED</Text>
            </View>
          </View>

          {/* Footer warning */}
          <View style={styles.footer}>
            <Ionicons name="warning" size={16} color="#FF6D00" />
            <Text style={styles.footerText}>
              This incident has been recorded. Repeated violations may result in account suspension.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#1A0000' },
  scanLines: { ...StyleSheet.absoluteFillObject, opacity: 0.03 },
  scanLine: { height: 2, backgroundColor: '#FF1744', marginBottom: 4 },
  scrollContent: { flexGrow: 1, justifyContent: 'center' },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  warningCircle: { width: 110, height: 110, borderRadius: 55, backgroundColor: 'rgba(255,23,68,0.15)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,23,68,0.4)', marginBottom: 20 },
  blockedText: { fontSize: 32, fontWeight: '900', color: '#FF1744', letterSpacing: 4, marginBottom: 24 },
  messageCard: { width: '100%', backgroundColor: 'rgba(255,23,68,0.08)', borderWidth: 1, borderColor: 'rgba(255,23,68,0.3)', borderRadius: 12, padding: 16, marginBottom: 16 },
  messageHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  messageHeaderText: { fontSize: 13, fontWeight: '800', color: '#FF1744', letterSpacing: 1 },
  messageBody: { fontSize: 18, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  messageExplain: { ...Typography.body, color: 'rgba(255,255,255,0.7)', lineHeight: 20, marginBottom: 12 },
  reasonsList: { gap: 8 },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  reasonBullet: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,23,68,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 1,
  },
  reasonText: {
    ...Typography.body,
    color: 'rgba(255,255,255,0.85)',
    flex: 1,
    lineHeight: 20,
    fontSize: 13,
  },
  evidenceCard: { width: '100%', backgroundColor: 'rgba(255,255,255,0.04)', borderRadius: 10, padding: 14, marginBottom: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  evidenceTitle: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, marginBottom: 10 },
  evidenceRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  evidenceLabel: { ...Typography.caption, color: 'rgba(255,255,255,0.5)' },
  evidenceValue: { ...Typography.caption, color: Colors.white, fontWeight: '600', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  footer: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  footerText: { ...Typography.caption, color: 'rgba(255,255,255,0.5)', flex: 1, lineHeight: 16 },
});
