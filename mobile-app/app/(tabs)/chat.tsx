import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

export default function ChatScreen() {
  return (
    <LinearGradient colors={['#0f172a', '#064e3b']} style={styles.container}>
      <View style={styles.glassCard}>
        <Text style={styles.cardLabel}>Чат</Text>
        <Text style={styles.infoText}>Здесь будет реализован функционал чата (Phase 4).</Text>
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
  infoText: { fontFamily: 'Inter_400Regular', color: '#94a3b8', textAlign: 'center', fontSize: 16 }
});
