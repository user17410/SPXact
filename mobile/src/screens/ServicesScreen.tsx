import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

const services = [
  { id: '1', title: 'Standard Delivery', description: '2-3 business days nationwide', icon: 'truck-delivery', iconFamily: 'mc', price: 'From ₱80' },
  { id: '2', title: 'Express Delivery', description: 'Same-day or next-day delivery', icon: 'flash', iconFamily: 'io', price: 'From ₱150' },
  { id: '3', title: 'Economy Shipping', description: 'Budget-friendly, 5-7 days', icon: 'leaf-outline', iconFamily: 'io', price: 'From ₱50' },
  { id: '4', title: 'Bulk Shipping', description: 'Business high-volume solutions', icon: 'cube-outline', iconFamily: 'io', price: 'Custom' },
  { id: '5', title: 'Cash on Delivery', description: 'Collect payment on delivery', icon: 'cash-outline', iconFamily: 'io', price: '+₱20 fee' },
  { id: '6', title: 'Return Service', description: 'Easy returns pickup', icon: 'return-up-back', iconFamily: 'io', price: 'Free' },
];

const tools = [
  { id: '1', title: 'Shipping Calculator', icon: 'calculator-outline' },
  { id: '2', title: 'Service Points', icon: 'location-outline' },
  { id: '3', title: 'Packaging Guide', icon: 'cube-outline' },
  { id: '4', title: 'Prohibited Items', icon: 'warning-outline' },
];

export default function ServicesScreen() {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Services</Text>
      </View>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Shipping Services</Text>
          {services.map((s) => (
            <TouchableOpacity key={s.id} style={styles.serviceCard}>
              <View style={styles.iconWrap}>
                {s.iconFamily === 'mc' ? (
                  <MaterialCommunityIcons name={s.icon as any} size={26} color={Colors.primary} />
                ) : (
                  <Ionicons name={s.icon as any} size={26} color={Colors.primary} />
                )}
              </View>
              <View style={styles.serviceInfo}>
                <Text style={styles.serviceName}>{s.title}</Text>
                <Text style={styles.serviceDesc}>{s.description}</Text>
                <Text style={styles.servicePrice}>{s.price}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
            </TouchableOpacity>
          ))}
        </View>
        <View style={[styles.section, { marginBottom: 24 }]}>
          <Text style={styles.sectionTitle}>Tools & Resources</Text>
          <View style={styles.toolsGrid}>
            {tools.map((t) => (
              <TouchableOpacity key={t.id} style={styles.toolCard}>
                <View style={styles.toolIcon}>
                  <Ionicons name={t.icon as any} size={24} color={Colors.primary} />
                </View>
                <Text style={styles.toolTitle}>{t.title}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { backgroundColor: Colors.white, paddingTop: 50, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.border },
  headerTitle: { ...Typography.h2, color: Colors.textPrimary },
  content: { flex: 1 },
  section: { backgroundColor: Colors.white, marginTop: 8, padding: 16 },
  sectionTitle: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 16 },
  serviceCard: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  iconWrap: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  serviceInfo: { flex: 1 },
  serviceName: { ...Typography.bodyBold, color: Colors.textPrimary },
  serviceDesc: { ...Typography.caption, color: Colors.textSecondary, marginTop: 2 },
  servicePrice: { ...Typography.small, color: Colors.primary, fontWeight: '600', marginTop: 4 },
  toolsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  toolCard: { width: '47%', backgroundColor: Colors.gray50, borderRadius: 12, padding: 16, alignItems: 'center' },
  toolIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primaryLight, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  toolTitle: { ...Typography.caption, color: Colors.textPrimary, fontWeight: '600', textAlign: 'center' },
});
