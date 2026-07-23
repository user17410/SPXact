import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';
import { useRole } from '../context';
import HouseholdMembersScreen from './HouseholdMembersScreen';

export default function AccountScreen() {
  const { role } = useRole();
  const isBuyer = role === 'buyer';
  const [showHousehold, setShowHousehold] = useState(false);

  if (showHousehold) {
    return <HouseholdMembersScreen onBack={() => setShowHousehold(false)} />;
  }

  const menuSections = isBuyer ? [
    { title: 'My Account', items: [
      { icon: 'person-outline', label: 'Personal Info' },
      { icon: 'location-outline', label: 'My Addresses' },
      { icon: 'people-outline', label: 'Household Members', onPress: () => setShowHousehold(true) },
      { icon: 'card-outline', label: 'Payment Methods' },
      { icon: 'receipt-outline', label: 'Billing History' },
    ]},
    { title: 'Support', items: [
      { icon: 'help-circle-outline', label: 'Help Center' },
      { icon: 'chatbubble-outline', label: 'Chat with Us' },
      { icon: 'call-outline', label: 'Hotline' },
    ]},
    { title: 'Settings', items: [
      { icon: 'notifications-outline', label: 'Notifications' },
      { icon: 'shield-checkmark-outline', label: 'Privacy' },
      { icon: 'information-circle-outline', label: 'About' },
    ]},
  ] : [
    { title: 'Rider Account', items: [
      { icon: 'person-outline', label: 'Personal Info' },
      { icon: 'document-text-outline', label: 'Documents' },
      { icon: 'card-outline', label: 'Bank Account' },
      { icon: 'bicycle-outline', label: 'Vehicle Info' },
    ]},
    { title: 'Support', items: [
      { icon: 'help-circle-outline', label: 'Rider Support' },
      { icon: 'chatbubble-outline', label: 'Chat with Us' },
      { icon: 'alert-circle-outline', label: 'Report Issue' },
    ]},
    { title: 'Settings', items: [
      { icon: 'notifications-outline', label: 'Notifications' },
      { icon: 'navigate-outline', label: 'Navigation Pref' },
      { icon: 'shield-checkmark-outline', label: 'Privacy' },
    ]},
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Account</Text>
        <TouchableOpacity><Ionicons name="settings-outline" size={24} color={Colors.textPrimary} /></TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileCard}>
          <View style={[styles.avatar, !isBuyer && { backgroundColor: '#2E7D32' }]}>
            <Ionicons name={isBuyer ? 'person' : 'bicycle'} size={32} color={Colors.white} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>User</Text>
            <Text style={styles.profileEmail}>user@email.com</Text>
            <View style={[styles.roleBadge, !isBuyer && { backgroundColor: '#E8F5E9' }]}>
              <Text style={[styles.roleBadgeText, !isBuyer && { color: '#2E7D32' }]}>
                {isBuyer ? '🛒 Buyer' : '🚴 Rider'}
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.editButton}>
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.statsRow}>
          {isBuyer ? (
            <>
              <StatItem value="0" label="Sent" />
              <View style={styles.statDivider} />
              <StatItem value="0" label="In Transit" />
              <View style={styles.statDivider} />
              <StatItem value="0" label="Delivered" />
            </>
          ) : (
            <>
              <StatItem value="23" label="Deliveries" color="#2E7D32" />
              <View style={styles.statDivider} />
              <StatItem value="4.8" label="Rating" color="#2E7D32" />
              <View style={styles.statDivider} />
              <StatItem value="₱1.9K" label="This Week" color="#2E7D32" />
            </>
          )}
        </View>

        {menuSections.map((section) => (
          <View key={section.title} style={styles.menuSection}>
            <Text style={styles.menuSectionTitle}>{section.title}</Text>
            {section.items.map((item) => (
              <TouchableOpacity key={item.label} style={styles.menuItem} onPress={(item as any).onPress}>
                <Ionicons name={item.icon as any} size={22} color={Colors.textSecondary} />
                <Text style={styles.menuLabel}>{item.label}</Text>
                <Ionicons name="chevron-forward" size={18} color={Colors.gray400} />
              </TouchableOpacity>
            ))}
          </View>
        ))}

        <TouchableOpacity style={styles.logoutButton}>
          <Ionicons name="log-out-outline" size={20} color={Colors.error} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function StatItem({ value, label, color }: { value: string; label: string; color?: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statNumber, color ? { color } : {}]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  content: { flex: 1 },
  profileCard: { backgroundColor: Colors.white, flexDirection: 'row', alignItems: 'center', padding: 16, marginBottom: 8 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  profileInfo: { flex: 1 },
  profileName: { ...Typography.subtitle, color: Colors.textPrimary },
  profileEmail: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10, marginTop: 4 },
  roleBadgeText: { ...Typography.small, fontWeight: '600', color: Colors.primary },
  editButton: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6, borderWidth: 1, borderColor: Colors.primary },
  editText: { ...Typography.caption, color: Colors.primary, fontWeight: '600' },
  statsRow: { backgroundColor: Colors.white, flexDirection: 'row', padding: 16, marginBottom: 8 },
  statItem: { flex: 1, alignItems: 'center' },
  statNumber: { ...Typography.h3, color: Colors.primary },
  statLabel: { ...Typography.caption, color: Colors.textSecondary, marginTop: 4 },
  statDivider: { width: 1, backgroundColor: Colors.border },
  menuSection: { backgroundColor: Colors.white, marginBottom: 8, paddingHorizontal: 16, paddingVertical: 12 },
  menuSectionTitle: { ...Typography.caption, color: Colors.textLight, fontWeight: '600', textTransform: 'uppercase', marginBottom: 8 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  menuLabel: { ...Typography.body, color: Colors.textPrimary, marginLeft: 12, flex: 1 },
  logoutButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 16, marginVertical: 16 },
  logoutText: { ...Typography.body, color: Colors.error, fontWeight: '600' },
});
