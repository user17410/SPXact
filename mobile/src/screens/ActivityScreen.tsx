import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const tabs = ['All', 'To Ship', 'Shipping', 'Delivered', 'Returns'];

const sampleOrders = [
  { id: 'SPX20240001', status: 'Delivered', date: 'Jul 20, 2024', from: 'Manila', to: 'Cebu City', statusColor: Colors.success },
  { id: 'SPX20240002', status: 'In Transit', date: 'Jul 21, 2024', from: 'Quezon City', to: 'Davao', statusColor: Colors.warning },
  { id: 'SPX20240003', status: 'Pending Pickup', date: 'Jul 22, 2024', from: 'Makati', to: 'Iloilo', statusColor: Colors.info },
];

export default function ActivityScreen() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Orders</Text>
        <TouchableOpacity><Ionicons name="search-outline" size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabBar} contentContainerStyle={styles.tabContent}>
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(index)}
            style={[styles.tab, activeTab === index && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === index && styles.tabTextActive]}>{tab}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {sampleOrders.map((order) => (
          <TouchableOpacity key={order.id} style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <View style={styles.orderIdRow}>
                <Ionicons name="cube-outline" size={18} color={Colors.primary} />
                <Text style={styles.orderId}>{order.id}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: order.statusColor + '20' }]}>
                <Text style={[styles.statusText, { color: order.statusColor }]}>{order.status}</Text>
              </View>
            </View>
            <View style={styles.routeRow}>
              <View style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: Colors.primary }]} />
                <Text style={styles.routeText}>{order.from}</Text>
              </View>
              <View style={styles.routeLine} />
              <View style={styles.routePoint}>
                <View style={[styles.dot, { backgroundColor: Colors.success }]} />
                <Text style={styles.routeText}>{order.to}</Text>
              </View>
            </View>
            <Text style={styles.orderDate}>{order.date}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  tabBar: { backgroundColor: Colors.white, maxHeight: 48 },
  tabContent: { paddingHorizontal: 16, alignItems: 'center', gap: 8 },
  tab: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: Colors.gray100 },
  tabActive: { backgroundColor: Colors.primary },
  tabText: { ...Typography.bodyBold, color: Colors.textSecondary },
  tabTextActive: { color: Colors.white },
  content: { flex: 1, padding: 16 },
  orderCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 16, marginBottom: 12, elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  orderIdRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  orderId: { ...Typography.bodyBold, color: Colors.textPrimary },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { ...Typography.small, fontWeight: '600' },
  routeRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  routePoint: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  routeLine: { flex: 1, height: 1, backgroundColor: Colors.gray300, marginHorizontal: 8 },
  routeText: { ...Typography.caption, color: Colors.textSecondary },
  orderDate: { ...Typography.small, color: Colors.textLight },
});
