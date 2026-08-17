import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';

export default function DashboardScreen() {
  const { session } = useAuth();

  return (
    <LinearGradient colors={['#0f172a', '#064e3b']} style={styles.container}>
      <View style={styles.glassCard}>
        <Text style={styles.cardLabel}>Вы вошли как:</Text>
        <Text style={styles.cardValue}>{session?.user.email}</Text>
      </View>
      
      <View style={[styles.glassCard, styles.infoCard]}>
        <Text style={styles.infoText}>
          Это независимое нативное мобильное приложение с доступом в интернет.
        </Text>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  cardLabel: { fontFamily: 'Inter_400Regular', color: '#94a3b8', marginBottom: 8, fontSize: 14 },
  cardValue: { fontFamily: 'Inter_600SemiBold', color: '#ffffff', fontSize: 18 },
  infoCard: { marginTop: 24, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  infoText: { fontFamily: 'Inter_500Medium', color: '#34d399', fontSize: 15, lineHeight: 22, textAlign: 'center' }
});
