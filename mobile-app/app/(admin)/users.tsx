import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { UserPlus, User as UserIcon, Shield, Briefcase } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type ProfileRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
};

export default function UsersScreen() {
  const [users, setUsers] = useState<ProfileRow[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { colors } = useTheme();

  useEffect(() => {
    async function loadUsers() {
      // First get profiles
      const { data: profiles } = await supabase.from('profiles').select('*').order('name');
      
      if (profiles) {
        // Then get roles
        const { data: roles } = await supabase.from('user_roles').select('*');
        
        const merged = profiles.map(p => {
          const r = roles?.find(role => role.user_id === p.id);
          return {
            id: p.id,
            name: p.name || 'Без имени',
            email: p.email || 'Нет email',
            role: r?.role || 'employee',
            is_active: p.is_active !== false
          };
        });
        setUsers(merged);
      }
      setLoading(false);
    }
    loadUsers();
  }, []);

  const renderItem = ({ item }: { item: ProfileRow }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={[styles.avatar, { backgroundColor: `${colors.primary}33` }]}>
            <Text style={[styles.avatarText, { color: colors.primary }]}>{item.name.charAt(0).toUpperCase()}</Text>
          </View>
          <View>
            <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
            <Text style={[styles.email, { color: colors.muted }]}>{item.email}</Text>
          </View>
        </View>
      </View>
      
      <View style={styles.footer}>
        <View style={[styles.badge, item.role === 'admin' || item.role === 'super_admin' ? { backgroundColor: `${colors.primary}1A` } : { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
          {item.role === 'admin' || item.role === 'super_admin' ? <Shield size={14} color={colors.primary} /> : <Briefcase size={14} color="#3b82f6" />}
          <Text style={[styles.badgeText, item.role === 'admin' || item.role === 'super_admin' ? { color: colors.primary } : { color: '#3b82f6' }]}>
            {item.role}
          </Text>
        </View>
        {!item.is_active && (
          <View style={[styles.badge, { backgroundColor: 'rgba(239,68,68,0.1)' }]}>
            <Text style={{ color: '#ef4444', fontSize: 12, fontFamily: 'Inter_500Medium' }}>Заблокирован</Text>
          </View>
        )}
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => router.push('/(admin)/create-user')}
      >
        <UserPlus color={colors.primaryForeground} size={24} />
      </Pressable>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  avatar: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 20 },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  email: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 },
  footer: { flexDirection: 'row', gap: 8, marginTop: 16 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  }
});
