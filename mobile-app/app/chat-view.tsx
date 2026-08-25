import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, TextInput, FlatList, KeyboardAvoidingView, Platform, Pressable, ActivityIndicator, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { ArrowLeft, Send } from 'lucide-react-native';

type DbMessage = {
  id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
};

export default function ChatViewScreen() {
  const { channelType, channelId, channelName } = useLocalSearchParams();
  const { user } = useAuth();
  const { colors } = useTheme();
  const router = useRouter();
  
  const [messages, setMessages] = useState<DbMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [inputText, setInputText] = useState('');
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    if (!user || !channelId) return;

    async function loadMessages() {
      const { data } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('channel_type', channelType as string)
        .eq('channel_id', channelId as string)
        .order('created_at', { ascending: true })
        .limit(100);

      if (data) setMessages(data as DbMessage[]);
      setLoading(false);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);
    }
    loadMessages();

    const subscription = supabase
      .channel(`room_${channelId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `channel_id=eq.${channelId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as DbMessage]);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
        }
      )
      .subscribe();

    return () => { subscription.unsubscribe(); };
  }, [user, channelId]);

  async function sendMessage() {
    if (!inputText.trim() || !user || sending) return;
    setSending(true);

    const { data: profile } = await supabase.from('profiles').select('name, email').eq('id', user.id).single();
    const authorName = profile?.name || profile?.email || 'Сотрудник';

    const { error } = await supabase.from('chat_messages').insert({
      channel_type: channelType as string,
      channel_id: channelId as string,
      author_id: user.id,
      author_name: authorName,
      content: inputText.trim(),
      source_lang: 'ru'
    });

    if (!error) setInputText('');
    setSending(false);
  }

  const renderMessage = ({ item }: { item: DbMessage }) => {
    const isMe = item.author_id === user?.id;
    const isPhotoReport = item.content.startsWith('[PHOTO_REPORT]');
    let reportData = null;
    if (isPhotoReport) {
      const parts = item.content.replace('[PHOTO_REPORT] ', '').split(' | ');
      reportData = { path: parts[0], crit: parts[1], desc: parts.slice(2).join(' | ') };
    }

    return (
      <View style={[styles.messageRow, isMe ? styles.messageRowMe : styles.messageRowThem]}>
        {!isMe && (
          <View style={[styles.avatar, { backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.2)', borderWidth: 1 }]}>
            <Text style={[styles.avatarText, { color: '#ffffff' }]}>{item.author_name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: colors.neonCyan, shadowColor: colors.neonCyan, shadowRadius: 10, shadowOpacity: 0.5, elevation: 5 }] : [styles.bubbleThem, { backgroundColor: '#0a0a0a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }]]}>
          {!isMe && <Text style={[styles.authorName, { color: colors.neonCyan }]}>{item.author_name}</Text>}
          
          {isPhotoReport && reportData ? (
            <View style={[styles.reportContainer, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
              <Text style={[styles.reportTag, { color: isMe ? '#000000' : colors.neonCyan }]}>📸 Фотоотчет ({reportData.crit})</Text>
              {reportData.desc ? <Text style={[styles.messageText, { color: isMe ? '#000000' : '#ffffff' }]}>{reportData.desc}</Text> : null}
            </View>
          ) : (
            <Text style={[styles.messageText, { color: isMe ? '#000000' : '#ffffff' }]}>{item.content}</Text>
          )}
          
          <Text style={[styles.timeText, { color: isMe ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.4)' }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { backgroundColor: '#0a0a0a', borderBottomColor: 'rgba(255,255,255,0.1)' }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#ffffff" size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: '#ffffff' }]}>{channelName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.neonCyan} style={{ flex: 1, justifyContent: 'center' }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.list}
            />
          )}

          <View style={[styles.inputContainer, { backgroundColor: '#0a0a0a', borderTopColor: 'rgba(255,255,255,0.1)', paddingBottom: Platform.OS === 'ios' ? 32 : 16 }]}>
            <TextInput
              style={[styles.input, { backgroundColor: '#000000', color: '#ffffff', borderColor: 'rgba(255,255,255,0.1)' }]}
              placeholder="Сообщение..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <Pressable 
              style={[styles.sendBtn, { backgroundColor: colors.neonCyan, shadowColor: colors.neonCyan, shadowRadius: 10, shadowOpacity: 0.8, elevation: 5 }, (!inputText.trim() || sending) && styles.sendBtnDisabled]} 
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <Send color="#000000" size={20} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  backBtn: { padding: 8, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)' },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  keyboardView: { flex: 1 },
  list: { padding: 16, paddingBottom: 32 },
  messageRow: { flexDirection: 'row', marginBottom: 20, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowThem: { justifyContent: 'flex-start' },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  bubble: { maxWidth: '78%', padding: 16, borderRadius: 24 },
  bubbleMe: { borderBottomRightRadius: 6 },
  bubbleThem: { borderBottomLeftRadius: 6 },
  authorName: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 6 },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 24 },
  timeText: { fontFamily: 'Inter_400Regular', fontSize: 11, alignSelf: 'flex-end', marginTop: 6 },
  reportContainer: { padding: 12, borderRadius: 12, marginTop: 8 },
  reportTag: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 6 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 24, paddingHorizontal: 20, paddingTop: 14, paddingBottom: 14, fontSize: 16, maxHeight: 120, minHeight: 50, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  sendBtn: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  sendBtnDisabled: { opacity: 0.5 }
});
