import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const { width } = Dimensions.get('window');

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
  parcelId: string;
  pickup: string;
  dropoff: string;
  distance: string;
  fee: string;
}

export default function DeliveryAcceptPopup({ visible, onAccept, onDecline, parcelId, pickup, dropoff, distance, fee }: Props) {
  const slideAnim = useRef(new Animated.Value(300)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }).start();
    } else {
      Animated.timing(slideAnim, { toValue: 300, duration: 200, useNativeDriver: true }).start();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={styles.overlay}>
      <TouchableOpacity style={styles.backdrop} onPress={onDecline} activeOpacity={1} />
      <Animated.View style={[styles.popup, { transform: [{ translateY: slideAnim }] }]}>
        <View style={styles.handle} />
        <View style={styles.header}>
          <View style={styles.newBadge}><Text style={styles.newBadgeText}>NEW DELIVERY</Text></View>
          <Text style={styles.parcelId}>{parcelId}</Text>
        </View>

        <View style={styles.route}>
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>PICKUP</Text>
              <Text style={styles.routeAddress}>{pickup}</Text>
            </View>
          </View>
          <View style={styles.routeLine} />
          <View style={styles.routePoint}>
            <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
            <View style={styles.routeInfo}>
              <Text style={styles.routeLabel}>DROPOFF</Text>
              <Text style={styles.routeAddress}>{dropoff}</Text>
            </View>
          </View>
        </View>

        <View style={styles.metaRow}>
          <View style={styles.metaItem}>
            <Ionicons name="navigate" size={16} color={Colors.textSecondary} />
            <Text style={styles.metaText}>{distance}</Text>
          </View>
          <View style={styles.feeContainer}>
            <Text style={styles.feeLabel}>Earn</Text>
            <Text style={styles.feeAmount}>{fee}</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.declineButton} onPress={onDecline}>
            <Ionicons name="close" size={22} color={Colors.error} />
            <Text style={styles.declineText}>Decline</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.acceptButton} onPress={onAccept}>
            <Ionicons name="checkmark" size={22} color={Colors.white} />
            <Text style={styles.acceptText}>Accept</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'flex-end', zIndex: 999 },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  popup: { backgroundColor: Colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  handle: { width: 40, height: 4, backgroundColor: Colors.gray300, borderRadius: 2, alignSelf: 'center', marginBottom: 16 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20 },
  newBadge: { backgroundColor: '#2E7D32', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 4 },
  newBadgeText: { ...Typography.small, color: Colors.white, fontWeight: '800', letterSpacing: 1 },
  parcelId: { ...Typography.subtitle, color: Colors.textPrimary },
  route: { marginBottom: 16 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  dot: { width: 12, height: 12, borderRadius: 6 },
  routeInfo: { flex: 1 },
  routeLabel: { ...Typography.small, color: Colors.textLight, fontWeight: '600', letterSpacing: 0.5 },
  routeAddress: { ...Typography.body, color: Colors.textPrimary, marginTop: 2 },
  routeLine: { width: 2, height: 20, backgroundColor: Colors.gray200, marginLeft: 5 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, paddingVertical: 12, borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.border },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...Typography.body, color: Colors.textSecondary },
  feeContainer: { alignItems: 'flex-end' },
  feeLabel: { ...Typography.small, color: Colors.textLight },
  feeAmount: { fontSize: 22, fontWeight: '800', color: '#2E7D32' },
  actions: { flexDirection: 'row', gap: 12 },
  declineButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, borderWidth: 2, borderColor: Colors.error },
  declineText: { ...Typography.bodyBold, color: Colors.error },
  acceptButton: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: '#2E7D32' },
  acceptText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
});
