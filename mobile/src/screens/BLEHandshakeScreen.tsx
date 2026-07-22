import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Vibration, Platform, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const { width, height } = Dimensions.get('window');

interface Props {
  onComplete: () => void;
  onFailed?: () => void;
  mode: 'buyer' | 'rider';
}

export default function BLEHandshakeScreen({ onComplete, onFailed, mode }: Props) {
  const [phase, setPhase] = useState<'connecting' | 'ready' | 'delivered'>('connecting');
  const wifiAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const flashAnim = useRef(new Animated.Value(0)).current;
  const tokenAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const fadeIn = useRef(new Animated.Value(0)).current;

  const token = 'a7f3:9c2b:e1d4:08ff';

  useEffect(() => {
    // Animated wifi pulse (outsourcing/searching)
    Animated.loop(
      Animated.sequence([
        Animated.timing(wifiAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(wifiAnim, { toValue: 0.3, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    // Pulse scale for wifi icon
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 1000, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 1000, useNativeDriver: true }),
      ])
    ).start();

    // After 3 seconds, show buttons (ready state)
    const readyTimer = setTimeout(() => {
      setPhase('ready');
      Animated.timing(fadeIn, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    }, 3000);

    return () => {
      clearTimeout(readyTimer);
    };
  }, []);

  const handleDelivered = () => {
    setPhase('delivered');
    Vibration.vibrate([0, 80, 40, 120]);

    // Subtle flash (less green)
    Animated.sequence([
      Animated.timing(flashAnim, { toValue: 0.6, duration: 100, useNativeDriver: true }),
      Animated.timing(flashAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();

    // Token reveal
    Animated.timing(tokenAnim, { toValue: 1, duration: 800, useNativeDriver: true }).start();

    // Scale bounce
    Animated.spring(scaleAnim, { toValue: 1, friction: 5, tension: 80, useNativeDriver: true }).start();

    // Auto-proceed after 4 seconds
    setTimeout(onComplete, 4000);
  };

  const handleFailed = () => {
    if (onFailed) {
      onFailed();
    }
  };

  // Item Delivered state (previously "presence confirmed") - less green
  if (phase === 'delivered') {
    return (
      <View style={styles.container}>
        {/* Subtle flash overlay - less green, more subtle */}
        <Animated.View style={[styles.flashOverlay, { opacity: flashAnim }]} />

        <Animated.View style={[styles.confirmedContent, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.checkCircle}>
            <Ionicons name="checkmark-circle" size={64} color={Colors.white} />
          </View>
          <Text style={styles.confirmedTitle}>ITEM DELIVERED ✓</Text>
          <Text style={styles.confirmedSubtitle}>Delivery confirmed via proximity</Text>

          {/* Cryptographic token */}
          <Animated.View style={[styles.tokenContainer, { opacity: tokenAnim }]}>
            <View style={styles.tokenHeader}>
              <Ionicons name="lock-closed" size={14} color="#66BB6A" />
              <Text style={styles.tokenLabel}>DELIVERY PROOF</Text>
            </View>
            <Text style={styles.tokenValue}>{token}</Text>
            <View style={styles.tokenMeta}>
              <Text style={styles.tokenMetaText}>SHA-256 · WiFi Direct · {new Date().toISOString().slice(11, 19)}Z</Text>
            </View>
          </Animated.View>

          <View style={styles.deviceRow}>
            <View style={styles.deviceChip}>
              <Ionicons name="phone-portrait" size={14} color="#66BB6A" />
              <Text style={styles.deviceText}>{mode === 'rider' ? 'Rider' : 'Buyer'} Device</Text>
            </View>
            <View style={styles.connectionLine}>
              <Ionicons name="wifi" size={16} color="#66BB6A" />
            </View>
            <View style={styles.deviceChip}>
              <Ionicons name="phone-portrait" size={14} color="#66BB6A" />
              <Text style={styles.deviceText}>{mode === 'rider' ? 'Buyer' : 'Rider'} Device</Text>
            </View>
          </View>
        </Animated.View>
      </View>
    );
  }

  // Connecting / Ready state with wifi icon and buttons
  return (
    <View style={styles.container}>
      <View style={styles.scanningContent}>
        {/* Animated wifi icon */}
        <Animated.View
          style={[
            styles.wifiCircle,
            {
              transform: [{ scale: pulseAnim }],
              opacity: wifiAnim,
            },
          ]}
        >
          <Animated.View style={[styles.wifiCircleInner]}>
            <Ionicons name="wifi" size={48} color={Colors.white} />
          </Animated.View>
        </Animated.View>

        <Text style={styles.scanTitle}>
          {phase === 'connecting' ? 'Connecting...' : 'Connected'}
        </Text>
        <Text style={styles.scanSubtitle}>
          {phase === 'connecting'
            ? 'Outsourcing nearby device signal'
            : 'Device in range — confirm delivery status'}
        </Text>

        {/* Signal wave animation */}
        <View style={styles.signalWaves}>
          {[1, 2, 3].map((i) => (
            <Animated.View
              key={i}
              style={[
                styles.signalWave,
                {
                  width: 40 + i * 30,
                  height: 40 + i * 30,
                  borderRadius: (40 + i * 30) / 2,
                  opacity: Animated.multiply(wifiAnim, 1 / i),
                },
              ]}
            />
          ))}
        </View>

        {/* Two Buttons: Package Delivered / Failed to Deliver */}
        {phase === 'ready' && (
          <Animated.View style={[styles.buttonsContainer, { opacity: fadeIn }]}>
            <TouchableOpacity style={styles.deliveredButton} onPress={handleDelivered}>
              <Ionicons name="checkmark-circle" size={22} color={Colors.white} />
              <Text style={styles.deliveredButtonText}>Package Delivered</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.failedButton} onPress={handleFailed}>
              <Ionicons name="close-circle" size={22} color="#FF5252" />
              <Text style={styles.failedButtonText}>Failed to Deliver</Text>
            </TouchableOpacity>
          </Animated.View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0D1117', justifyContent: 'center', alignItems: 'center' },
  flashOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: '#66BB6A', zIndex: 10 },
  scanningContent: { alignItems: 'center', padding: 32 },
  wifiCircle: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(100,181,246,0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  wifiCircleInner: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(100,181,246,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanTitle: { fontSize: 22, fontWeight: '700', color: Colors.white, marginBottom: 8 },
  scanSubtitle: { ...Typography.body, color: 'rgba(255,255,255,0.6)', textAlign: 'center', marginBottom: 8 },
  signalWaves: {
    position: 'absolute',
    top: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signalWave: {
    position: 'absolute',
    borderWidth: 1.5,
    borderColor: 'rgba(100,181,246,0.25)',
  },
  buttonsContainer: {
    width: width - 64,
    marginTop: 40,
    gap: 14,
  },
  deliveredButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#43A047',
    paddingVertical: 16,
    borderRadius: 12,
  },
  deliveredButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  failedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,82,82,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,82,82,0.4)',
    paddingVertical: 16,
    borderRadius: 12,
  },
  failedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FF5252',
  },
  confirmedContent: { alignItems: 'center', padding: 32 },
  checkCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#66BB6A',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    elevation: 6,
    shadowColor: '#66BB6A',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
  },
  confirmedTitle: { fontSize: 24, fontWeight: '900', color: '#81C784', letterSpacing: 1, marginBottom: 8 },
  confirmedSubtitle: { ...Typography.body, color: 'rgba(255,255,255,0.7)', marginBottom: 32 },
  tokenContainer: {
    backgroundColor: 'rgba(102,187,106,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(102,187,106,0.2)',
    borderRadius: 12,
    padding: 16,
    width: width - 64,
    marginBottom: 24,
  },
  tokenHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  tokenLabel: { ...Typography.small, color: '#66BB6A', fontWeight: '700', letterSpacing: 1 },
  tokenValue: { fontSize: 20, fontWeight: '700', color: Colors.white, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace', letterSpacing: 2, marginBottom: 8 },
  tokenMeta: { borderTopWidth: 1, borderTopColor: 'rgba(102,187,106,0.15)', paddingTop: 8 },
  tokenMetaText: { ...Typography.small, color: 'rgba(255,255,255,0.4)' },
  deviceRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  deviceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(102,187,106,0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(102,187,106,0.2)',
  },
  deviceText: { ...Typography.caption, color: '#66BB6A', fontWeight: '600' },
  connectionLine: { opacity: 0.6 },
});
