import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
  StatusBar, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Typography } from '../constants';

interface HouseholdMember {
  id: string;
  name: string;
  relationship: string;
  phone: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#EE4D2D', '#2E7D32', '#1565C0', '#8E24AA', '#F9A825'];

const RELATIONSHIPS = ['Spouse', 'Parent', 'Sibling', 'Child', 'Roommate', 'Other'];

const INITIAL_MEMBERS: HouseholdMember[] = [
  { id: 'hm1', name: 'Liza Francisco', relationship: 'Spouse', phone: '+63 917 123 4567', avatarColor: AVATAR_COLORS[1] },
  { id: 'hm2', name: 'Ben Francisco', relationship: 'Sibling', phone: '+63 918 234 5678', avatarColor: AVATAR_COLORS[2] },
];

interface Props {
  onBack: () => void;
}

export default function HouseholdMembersScreen({ onBack }: Props) {
  const [members, setMembers] = useState<HouseholdMember[]>(INITIAL_MEMBERS);
  const [mode, setMode] = useState<'list' | 'add'>('list');
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(RELATIONSHIPS[0]);
  const [phone, setPhone] = useState('');

  const canSave = name.trim().length > 0 && phone.trim().length > 0;

  const resetForm = () => {
    setName('');
    setRelationship(RELATIONSHIPS[0]);
    setPhone('');
  };

  const handleSave = () => {
    if (!canSave) return;
    const newMember: HouseholdMember = {
      id: `hm${Date.now()}`,
      name: name.trim(),
      relationship,
      phone: phone.trim(),
      avatarColor: AVATAR_COLORS[members.length % AVATAR_COLORS.length],
    };
    setMembers((prev) => [...prev, newMember]);
    resetForm();
    setMode('list');
  };

  const handleRemove = (id: string) => {
    setMembers((prev) => prev.filter((m) => m.id !== id));
  };

  if (mode === 'add') {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
        <View style={styles.header}>
          <TouchableOpacity onPress={() => { resetForm(); setMode('list'); }} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Add Household Member</Text>
          <View style={{ width: 32 }} />
        </View>

        <KeyboardAvoidingView
          style={styles.formSection}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Maria Santos"
              placeholderTextColor={Colors.gray500}
              value={name}
              onChangeText={setName}
            />

            <Text style={styles.label}>Relationship</Text>
            <View style={styles.chipRow}>
              {RELATIONSHIPS.map((r) => (
                <TouchableOpacity
                  key={r}
                  style={[styles.chip, relationship === r && styles.chipActive]}
                  onPress={() => setRelationship(r)}
                >
                  <Text style={[styles.chipText, relationship === r && styles.chipTextActive]}>{r}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+63 9XX XXX XXXX"
              placeholderTextColor={Colors.gray500}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <View style={styles.noteCard}>
              <Ionicons name="information-circle-outline" size={18} color={Colors.textSecondary} />
              <Text style={styles.noteText}>
                Household members can be asked to confirm they're home when a rider arrives, in addition to you.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
              onPress={handleSave}
              disabled={!canSave}
            >
              <Ionicons name="person-add" size={18} color={Colors.white} />
              <Text style={styles.saveButtonText}>Add Member</Text>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={Colors.white} />
      <View style={styles.header}>
        <TouchableOpacity onPress={onBack} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Household Members</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.sectionSubtitle}>
          People registered here can also be asked to confirm presence for your deliveries.
        </Text>

        {members.map((m) => (
          <View key={m.id} style={styles.memberCard}>
            <View style={[styles.avatar, { backgroundColor: m.avatarColor }]}>
              <Text style={styles.avatarText}>{m.name.charAt(0)}</Text>
            </View>
            <View style={styles.memberInfo}>
              <Text style={styles.memberName}>{m.name}</Text>
              <View style={styles.memberMetaRow}>
                <View style={styles.relBadge}>
                  <Text style={styles.relBadgeText}>{m.relationship}</Text>
                </View>
                <Text style={styles.memberPhone}>{m.phone}</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => handleRemove(m.id)} style={styles.removeBtn}>
              <Ionicons name="close" size={18} color={Colors.gray400} />
            </TouchableOpacity>
          </View>
        ))}

        {members.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="people-outline" size={48} color={Colors.gray300} />
            <Text style={styles.emptyText}>No household members yet</Text>
          </View>
        )}

        <TouchableOpacity style={styles.addButton} onPress={() => setMode('add')}>
          <Ionicons name="add-circle" size={20} color={Colors.primary} />
          <Text style={styles.addButtonText}>Add Household Member</Text>
        </TouchableOpacity>

        <View style={styles.plannedCard}>
          <Ionicons name="time-outline" size={16} color="#FF9800" />
          <Text style={styles.plannedText}>
            Planned: when a rider accepts your delivery, every registered member will get a location-sharing
            request — not just you.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.white, paddingTop: 50, paddingHorizontal: 8, paddingBottom: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  backBtn: { padding: 8, width: 32 },
  headerTitle: { ...Typography.h3, color: Colors.textPrimary },
  content: { flex: 1, padding: 16 },
  sectionSubtitle: { ...Typography.caption, color: Colors.textSecondary, marginBottom: 16, lineHeight: 18 },

  memberCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.white,
    borderRadius: 12, padding: 14, marginBottom: 10,
    elevation: 1, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 4,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  avatarText: { ...Typography.h3, color: Colors.white },
  memberInfo: { flex: 1 },
  memberName: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 4 },
  memberMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  relBadge: { backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
  relBadgeText: { ...Typography.small, color: Colors.primary, fontWeight: '600' },
  memberPhone: { ...Typography.caption, color: Colors.textSecondary },
  removeBtn: { padding: 6 },

  emptyState: { alignItems: 'center', paddingVertical: 32 },
  emptyText: { ...Typography.body, color: Colors.textSecondary, marginTop: 12 },

  addButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 12,
    paddingVertical: 14, marginTop: 4, marginBottom: 16,
  },
  addButtonText: { ...Typography.bodyBold, color: Colors.primary },

  plannedCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: '#FFF8E1', borderRadius: 10, padding: 12, marginBottom: 24,
    borderWidth: 1, borderColor: '#FFE0B2',
  },
  plannedText: { ...Typography.caption, color: '#795548', flex: 1, lineHeight: 17 },

  // Add form
  formSection: { flex: 1, padding: 20 },
  label: { ...Typography.bodyBold, color: Colors.textPrimary, marginBottom: 8, marginTop: 16 },
  input: {
    borderWidth: 1, borderColor: Colors.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: Colors.textPrimary,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.gray100, borderWidth: 1, borderColor: Colors.border,
  },
  chipActive: { backgroundColor: Colors.primaryLight, borderColor: Colors.primary },
  chipText: { ...Typography.caption, color: Colors.textSecondary, fontWeight: '600' },
  chipTextActive: { color: Colors.primary },

  noteCard: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.gray50, borderRadius: 10, padding: 12, marginTop: 20,
  },
  noteText: { ...Typography.caption, color: Colors.textSecondary, flex: 1, lineHeight: 17 },

  saveButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, marginTop: 24, marginBottom: 40,
  },
  saveButtonDisabled: { opacity: 0.4 },
  saveButtonText: { ...Typography.bodyBold, color: Colors.white, fontSize: 16 },
});
