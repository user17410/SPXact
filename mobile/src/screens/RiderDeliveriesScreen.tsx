import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const tabs = ['Active', 'Completed', 'Cancelled'];

const deliveries = [
  { id: 'SPX80001', status: 'Picking Up', from: 'SM City Cebu', to: 'IT Park', fee: '₱65', time: '10:30 AM', statusColor: Colors.warning },
  { id: 'SPX80002', status: 'Delivering', from: 'Ayala Center', to: 'Banilad', fee: '₱85', time: '11:15 AM', statusColor: Colors.info },
  { id: 'SPX80003', status: 'Completed', from: 'Robinsons', to: 'Talamban', fee: '₱110', time: '9:00 AM', statusColor: Colors.success },
];

export default function RiderDeliveriesScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Deliveries</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabContent}>
        {tabs.map((tab, index) => (
          <TouchableOpacity key={tab} onPress={() => setActiveTab(index)} style={[styles.tab, activeTab === index && styles.tabActive]}>
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {deliveries.map((d) => (
          <TouchableOpacity key={d.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.idRow}>
                <Ionicons name="bicycle" size={18} color="#2E7D32" />
                <Text style={styles.cardId}>{d.id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: d.statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: d.statusColor }]}>{d.status}</Text>
              </View>
            </View>
            <View style={styles.route}>
              <View style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: '#2E7D32' }]} />
                <Text style={styles.routeLabel}>{d.from}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.routeLabel}>{d.to}</Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.fee}>{d.fee}</Text>
              <Text style={styles.time}>{d.time}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  tabBar: { backgroundColor: Colors.white, maxHeight: 48 },
  tabContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.gray100 },
  tabActive: { backgroundColor: '#2E7D32' },
  tabText: { ...Typography.bodyBold, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  content: { flex: 1, padding: 16 },
  card: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  idRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  cardId: { ...Typography.bodyBold, color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { ...Typography.small, fontWeight: '600' },
  route: { marginBottom: 12 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { width: 1, height: 12, backgroundColor: Colors.gray300, marginLeft: 3 },
  routeLabel: { ...Typography.body, color: Colors.textPrimary },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  fee: { ...Typography.bodyBold, color: '#2E7D32' },
  time: { ...Typography.caption, color: Colors.textLight },
});
