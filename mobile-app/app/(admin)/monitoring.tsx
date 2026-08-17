import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { MapPin, Clock, User as UserIcon } from 'lucide-react-native';

type ActiveShift = {
  id: string;
  user_id: string;
  user_name: string;
  status: 'working' | 'lunch';
  site_name: string;
  started_at: string;
};

export default function MonitoringScreen() {
  const [shifts, setShifts] = useState<ActiveShift[]>([]);
  const [loading, setLoading] = useState(true);
  const { colors, settings, accent } = useTheme();

  useEffect(() => {
    async function loadActiveShifts() {
      const { data } = await supabase
        .from('shifts')
        .select(`
          id,
          user_id,
          status,
          site_name,
          started_at,
          profiles ( name, email )
        `)
        .in('status', ['working', 'lunch'])
        .order('started_at', { ascending: false });

      if (data) {
        setShifts(data.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          user_name: s.profiles?.name || s.profiles?.email || 'Неизвестный сотрудник',
          status: s.status,
          site_name: s.site_name || 'Неизвестный объект',
          started_at: s.started_at,
        })));
      }
      setLoading(false);
    }
    
    loadActiveShifts();
    const interval = setInterval(loadActiveShifts, 30000);
    return () => clearInterval(interval);
  }, []);

  const renderItem = ({ item }: { item: ActiveShift }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UserIcon color={colors.muted} size={20} />
          <Text style={[styles.userName, { color: colors.foreground }]}>{item.user_name}</Text>
        </View>
        <View style={[styles.badge, item.status === 'working' ? styles.badgeWorking : styles.badgeLunch]}>
          <Text style={[styles.badgeText, item.status === 'working' ? styles.badgeTextWorking : styles.badgeTextLunch]}>
            {item.status === 'working' ? 'Работает' : 'На обеде'}
          </Text>
        </View>
      </View>
      
      <View style={styles.detailsRow}>
        <MapPin color={colors.muted} size={16} />
        <Text style={[styles.detailText, { color: colors.muted }]}>{item.site_name}</Text>
      </View>
      <View style={styles.detailsRow}>
        <Clock color={colors.muted} size={16} />
        <Text style={[styles.detailText, { color: colors.muted }]}>Начал в {new Date(item.started_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
      </View>
    </View>
  );

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : shifts.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyText, { color: colors.muted }]}>В данный момент нет активных смен.</Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  userName: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  badgeWorking: { backgroundColor: 'rgba(16,185,129,0.1)' },
  badgeLunch: { backgroundColor: 'rgba(245,158,11,0.1)' },
  badgeText: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  badgeTextWorking: { color: '#10b981' },
  badgeTextLunch: { color: '#f59e0b' },
  detailsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  detailText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 16 }
});
