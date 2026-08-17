import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
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
      style={[styles.channelCard, { backgroundColor: colors.card, borderColor: colors.border }]}
      onPress={() => router.push({ pathname: '/chat-view', params: { channelType: item.type, channelId: item.channelId, channelName: item.name } })}
    >
      <LinearGradient 
        colors={item.type === 'general' ? [colors.primary, accent.cyan] : ['#10b981', '#059669']} 
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {item.type === 'general' ? <Hash color={colors.primaryForeground} size={24} /> : <Users color="#fff" size={24} />}
      </LinearGradient>
      <View style={styles.textContainer}>
        <Text style={[styles.channelName, { color: colors.cardForeground }]}>{item.name}</Text>
        <Text style={[styles.channelType, { color: colors.muted }]}>{item.type === 'general' ? 'Компания' : 'Личное сообщение'}</Text>
      </View>
    </Pressable>
  );

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Сообщения</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
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
  headerTitle: { fontFamily: 'Inter_700Bold', fontSize: 28 },
  list: { padding: 16 },
  channelCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  iconContainer: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  textContainer: { marginLeft: 16, flex: 1 },
  channelName: { fontFamily: 'Inter_600SemiBold', fontSize: 18, marginBottom: 4 },
  channelType: { fontFamily: 'Inter_400Regular', fontSize: 14 }
});
