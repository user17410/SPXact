import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../constants';
import { UserRole } from '../context';

interface Props {
  onSelect: (role: UserRole) => void;
}

/**
 * First-launch, per-device role pick. No accounts needed — this app is
 * demoed with exactly one phone as the rider and one as the recipient,
 * both pointed at the same shared sample order (see constants/liveOrder.ts).
 */
export default function RoleSelectScreen({ onSelect }: Props) {
  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.topSection}>
        <View style={styles.logo}>
          <Ionicons name="cube" size={40} color={Colors.white} />
        </View>
        <Text style={styles.title}>SPX Express</Text>
        <Text style={styles.subtitle}>What is this device?</Text>
      </LinearGradient>

      <View style={styles.formSection}>
        <Text style={styles.formTitle}>Pick this device's role</Text>
        <Text style={styles.formSubtitle}>
          Set this once per phone. One phone plays the rider, the other plays the recipient of the delivery.
        </Text>

        <TouchableOpacity style={[styles.roleCard, styles.riderCard]} onPress={() => onSelect('rider')}>
          <View style={[styles.roleIcon, styles.riderIcon]}>
            <Ionicons name="bicycle" size={32} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleLabel}>I'm the Rider</Text>
            <Text style={styles.roleDesc}>Accept the delivery and track it to the recipient</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </TouchableOpacity>

        <TouchableOpacity style={[styles.roleCard, styles.buyerCard]} onPress={() => onSelect('buyer')}>
          <View style={[styles.roleIcon, styles.buyerIcon]}>
            <Ionicons name="home" size={32} color={Colors.white} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.roleLabel}>I'm the Recipient</Text>
            <Text style={styles.roleDesc}>Receive the delivery and confirm your presence</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color={Colors.gray400} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.white },
  topSection: { paddingTop: 70, paddingBottom: 40, alignItems: 'center' },
  logo: { width: 72, height: 72, borderRadius: 36, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.white },
  subtitle: { ...Typography.body, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  formSection: { flex: 1, padding: 24, marginTop: -16, backgroundColor: Colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  formTitle: { ...Typography.h2, color: Colors.textPrimary },
  formSubtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4, marginBottom: 24, lineHeight: 20 },

  roleCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    borderWidth: 2, borderColor: Colors.border, borderRadius: 16, padding: 16, marginBottom: 14,
  },
  riderCard: { borderColor: '#C8E6C9' },
  buyerCard: { borderColor: Colors.primaryLight },
  roleIcon: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  riderIcon: { backgroundColor: '#2E7D32' },
  buyerIcon: { backgroundColor: Colors.primary },
  roleLabel: { ...Typography.subtitle, color: Colors.textPrimary, marginBottom: 2 },
  roleDesc: { ...Typography.caption, color: Colors.textSecondary },
});
