import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme, ACCENT_PRESETS } from '../../src/context/ThemeContext';
import { Check } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';

export default function SettingsScreen() {
  const { session } = useAuth();
  const { settings, colors, updateSettings } = useTheme();
  const insets = useSafeAreaInsets();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Настройки</Text>
        <Text style={[styles.headerSubtitle, { color: 'rgba(255,255,255,0.6)' }]}>
          AMOLED Тема · Выбор неонового акцента
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        
        <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Цветовая тема</Text>
        <View style={styles.accentsGrid}>
          {ACCENT_PRESETS.map((preset) => (
            <Pressable
              key={preset.id}
              style={[
                styles.accentCard,
                { backgroundColor: '#0a0a0a', borderColor: settings.accentId === preset.id ? preset.cyan : 'rgba(255,255,255,0.1)' }
              ]}
              onPress={() => updateSettings({ accentId: preset.id })}
            >
              <LinearGradient
                colors={[preset.primary, preset.cyan]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.accentGradient}
              >
                {settings.accentId === preset.id && <Check color="#fff" size={20} style={styles.checkIcon} />}
              </LinearGradient>
              <Text style={[styles.accentLabel, { color: '#ffffff' }]}>{preset.label}</Text>
            </Pressable>
          ))}
        </View>

        <Pressable 
          style={[styles.logoutBtn, { borderColor: 'rgba(239,68,68,0.5)', marginTop: 40 }]} 
          onPress={handleLogout}
        >
          <Text style={styles.logoutText}>Выйти из аккаунта</Text>
        </Pressable>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 32 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 4 },
  content: { padding: 24, paddingBottom: 100 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20, marginBottom: 16 },
  accentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between' },
  accentCard: { width: '48%', borderRadius: 20, padding: 12, borderWidth: 1 },
  accentGradient: { height: 90, borderRadius: 12, marginBottom: 12, alignItems: 'flex-end', padding: 8 },
  checkIcon: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 4 },
  accentLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  logoutBtn: { borderWidth: 1, padding: 18, borderRadius: 20, alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.1)' },
  logoutText: { color: '#ef4444', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
