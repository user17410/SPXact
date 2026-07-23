import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar, Switch, Alert } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../constants';
import DeliveryAcceptPopup from './DeliveryAcceptPopup';

const pendingDeliveries = [
  { id: 'SPX90001', pickup: 'SM City Cebu', dropoff: 'IT Park, Cebu', distance: '3.2 km', fee: '₱65', time: '15 min' },
  { id: 'SPX90002', pickup: 'Ayala Center', dropoff: 'Banilad, Cebu', distance: '4.8 km', fee: '₱85', time: '22 min' },
  { id: 'SPX90003', pickup: 'Robinsons Galleria', dropoff: 'Talamban', distance: '6.1 km', fee: '₱110', time: '30 min' },
];

export default function RiderHomeScreen() {
  const [isOnline, setIsOnline] = React.useState(true);
  const [popupDelivery, setPopupDelivery] = React.useState<typeof pendingDeliveries[0] | null>(null);
  const [acceptedIds, setAcceptedIds] = React.useState<Set<string>>(new Set());

  const handleAccept = () => {
    if (!popupDelivery) return;
    setAcceptedIds((prev) => new Set(prev).add(popupDelivery.id));
    setPopupDelivery(null);
    Alert.alert('Delivery accepted', `${popupDelivery.id} added to your active deliveries.`);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#1B5E20" />
      <LinearGradient colors={['#2E7D32', '#1B5E20']} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>Rider Dashboard</Text>
          <View style={styles.onlineToggle}>
            <Text style={styles.onlineLabel}>{isOnline ? 'Online' : 'Offline'}</Text>
            <Switch
              value={isOnline}
              onValueChange={setIsOnline}
              trackColor={{ false: '#999', true: '#81C784' }}
              thumbColor={isOnline ? '#fff' : '#f4f3f4'}
            />
          </View>
        </View>
        <View style={styles.statsRow}>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>0</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>₱0</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
          <View style={styles.stat}>
            <Text style={styles.statNumber}>0 km</Text>
            <Text style={styles.statLabel}>Distance</Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Deliveries</Text>
          {pendingDeliveries.map((d) => (
            <View key={d.id} style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <View style={styles.idRow}>
                  <Ionicons name="cube" size={16} color={Colors.primary} />
                  <Text style={styles.deliveryId}>{d.id}</Text>
                </View>
                <Text style={styles.feeText}>{d.fee}</Text>
              </View>
              <View style={styles.routeInfo}>
                <View style={styles.routePoint}>
                  <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
                  <Text style={styles.routeText}>{d.pickup}</Text>
                </View>
                <View style={styles.routeDash} />
                <View style={styles.routePoint}>
                  <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                  <Text style={styles.routeText}>{d.dropoff}</Text>
                </View>
              </View>
              <View style={styles.deliveryMeta}>
                <View style={styles.metaItem}>
                  <Ionicons name="navigate-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{d.distance}</Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons name="time-outline" size={14} color={Colors.textSecondary} />
                  <Text style={styles.metaText}>{d.time}</Text>
                </View>
              </View>
              {acceptedIds.has(d.id) ? (
                <View style={styles.acceptedButton}>
                  <Ionicons name="checkmark-circle" size={16} color="#2E7D32" />
                  <Text style={styles.acceptedText}>Accepted</Text>
                </View>
              ) : (
                <TouchableOpacity style={styles.acceptButton} onPress={() => setPopupDelivery(d)}>
                  <Text style={styles.acceptText}>Accept Delivery</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
        </View>
      </ScrollView>

      <DeliveryAcceptPopup
        visible={!!popupDelivery}
        parcelId={popupDelivery?.id ?? ''}
        pickup={popupDelivery?.pickup ?? ''}
        dropoff={popupDelivery?.dropoff ?? ''}
        distance={popupDelivery?.distance ?? ''}
        fee={popupDelivery?.fee ?? ''}
        onAccept={handleAccept}
        onDecline={() => setPopupDelivery(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: Colors.white },
  onlineToggle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  onlineLabel: { ...Typography.bodyBold, color: Colors.white },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center' },
  statNumber: { fontSize: 20, fontWeight: '700', color: Colors.white },
  statLabel: { ...Typography.caption, color: '#C8E6C9', marginTop: 4 },
  content: { flex: 1 },
  section: { padding: 16 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 12 },
  deliveryCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  deliveryHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  deliveryId: { ...Typography.bodyBold, color: Colors.textPrimary },
  feeText: { ...Typography.subtitle, color: '#2E7D32' },
  routeInfo: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  routeDash: { width: 1, height: 16, backgroundColor: Colors.gray300, marginLeft: 4 },
  routeText: { ...Typography.body, color: Colors.textPrimary },
  deliveryMeta: { flexDirection: 'row', gap: 16, marginBottom: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { ...Typography.caption, color: Colors.textSecondary },
  acceptButton: { backgroundColor: '#2E7D32', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  acceptText: { ...Typography.bodyBold, color: Colors.white },
  acceptedButton: { flexDirection: 'row', gap: 6, backgroundColor: '#E8F5E9', borderRadius: 8, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  acceptedText: { ...Typography.bodyBold, color: '#2E7D32' },
});
