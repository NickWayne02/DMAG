import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { MessageSquare, Users, Hash } from 'lucide-react-native';

type ChatChannel = {
  id: string;
  type: 'general' | 'direct';
  name: string;
  channelId: string;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChannels() {
      if (!user) return;

      const newChannels: ChatChannel[] = [
        { id: 'general_chat', type: 'general', name: 'Общий чат', channelId: 'general' }
      ];

      // Fetch DMs
      const { data: messages } = await supabase
        .from('chat_messages')
        .select('channel_id')
        .eq('channel_type', 'direct')
        .like('channel_id', `%${user.id}%`);

      if (messages && messages.length > 0) {
        const uniqueIds = Array.from(new Set(messages.map((m: any) => m.channel_id)));
        
        // Fetch profiles for the DMs
        const { data: profiles } = await supabase.from('profiles').select('id, name, email');
        
        uniqueIds.forEach((cid) => {
          const parts = cid.split('_');
          const otherId = parts[1] === user.id ? parts[2] : parts[1];
          const otherProfile = profiles?.find((p: any) => p.id === otherId);
          newChannels.push({
            id: cid,
            type: 'direct',
            name: otherProfile?.name || otherProfile?.email || 'Сотрудник',
            channelId: cid
          });
        });
      }

      setChannels(newChannels);
      setLoading(false);
    }
    
    loadChannels();
  }, [user]);

  const renderChannel = ({ item }: { item: ChatChannel }) => (
    <Pressable 
      style={styles.channelCard}
      onPress={() => router.push({ pathname: '/chat-view', params: { channelType: item.type, channelId: item.channelId, channelName: item.name } })}
    >
      <View style={[styles.iconContainer, item.type === 'general' ? { backgroundColor: '#3b82f6' } : { backgroundColor: '#10b981' }]}>
        {item.type === 'general' ? <Hash color="#fff" size={24} /> : <Users color="#fff" size={24} />}
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.channelName}>{item.name}</Text>
        <Text style={styles.channelType}>{item.type === 'general' ? 'Компания' : 'Личное сообщение'}</Text>
      </View>
    </Pressable>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Сообщения</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 40 }} />
        ) : (
          <FlatList
            data={channels}
            keyExtractor={item => item.id}
            renderItem={renderChannel}
            contentContainerStyle={styles.list}
          />
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', color: '#fff', fontSize: 28 },
  list: { padding: 16 },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  textContainer: { marginLeft: 16, flex: 1 },
  channelName: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 18, marginBottom: 4 },
  channelType: { fontFamily: 'Inter_400Regular', color: '#94a3b8', fontSize: 14 }
});
