import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Dimensions, StatusBar,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../constants';

const { width } = Dimensions.get('window');

function QuickActionItem({ icon, label, color }: { icon: string; label: string; color: string }) {
  return (
    <TouchableOpacity style={styles.quickActionItem}>
      <View style={[styles.quickActionIcon, { backgroundColor: color + '15' }]}>
        <Ionicons name={icon as any} size={24} color={color} />
      </View>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function ServiceItem({ icon, label, subtitle, iconFamily }: { icon: string; label: string; subtitle: string; iconFamily: string }) {
  return (
    <TouchableOpacity style={styles.serviceItem}>
      <View style={styles.serviceIcon}>
        {iconFamily === 'material-community' ? (
          <MaterialCommunityIcons name={icon as any} size={28} color={Colors.primary} />
        ) : (
          <Ionicons name={icon as any} size={28} color={Colors.primary} />
        )}
      </View>
      <Text style={styles.serviceLabel}>{label}</Text>
      <Text style={styles.serviceSubtitle}>{subtitle}</Text>
    </TouchableOpacity>
  );
}

function DropOffCard({ name, address, distance, isOpen }: { name: string; address: string; distance: string; isOpen: boolean }) {
  return (
    <TouchableOpacity style={styles.dropOffCard}>
      <View style={styles.dropOffIcon}>
        <Ionicons name="location" size={24} color={Colors.primary} />
      </View>
      <View style={styles.dropOffInfo}>
        <Text style={styles.dropOffName}>{name}</Text>
        <Text style={styles.dropOffAddress}>{address}</Text>
        <View style={styles.dropOffMeta}>
          <Text style={styles.dropOffDistance}>{distance}</Text>
          <View style={[styles.statusDot, { backgroundColor: isOpen ? Colors.success : Colors.error }]} />
          <Text style={{ ...Typography.small, color: isOpen ? Colors.success : Colors.error }}>
            {isOpen ? 'Open' : 'Closed'}
          </Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
    </TouchableOpacity>
  );
}

export default function HomeScreen() {
  const [trackingNumber, setTrackingNumber] = useState('');

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={Colors.primary} />
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.headerTitle}>SPX Express</Text>
          <View style={styles.headerIcons}>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="notifications-outline" size={24} color={Colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.headerIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={24} color={Colors.white} />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color={Colors.gray500} style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Enter tracking number"
            placeholderTextColor={Colors.gray500}
            value={trackingNumber}
            onChangeText={setTrackingNumber}
          />
          {trackingNumber.length > 0 && (
            <TouchableOpacity onPress={() => setTrackingNumber('')}>
              <Ionicons name="close-circle" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          )}
        </View>
      </LinearGradient>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.quickActions}>
          <QuickActionItem icon="cube-outline" label="Send Parcel" color={Colors.primary} />
          <QuickActionItem icon="pricetag-outline" label="Check Price" color="#FF9800" />
          <QuickActionItem icon="location-outline" label="Drop-off" color="#4CAF50" />
          <QuickActionItem icon="time-outline" label="Schedule" color="#2196F3" />
        </View>

        <View style={styles.bannerContainer}>
          <LinearGradient colors={['#FFF3E0', '#FFECB3']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.banner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>Free Shipping!</Text>
              <Text style={styles.bannerSubtitle}>Send your first parcel for free</Text>
              <TouchableOpacity style={styles.bannerButton}>
                <Text style={styles.bannerButtonText}>Send Now</Text>
              </TouchableOpacity>
            </View>
            <MaterialCommunityIcons name="truck-fast-outline" size={64} color="#FF9800" />
          </LinearGradient>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Services</Text>
          <View style={styles.servicesGrid}>
            <ServiceItem icon="truck-delivery" label="Standard" subtitle="2-3 days" iconFamily="material-community" />
            <ServiceItem icon="flash" label="Express" subtitle="Same day" iconFamily="ionicons" />
            <ServiceItem icon="cube" label="Bulk Ship" subtitle="Business" iconFamily="ionicons" />
            <ServiceItem icon="return-up-back" label="Returns" subtitle="Easy returns" iconFamily="ionicons" />
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recent Orders</Text>
            <TouchableOpacity><Text style={styles.seeAll}>See All</Text></TouchableOpacity>
          </View>
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>No recent orders</Text>
            <Text style={styles.emptySubtext}>Your shipment history will appear here</Text>
          </View>
        </View>

        <View style={[styles.section, { marginBottom: 24 }]}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Nearby Drop-off</Text>
            <TouchableOpacity><Text style={styles.seeAll}>View Map</Text></TouchableOpacity>
          </View>
          <DropOffCard name="SPX Hub - SM City" address="Level 1, SM City Cebu" distance="1.2 km" isOpen={true} />
          <DropOffCard name="SPX Point - Ayala" address="3rd Floor, Ayala Center Cebu" distance="2.5 km" isOpen={true} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { paddingTop: 50, paddingHorizontal: 16, paddingBottom: 20 },
  headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: Colors.white },
  headerIcons: { flexDirection: 'row', gap: 12 },
  headerIcon: { padding: 4 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white, borderRadius: 8, paddingHorizontal: 12, height: 44 },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  content: { flex: 1 },
  quickActions: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: Colors.white, paddingVertical: 20, paddingHorizontal: 8, marginBottom: 8 },
  quickActionItem: { alignItems: 'center', width: (width - 32) / 4 },
  quickActionIcon: { width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  quickActionLabel: { ...Typography.caption, color: Colors.textPrimary, textAlign: 'center' },
  bannerContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  banner: { borderRadius: 12, padding: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerTitle: { ...Typography.h3, color: '#E65100', marginBottom: 4 },
  bannerSubtitle: { ...Typography.body, color: '#BF360C', marginBottom: 12 },
  bannerButton: { backgroundColor: Colors.primary, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 6, alignSelf: 'flex-start' },
  bannerButtonText: { ...Typography.bodyBold, color: Colors.white },
  section: { backgroundColor: Colors.white, marginBottom: 8, padding: 16 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 12 },
  seeAll: { ...Typography.body, color: Colors.primary, marginBottom: 12 },
  servicesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  serviceItem: { width: (width - 56) / 2, backgroundColor: Colors.gray50, borderRadius: 12, padding: 16 },
  serviceIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  serviceLabel: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 2 },
  serviceSubtitle: { ...Typography.caption, color: Colors.textSecondary },
  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { ...Typography.body, color: Colors.textSecondary, marginTop: 12 },
  emptySubtext: { ...Typography.caption, color: Colors.textLight, marginTop: 4 },
  dropOffCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border },
  dropOffIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  dropOffInfo: { flex: 1 },
  dropOffName: { ...Typography.bodyBold, color: Colors.textPrimary },
  dropOffAddress: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  dropOffMeta: { flexDirection: 'row', alignItems: 'center', marginTop: 4, gap: 6 },
  dropOffDistance: { ...Typography.small, color: Colors.textLight },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
});
