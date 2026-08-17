import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { Users, Hash } from 'lucide-react-native';

type ChatChannel = {
  id: string;
  type: 'general' | 'direct';
  name: string;
  channelId: string;
};

export default function ChatScreen() {
  const { user } = useAuth();
  const { colors, settings, accent } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [channels, setChannels] = useState<ChatChannel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadChannels() {
      if (!user) return;

      const newChannels: ChatChannel[] = [
        { id: 'general_chat', type: 'general', name: 'Общий чат команды', channelId: 'general' }
      ];

      const { data: messages } = await supabase
        .from('chat_messages')
        .select('channel_id')
        .eq('channel_type', 'direct')
        .like('channel_id', `%${user.id}%`);

      if (messages && messages.length > 0) {
        const uniqueIds = Array.from(new Set(messages.map((m: any) => m.channel_id)));
        
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
      style={[styles.channelCard, { backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)' }]}
      onPress={() => router.push({ pathname: '/chat-view', params: { channelType: item.type, channelId: item.channelId, channelName: item.name } })}
    >
      <View style={[styles.iconContainer, { backgroundColor: item.type === 'general' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(139, 92, 246, 0.1)' }]}>
        {item.type === 'general' ? <Hash color={colors.neonCyan} size={24} /> : <Users color={colors.neonViolet} size={24} />}
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.channelName, { color: '#ffffff' }]}>{item.name}</Text>
        <Text style={[styles.channelType, { color: 'rgba(255,255,255,0.6)' }]}>{item.type === 'general' ? 'Компания' : 'Личное сообщение'}</Text>
      </View>
    </Pressable>
  );

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 24) }]}>
        <Text style={[styles.headerTitle, { color: colors.foreground }]}>Сообщения</Text>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={colors.neonCyan} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={channels}
          keyExtractor={item => item.id}
          renderItem={renderChannel}
          contentContainerStyle={styles.list}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: 24, paddingBottom: 16 },
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 32 },
  list: { padding: 20 },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  iconContainer: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  textContainer: { marginLeft: 20, flex: 1 },
  channelName: { fontFamily: 'Inter_600SemiBold', fontSize: 18, marginBottom: 6 },
  channelType: { fontFamily: 'Inter_400Regular', fontSize: 14 }
});
