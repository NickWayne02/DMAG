import React from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Activity, Camera, Building2, Users } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

function MenuButton({ title, subtitle, icon, onPress, color }: any) {
  return (
    <Pressable 
      style={[styles.menuButton, { backgroundColor: `${color}15`, borderColor: `${color}30` }]}
      onPress={onPress}
    >
      <View style={[styles.iconContainer, { backgroundColor: color }]}>
        {icon}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, { color }]}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
    </Pressable>
  );
}

export default function AdminHub() {
  const router = useRouter();

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={styles.welcomeCard}>
          <Text style={styles.welcomeText}>Управление системой</Text>
          <Text style={styles.welcomeSub}>Выберите раздел для перехода</Text>
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
            icon={<Camera color="#fff" size={24} />} 
            onPress={() => router.push('/(admin)/reports')}
          />

          <MenuButton 
            title="Объекты" 
            subtitle="Управление" 
            color="#f59e0b" 
            icon={<Building2 color="#fff" size={24} />} 
            onPress={() => {}}
          />

          <MenuButton 
            title="Сотрудники" 
            subtitle="Управление" 
            color="#8b5cf6" 
            icon={<Users color="#fff" size={24} />} 
            onPress={() => {}}
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
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  welcomeText: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 24, marginBottom: 8 },
  welcomeSub: { fontFamily: 'Inter_400Regular', color: '#94a3b8', fontSize: 16 },
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
  subtitle: { fontFamily: 'Inter_400Regular', color: '#cbd5e1', fontSize: 14 }
});
