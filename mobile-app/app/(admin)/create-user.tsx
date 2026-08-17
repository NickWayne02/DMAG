import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, Pressable, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabaseAdmin } from '../../src/lib/supabaseAdmin';
import { useRouter } from 'expo-router';
import { ArrowLeft, UserPlus } from 'lucide-react-native';

export default function CreateUserScreen() {
  const router = useRouter();
  
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
      // 1. Create user in Supabase Auth
      const { data, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: name }
      });

      if (error) throw error;
      if (!data.user) throw new Error('Пользователь не создан');

      // 2. Set Role
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
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <ArrowLeft color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Новый сотрудник</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.warningBox}>
            <Text style={styles.warningText}>
              Внимание: Данная функция использует сервисный ключ. В production-версии это должно работать через защищенный бэкенд.
            </Text>
          </View>

          <Text style={styles.label}>ФИО</Text>
          <TextInput
            style={styles.input}
            placeholder="Иванов Иван Иванович"
            placeholderTextColor="#64748b"
            value={name}
            onChangeText={setName}
          />

          <Text style={styles.label}>Email (Логин)</Text>
          <TextInput
            style={styles.input}
            placeholder="ivan@example.com"
            placeholderTextColor="#64748b"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            placeholder="Минимум 6 символов"
            placeholderTextColor="#64748b"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
          />

          <Text style={styles.label}>Роль</Text>
          <View style={styles.roleContainer}>
            {['employee', 'brigadier', 'admin'].map(r => (
              <Pressable 
                key={r}
                style={[styles.roleBtn, role === r && styles.roleBtnActive]}
                onPress={() => setRole(r)}
              >
                <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                  {r === 'employee' ? 'Сотрудник' : r === 'brigadier' ? 'Бригадир' : 'Админ'}
                </Text>
              </Pressable>
            ))}
          </View>

          <Pressable 
            style={[styles.submitBtn, loading && styles.submitDisabled]} 
            onPress={handleCreateUser}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : (
              <>
                <UserPlus color="#fff" size={20} />
                <Text style={styles.submitText}>Создать аккаунт</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  backBtn: { padding: 8 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 18 },
  content: { padding: 24 },
  warningBox: { backgroundColor: 'rgba(239,68,68,0.1)', padding: 16, borderRadius: 12, marginBottom: 24, borderWidth: 1, borderColor: 'rgba(239,68,68,0.2)' },
  warningText: { color: '#f87171', fontFamily: 'Inter_400Regular', fontSize: 12, lineHeight: 18 },
  label: { fontFamily: 'Inter_500Medium', color: '#cbd5e1', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 20, fontFamily: 'Inter_400Regular' },
  roleContainer: { flexDirection: 'row', gap: 8, marginBottom: 32 },
  roleBtn: { flex: 1, padding: 12, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', alignItems: 'center' },
  roleBtnActive: { backgroundColor: 'rgba(139,92,246,0.2)', borderWidth: 1, borderColor: '#8b5cf6' },
  roleText: { fontFamily: 'Inter_500Medium', color: '#94a3b8', fontSize: 14 },
  roleTextActive: { color: '#8b5cf6' },
  submitBtn: { backgroundColor: '#8b5cf6', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12, gap: 8 },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 16 }
});
