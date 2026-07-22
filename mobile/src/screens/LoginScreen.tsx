import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, StatusBar, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors, Typography } from '../constants';
import { UserRole } from '../context';

interface Props {
  onLogin: (role: UserRole) => void;
}

export default function LoginScreen({ onLogin }: Props) {
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const canProceed = selectedRole && name.trim().length > 0;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient colors={[Colors.primary, Colors.primaryDark]} style={styles.topSection}>
        <View style={styles.logo}>
          <Ionicons name="cube" size={40} color={Colors.white} />
        </View>
        <Text style={styles.title}>SPX Express</Text>
        <Text style={styles.subtitle}>Fast. Reliable. Secure.</Text>
      </LinearGradient>

      <KeyboardAvoidingView style={styles.formSection} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Text style={styles.formTitle}>Get Started</Text>
        <Text style={styles.formSubtitle}>Choose your role and create your account</Text>

        {/* Role Selection */}
        <Text style={styles.label}>I am a...</Text>
        <View style={styles.roleRow}>
          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'buyer' && styles.roleCardActive]}
            onPress={() => setSelectedRole('buyer')}
          >
            <View style={[styles.roleIcon, selectedRole === 'buyer' && styles.roleIconActive]}>
              <Ionicons name="cart" size={28} color={selectedRole === 'buyer' ? Colors.white : Colors.primary} />
            </View>
            <Text style={[styles.roleLabel, selectedRole === 'buyer' && styles.roleLabelActive]}>Buyer</Text>
            <Text style={styles.roleDesc}>Send & receive parcels</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.roleCard, selectedRole === 'rider' && styles.roleCardRiderActive]}
            onPress={() => setSelectedRole('rider')}
          >
            <View style={[styles.roleIcon, selectedRole === 'rider' && styles.roleIconRiderActive]}>
              <Ionicons name="bicycle" size={28} color={selectedRole === 'rider' ? Colors.white : '#2E7D32'} />
            </View>
            <Text style={[styles.roleLabel, selectedRole === 'rider' && styles.roleLabelRiderActive]}>Rider</Text>
            <Text style={styles.roleDesc}>Deliver parcels & earn</Text>
          </TouchableOpacity>
        </View>

        {/* Name Input */}
        <Text style={styles.label}>Full Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter your full name"
          placeholderTextColor={Colors.gray500}
          value={name}
          onChangeText={setName}
        />

        {/* Email Input */}
        <Text style={styles.label}>Email (optional)</Text>
        <TextInput
          style={styles.input}
          placeholder="your@email.com"
          placeholderTextColor={Colors.gray500}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />

        {/* Continue Button */}
        <TouchableOpacity
          style={[styles.continueButton, !canProceed && styles.continueButtonDisabled]}
          onPress={() => canProceed && onLogin(selectedRole!)}
          disabled={!canProceed}
        >
          <Text style={styles.continueText}>Continue as {selectedRole === 'rider' ? 'Rider' : selectedRole === 'buyer' ? 'Buyer' : '...'}</Text>
          <Ionicons name="arrow-forward" size={20} color={Colors.white} />
        </TouchableOpacity>
      </KeyboardAvoidingView>
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
  formSubtitle: { ...Typography.body, color: Colors.textSecondary, marginTop: 4, marginBottom: 20 },
  label: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 8, marginTop: 16 },
  roleRow: { flexDirection: 'row', gap: 12 },
  roleCard: { flex: 1, borderWidth: 2, borderColor: Colors.border, borderRadius: 12, padding: 16, alignItems: 'center' },
  roleCardActive: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  roleCardRiderActive: { borderColor: '#2E7D32', backgroundColor: '#E8F5E9' },
  roleIcon: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.gray100, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  roleIconActive: { backgroundColor: Colors.primary },
  roleIconRiderActive: { backgroundColor: '#2E7D32' },
  roleLabel: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 2 },
  roleLabelActive: { color: Colors.primary },
  roleLabelRiderActive: { color: '#2E7D32' },
  roleDesc: { ...Typography.caption, color: Colors.textSecondary, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary },
  continueButton: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 24 },
  continueButtonDisabled: { opacity: 0.4 },
  continueText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
});
