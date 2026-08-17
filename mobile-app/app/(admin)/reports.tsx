import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { User as UserIcon, Clock, MessageSquare } from 'lucide-react-native';

type PhotoReport = {
  id: string;
  author_id: string;
  author_name: string;
  description: string;
  photo_url: string;
  created_at: string;
  signedUrl: string | null;
};

export default function ReportsScreen() {
  const [reports, setReports] = useState<PhotoReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      const { data } = await supabase
        .from('photo_reports')
        .select(`
          id,
          author_id,
          description,
          photo_url,
          created_at,
          profiles ( name, email )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) {
        const enriched = await Promise.all(data.map(async (r: any) => {
          let signedUrl = null;
          if (r.photo_url) {
            const { data: signed } = await supabase.storage.from('photo-reports').createSignedUrl(r.photo_url, 3600);
            signedUrl = signed?.signedUrl;
          }
          return {
            id: r.id,
            author_id: r.author_id,
            author_name: r.profiles?.name || r.profiles?.email || 'Неизвестный сотрудник',
            description: r.description,
            photo_url: r.photo_url,
            created_at: r.created_at,
            signedUrl
          };
        }));
        setReports(enriched);
      }
      setLoading(false);
    }
    
    loadReports();
  }, []);

  const renderItem = ({ item }: { item: PhotoReport }) => (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <UserIcon color="#10b981" size={20} />
          <Text style={styles.authorName}>{item.author_name}</Text>
        </View>
        <Text style={styles.timeText}>
          {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
      
      {item.signedUrl && (
        <Image source={{ uri: item.signedUrl }} style={styles.photo} resizeMode="cover" />
      )}
      
      {item.description ? (
        <View style={styles.descRow}>
          <MessageSquare color="#94a3b8" size={16} />
          <Text style={styles.descText}>{item.description}</Text>
        </View>
      ) : null}
    </View>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#10b981" style={{ marginTop: 40 }} />
      ) : reports.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyText}>Нет фотоотчетов.</Text>
        </View>
      ) : (
        <FlatList
          data={reports}
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  authorName: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 16 },
  timeText: { fontFamily: 'Inter_400Regular', color: '#64748b', fontSize: 14 },
  photo: { width: '100%', height: 300, borderRadius: 16, marginBottom: 12, backgroundColor: 'rgba(0,0,0,0.2)' },
  descRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingHorizontal: 4 },
  descText: { fontFamily: 'Inter_400Regular', color: '#e2e8f0', fontSize: 14, flex: 1 }
});
