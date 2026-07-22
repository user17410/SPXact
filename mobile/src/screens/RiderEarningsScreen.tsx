import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const earningsHistory = [
  { id: '1', date: 'Today', deliveries: 5, amount: '₱425' },
  { id: '2', date: 'Yesterday', deliveries: 8, amount: '₱680' },
  { id: '3', date: 'Jul 20', deliveries: 6, amount: '₱510' },
  { id: '4', date: 'Jul 19', deliveries: 4, amount: '₱340' },
];

export default function RiderEarningsScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Earnings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>This Week</Text>
          <Text style={styles.summaryAmount}>₱1,955</Text>
          <View style={styles.summaryMeta}>
            <View style={styles.metaItem}>
              <Ionicons name="bicycle-outline" size={16} color="#2E7D32" />
              <Text style={styles.metaText}>23 deliveries</Text>
            </View>
            <View style={styles.metaItem}>
              <Ionicons name="navigate-outline" size={16} color="#2E7D32" />
              <Text style={styles.metaText}>87.4 km</Text>
            </View>
          </View>
        </View>

        {/* Cash Out */}
        <TouchableOpacity style={styles.cashOutButton}>
          <Ionicons name="wallet-outline" size={20} color={Colors.white} />
          <Text style={styles.cashOutText}>Cash Out</Text>
        </TouchableOpacity>

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>History</Text>
          {earningsHistory.map((e) => (
            <View key={e.id} style={styles.historyRow}>
              <View style={styles.historyIcon}>
                <Ionicons name="calendar-outline" size={20} color="#2E7D32" />
              </View>
              <View style={styles.historyInfo}>
                <Text style={styles.historyDate}>{e.date}</Text>
                <Text style={styles.historyDeliveries}>{e.deliveries} deliveries</Text>
              </View>
              <Text style={styles.historyAmount}>{e.amount}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  content: { flex: 1, padding: 16 },
  summaryCard: { backgroundColor: Colors.white, borderRadius: 12, padding: 20, alignItems: 'center', marginBottom: 16 },
  summaryLabel: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 4 },
  summaryAmount: { fontSize: 36, fontWeight: '700', color: '#2E7D32', marginBottom: 12 },
  summaryMeta: { flexDirection: 'row', gap: 24 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { ...Typography.caption, color: Colors.textSecondary },
  cashOutButton: { backgroundColor: '#2E7D32', borderRadius: 10, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16 },
  cashOutText: { ...Typography.bodyBold, color: Colors.white },
  section: { backgroundColor: Colors.white, borderRadius: 12, padding: 16 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 12 },
  historyRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  historyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#E8F5E9', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  historyInfo: { flex: 1 },
  historyDate: { ...Typography.bodyBold, color: Colors.textPrimary },
  historyDeliveries: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  historyAmount: { ...Typography.subtitle, color: '#2E7D32' },
});
