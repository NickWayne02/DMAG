import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';

export default function SettingsScreen() {
  return (
    <LinearGradient colors={['#0f172a', '#064e3b']} style={styles.container}>
      <View style={styles.glassCard}>
        <Text style={styles.cardLabel}>Настройки</Text>
        <Text style={styles.infoText}>Здесь будут настройки тем и профиля (Phase 3).</Text>
        
        <Pressable style={styles.dangerButton} onPress={() => supabase.auth.signOut()}>
          <Text style={styles.dangerButtonText}>Выйти из аккаунта</Text>
        </Pressable>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'center' },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
    alignItems: 'center',
  },
  cardLabel: { fontFamily: 'Inter_600SemiBold', color: '#ffffff', marginBottom: 12, fontSize: 20 },
  infoText: { fontFamily: 'Inter_400Regular', color: '#94a3b8', textAlign: 'center', fontSize: 16, marginBottom: 32 },
  dangerButton: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingVertical: 12, paddingHorizontal: 24, borderRadius: 12 },
  dangerButtonText: { fontFamily: 'Inter_600SemiBold', color: '#fca5a5', fontSize: 16 },
});
