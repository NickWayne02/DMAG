import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabaseAdmin } from '../../src/lib/supabaseAdmin';
import { useTheme } from '../../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserPlus } from 'lucide-react-native';

export default function CreateUserScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('employee');
  const [loading, setLoading] = useState(false);

  async function handleCreateUser() {
    if (!email || !password || !name) {
      Alert.alert('Ошибка', 'Заполните все поля');
      return;
    }
    
    setLoading(true);
    try {
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Пользователь не создан');

      await supabaseAdmin.from('user_roles').delete().eq('user_id', data.user.id);
      const { error: roleError } = await supabaseAdmin.from('user_roles').insert({
        user_id: data.user.id,
        role
      });

      if (roleError) throw roleError;

      Alert.alert('Успех', 'Сотрудник успешно создан', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color={colors.foreground} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Новый сотрудник</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={[styles.warningBox, { backgroundColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)' }]}>
            <Text style={styles.warningText}>
              Внимание: Данная функция использует сервисный ключ. В production-версии это должно работать через защищенный бэкенд.
            </Text>
          </View>

          <Text style={[styles.label, { color: colors.foreground }]}>ФИО</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
            placeholder="Иванов Иван Иванович"
            placeholderTextColor={colors.muted}
            value={name}
            onChangeText={setName}
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Email (Логин)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
            placeholder="ivan@example.com"
            placeholderTextColor={colors.muted}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Пароль</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
            placeholder="Минимум 6 символов"
            placeholderTextColor={colors.muted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={[styles.label, { color: colors.foreground }]}>Роль</Text>
          <View style={styles.roleContainer}>
            {['employee', 'brigadier', 'admin'].map(r => (
              <Pressable 
                key={r}
                style={[styles.roleBtn, { backgroundColor: colors.card, borderColor: colors.border, borderWidth: 1 }, role === r && { backgroundColor: `${colors.primary}33`, borderColor: colors.primary }]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, { color: colors.muted }, role === r && { color: colors.primary }]}>
                  {r === 'employee' ? 'Сотрудник' : r === 'brigadier' ? 'Бригадир' : 'Админ'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable 
            style={[styles.submitBtn, { backgroundColor: colors.primary }, loading && styles.submitDisabled]} 
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
              <>
                <UserPlus color={colors.primaryForeground} size={20} />
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Создать аккаунт</Text>
              </>
            )}
          </Pressable>
        </ScrollView>
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
  content: { padding: 24 },
  warningBox: { padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1 },
  warningText: { color: '#f87171', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  label: { fontFamily: 'Inter_500Medium', marginBottom: 8, fontSize: 14 },
  input: { borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  roleContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 12, alignItems: 'center' },
  roleText: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 }
});
