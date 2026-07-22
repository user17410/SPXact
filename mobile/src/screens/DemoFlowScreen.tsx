import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';
import { useRole } from '../context';
import DeliveryAcceptPopup from './DeliveryAcceptPopup';
import DeliveryMapScreen from './DeliveryMapScreen';
import RiderOnWayScreen from './RiderOnWayScreen';
import BLEHandshakeScreen from './BLEHandshakeScreen';
import FraudPreventionScreen from './FraudPreventionScreen';

type DemoPhase = 'idle' | 'popup' | 'rider-started' | 'map' | 'buyer-notif' | 'handshake' | 'fraud';

export default function DemoFlowScreen() {
  const { role } = useRole();
  const [phase, setPhase] = useState<DemoPhase>('idle');
  const [blockedReason, setBlockedReason] = useState<string[]>([]);

  if (phase === 'popup') {
    return (
      <View style={styles.container}>
        <View style={styles.behindPopup}>
          <Text style={styles.behindText}>Rider Dashboard</Text>
        </View>
        <DeliveryAcceptPopup
          visible={true}
          parcelId="SPX-2024-90210"
          pickup="SM City Cebu, Level 1"
          dropoff="IT Park Tower 4, Cebu"
          distance="3.2 km"
          fee="₱85"
          onAccept={() => setPhase('rider-started')}
          onDecline={() => setPhase('idle')}
        />
      </View>
    );
  }

  // Rider started heading to destination → buyer gets notified
  if (phase === 'rider-started') {
    return (
      <View style={styles.container}>
        <View style={styles.riderStartedContainer}>
          <View style={styles.notifCard}>
            <View style={styles.notifIconCircle}>
              <Ionicons name="navigate" size={32} color={Colors.white} />
            </View>
            <Text style={styles.riderStartedTitle}>Rider is on the way!</Text>
            <Text style={styles.riderStartedSubtitle}>
              Marco R. has started heading to your destination.{'\n'}Please be ready to receive your package.
            </Text>
            <View style={styles.riderStartedInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="time" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>ETA: ~8 minutes</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="cube" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>Parcel: SPX-2024-90210</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="location" size={18} color={Colors.primary} />
                <Text style={styles.infoText}>IT Park Tower 4, Lahug</Text>
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

  if (phase === 'map') {
    return (
      <DeliveryMapScreen
        buyerName="Juan Santos"
        buyerAddress="IT Park Tower 4, Lahug, Cebu City"
        distance="3.2 km"
        eta="8 min"
        onArrive={() => setPhase('buyer-notif')}
      />
    );
  }

  if (phase === 'buyer-notif') {
    return (
      <View style={styles.container}>
        <RiderOnWayScreen
          riderName="Marco R."
          eta="2 minutes"
          parcelId="SPX-2024-90210"
          onAllow={() => setPhase('handshake')}
          onReject={() => {
            setBlockedReason(['Buyer rejected location sharing request']);
            setPhase('fraud');
          }}
          onTimeout={() => {
            setBlockedReason(['Location sharing request timed out — 3 minute limit reached']);
            setPhase('fraud');
          }}
        />
      </View>
    );
  }

  if (phase === 'handshake') {
    return (
      <BLEHandshakeScreen
        mode={role}
        onComplete={() => setPhase('idle')}
        onFailed={() => {
          setBlockedReason(['Delivery failed — rider unable to complete handoff']);
          setPhase('fraud');
        }}
      />
    );
  }

  if (phase === 'fraud') {
    return (
      <View style={styles.container}>
        <FraudPreventionScreen secondsAgo={4} reasons={blockedReason.length > 0 ? blockedReason : undefined} />
        <View style={styles.resetOverlay}>
          <TouchableOpacity style={styles.resetButton} onPress={() => { setBlockedReason([]); setPhase('idle'); }}>
            <Text style={styles.resetText}>Reset Demo</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Idle state - start demo
  return (
    <View style={styles.idleContainer}>
      <View style={styles.idleContent}>
        <View style={styles.demoIcon}>
          <Ionicons name="play-circle" size={64} color={Colors.primary} />
        </View>
        <Text style={styles.idleTitle}>Delivery Demo</Text>
        <Text style={styles.idleSubtitle}>
          Experience the full delivery flow:{'\n'}
          Accept → Notify Buyer → Navigate → Confirm
        </Text>

        <TouchableOpacity style={styles.startButton} onPress={() => setPhase('popup')}>
          <Ionicons name="flash" size={20} color={Colors.white} />
          <Text style={styles.startText}>Start Demo</Text>
        </TouchableOpacity>

        <View style={styles.stepsPreview}>
          <StepItem step="1" label="Accept delivery" icon="checkmark-circle" />
          <StepItem step="2" label="Notify buyer (rider on way)" icon="notifications" />
          <StepItem step="3" label="Navigate to buyer" icon="map" />
          <StepItem step="4" label="Location sharing (allow/reject)" icon="location" />
          <StepItem step="5" label="WiFi Handshake" icon="wifi" />
          <StepItem step="6" label="Delivery confirmation" icon="shield" />
        </View>
      </View>
    </View>
  );
}

function StepItem({ step, label, icon }: { step: string; label: string; icon: string }) {
  return (
    <View style={styles.stepItem}>
      <View style={styles.stepCircle}><Text style={styles.stepNumber}>{step}</Text></View>
      <Ionicons name={icon as any} size={16} color={Colors.textSecondary} />
      <Text style={styles.stepLabel}>{label}</Text>
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
  idleSubtitle: { ...Typography.body, color: Colors.textSecondary, textAlign: 'center', lineHeight: 22, marginBottom: 32 },
  startButton: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: Colors.primary, paddingHorizontal: 32, paddingVertical: 16, borderRadius: 12, marginBottom: 40 },
  startText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
  stepsPreview: { width: '100%', gap: 12 },
  stepItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  stepCircle: { width: 24, height: 24, borderRadius: 12, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center' },
  stepNumber: { ...Typography.small, fontWeight: '700', color: Colors.textSecondary },
  stepLabel: { ...Typography.body, color: Colors.textPrimary },

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
});
