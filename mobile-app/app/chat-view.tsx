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
          <View style={[styles.avatar, { backgroundColor: colors.muted }]}>
            <Text style={[styles.avatarText, { color: colors.foreground }]}>{item.author_name?.charAt(0).toUpperCase() || '?'}</Text>
          </View>
        )}
        <View style={[styles.bubble, isMe ? [styles.bubbleMe, { backgroundColor: colors.primary }] : [styles.bubbleThem, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]]}>
          {!isMe && <Text style={[styles.authorName, { color: colors.muted }]}>{item.author_name}</Text>}
          
          {isPhotoReport && reportData ? (
            <View style={[styles.reportContainer, { backgroundColor: 'rgba(0,0,0,0.1)' }]}>
              <Text style={[styles.reportTag, { color: isMe ? colors.primaryForeground : colors.primary }]}>📸 Фотоотчет ({reportData.crit})</Text>
              {reportData.desc ? <Text style={[styles.messageText, { color: isMe ? colors.primaryForeground : colors.cardForeground }]}>{reportData.desc}</Text> : null}
            </View>
          ) : (
            <Text style={[styles.messageText, { color: isMe ? colors.primaryForeground : colors.cardForeground }]}>{item.content}</Text>
          )}
          
          <Text style={[styles.timeText, { color: isMe ? 'rgba(255,255,255,0.7)' : colors.muted }]}>
            {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={colors.foreground} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>{channelName}</Text>
          <View style={{ width: 40 }} />
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView} 
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
        >
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ flex: 1, justifyContent: 'center' }} />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={item => item.id}
              renderItem={renderMessage}
              contentContainerStyle={styles.list}
            />
          )}

          <View style={[styles.inputContainer, { backgroundColor: colors.card, borderTopColor: colors.border, paddingBottom: Platform.OS === 'ios' ? 32 : 16 }]}>
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border }]}
              placeholder="Сообщение..."
              placeholderTextColor={colors.muted}
              value={inputText}
              onChangeText={setInputText}
              multiline
            />
            <Pressable 
              style={[styles.sendBtn, { backgroundColor: colors.primary }, (!inputText.trim() || sending) && styles.sendBtnDisabled]} 
              onPress={sendMessage}
              disabled={!inputText.trim() || sending}
            >
              <Send color={colors.primaryForeground} size={20} />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  keyboardView: { flex: 1 },
  list: { padding: 16, paddingBottom: 24 },
  messageRow: { flexDirection: 'row', marginBottom: 16, alignItems: 'flex-end' },
  messageRowMe: { justifyContent: 'flex-end' },
  messageRowThem: { justifyContent: 'flex-start' },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', marginRight: 8 },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 14 },
  bubble: { maxWidth: '75%', padding: 12, borderRadius: 20 },
  bubbleMe: { borderBottomRightRadius: 4 },
  bubbleThem: { borderBottomLeftRadius: 4 },
  authorName: { fontFamily: 'Inter_600SemiBold', fontSize: 12, marginBottom: 4 },
  messageText: { fontFamily: 'Inter_400Regular', fontSize: 16, lineHeight: 22 },
  timeText: { fontFamily: 'Inter_400Regular', fontSize: 10, alignSelf: 'flex-end', marginTop: 4 },
  reportContainer: { padding: 8, borderRadius: 8, marginTop: 4 },
  reportTag: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginBottom: 4 },
  inputContainer: { flexDirection: 'row', alignItems: 'center', padding: 16, borderTopWidth: 1 },
  input: { flex: 1, borderRadius: 20, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, fontSize: 16, maxHeight: 100, minHeight: 40, fontFamily: 'Inter_400Regular', borderWidth: 1 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginLeft: 12 },
  sendBtnDisabled: { opacity: 0.5 }
});
