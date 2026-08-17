import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Camera, Building2, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../../src/context/ThemeContext';

function MenuButton({ title, subtitle, icon, onPress, color, isAccent }: any) {
  const { colors, settings, accent } = useTheme();
  const bgColor = isAccent ? `${accent.primary}15` : `${color}15`;
  const borderColor = isAccent ? `${accent.primary}30` : `${color}30`;
  const finalColor = isAccent ? accent.primary : color;

  return (
    <Pressable 
      style={[styles.menuButton, { backgroundColor: bgColor, borderColor: borderColor }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: finalColor }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color: finalColor }]}>{title}</Text>
        <Text style={[styles.subtitle, { color: colors.foreground }]}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function AdminHub() {
  const router = useRouter();
  const { colors, settings } = useTheme();

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={[styles.welcomeCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.welcomeText, { color: colors.foreground }]}>Управление системой</Text>
          <Text style={[styles.welcomeSub, { color: colors.muted }]}>Выберите раздел для перехода</Text>
        </View>

        <View style={styles.grid}>
          <MenuButton 
            title="Онлайн мониторинг" 
            subtitle="Кто сейчас на смене" 
            color="#3b82f6" 
            icon={<Activity color="#fff" size={24} />} 
            onPress={() => router.push('/(admin)/monitoring')}
          />
          
          <MenuButton 
            title="Фотоотчеты" 
            subtitle="Лента новых фото" 
            color="#10b981" 
            isAccent
            icon={<Camera color="#fff" size={24} />} 
            onPress={() => router.push('/(admin)/reports')}
          />

          <MenuButton 
            title="Объекты" 
            subtitle="Управление" 
            color="#f59e0b" 
            icon={<Building2 color="#fff" size={24} />} 
            onPress={() => router.push('/(admin)/sites')}
          />

          <MenuButton 
            title="Сотрудники" 
            subtitle="Управление" 
            color="#8b5cf6" 
            icon={<Users color="#fff" size={24} />} 
            onPress={() => router.push('/(admin)/users')}
          />
        </View>

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 24 },
  welcomeCard: {
    marginBottom: 32,
    alignItems: 'center',
    padding: 24,
    borderRadius: 24,
    borderWidth: 1,
  },
  welcomeText: { fontFamily: 'Inter_700Bold', fontSize: 24, marginBottom: 8 },
  welcomeSub: { fontFamily: 'Inter_400Regular', fontSize: 16 },
  grid: { gap: 16 },
  menuButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderRadius: 20,
    borderWidth: 1,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: { marginLeft: 16, flex: 1 },
  title: { fontFamily: 'Inter_600SemiBold', fontSize: 18, marginBottom: 4 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14 }
});
