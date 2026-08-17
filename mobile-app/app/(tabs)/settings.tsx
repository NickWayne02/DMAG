import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme, THEME_BASE_COLORS, ACCENT_PRESETS, ThemeMode, AccentId } from '../../src/context/ThemeContext';
import { Sun, Moon, Zap, Check } from 'lucide-react-native';
import { supabase } from '../../src/lib/supabase';

export default function SettingsScreen() {
  const { session } = useAuth();
  const { settings, colors, accent, updateSettings } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const renderModeBtn = (mode: ThemeMode, label: string, icon: any) => (
    <Pressable
      style={[
        styles.modeBtn,
        { backgroundColor: settings.mode === mode ? 'rgba(255,255,255,0.1)' : 'transparent' },
        settings.mode === mode && { borderColor: colors.primary, borderWidth: 1 }
      ]}
      onPress={() => updateSettings({ mode })}
    >
      {icon}
      <Text style={[styles.modeText, { color: colors.foreground }]}>{label}</Text>
    </Pressable>
  );

  return (
    <LinearGradient colors={[colors.background, THEME_BASE_COLORS[settings.mode].muted]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Настройки</Text>
          <Text style={[styles.headerSubtitle, { color: colors.muted }]}>
            Персонализация: тема и размеры интерфейса.
          </Text>
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          
          <Text style={[styles.sectionTitle, { color: colors.foreground }]}>Тема</Text>
          <View style={styles.modesContainer}>
            {renderModeBtn('light', 'Светлая', <Sun color={colors.foreground} size={20} />)}
            {renderModeBtn('dark', 'Тёмная', <Moon color={colors.foreground} size={20} />)}
            {renderModeBtn('neon', 'AMOLED', <Zap color={colors.foreground} size={20} />)}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.foreground, marginTop: 32 }]}>Цветовая тема</Text>
          <View style={styles.accentsGrid}>
            {ACCENT_PRESETS.map((preset) => (
              <Pressable
                key={preset.id}
                style={[
                  styles.accentCard,
                  { backgroundColor: colors.card, borderColor: settings.accentId === preset.id ? preset.primary : colors.border }
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
                <Text style={[styles.accentLabel, { color: colors.cardForeground }]}>{preset.label}</Text>
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  headerSubtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 4 },
  content: { padding: 24, paddingBottom: 100 },
  sectionTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18, marginBottom: 16 },
  modesContainer: { flexDirection: 'row', gap: 12 },
  modeBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, borderWidth: 1, borderColor: 'transparent' },
  modeText: { fontFamily: 'Inter_500Medium', fontSize: 14, marginTop: 8 },
  accentsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  accentCard: { width: '48%', borderRadius: 16, padding: 12, borderWidth: 2 },
  accentGradient: { height: 80, borderRadius: 8, marginBottom: 8, alignItems: 'flex-end', padding: 8 },
  checkIcon: { backgroundColor: 'rgba(0,0,0,0.3)', borderRadius: 12, padding: 2 },
  accentLabel: { fontFamily: 'Inter_600SemiBold', fontSize: 14 },
  logoutBtn: { borderWidth: 1, padding: 16, borderRadius: 16, alignItems: 'center' },
  logoutText: { color: '#ef4444', fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
