import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator, StyleSheet } from 'react-native';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      {session && session.user ? <Dashboard key={session.user.id} session={session} /> : <Auth />}
    </SafeAreaView>
  );
}

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    else Alert.alert('Проверьте почту для подтверждения регистрации!');
    setLoading(false);
  }

  return (
    <View style={styles.authContainer}>
      <Text style={styles.logo}>
        DMAG<Text style={styles.logoDot}>.</Text>
      </Text>
      
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="your@email.com"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      
      <View style={styles.inputGroupBottom}>
        <Text style={styles.label}>Password</Text>
        <TextInput
          style={styles.input}
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
          placeholder="********"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
        />
      </View>
      
      <View style={styles.buttonGroup}>
        <TouchableOpacity 
          style={styles.primaryButton}
          disabled={loading} 
          onPress={signInWithEmail}
        >
          <Text style={styles.primaryButtonText}>Войти</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.secondaryButton}
          disabled={loading} 
          onPress={signUpWithEmail}
        >
          <Text style={styles.secondaryButtonText}>Регистрация</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Dashboard({ session }: { session: Session }) {
  return (
    <View style={styles.dashContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Дашборд</Text>
        <TouchableOpacity 
          style={styles.logoutButton}
          onPress={() => supabase.auth.signOut()}
        >
          <Text style={styles.logoutButtonText}>Выйти</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
         <Text style={styles.cardLabel}>Вы вошли как:</Text>
         <Text style={styles.cardValue}>{session.user.email}</Text>
      </View>
      
      <View style={styles.infoCard}>
         <Text style={styles.infoText}>
            Это независимое нативное мобильное приложение с доступом в интернет.
         </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  center: { alignItems: 'center', justifyContent: 'center' },
  authContainer: { flex: 1, justifyContent: 'center', padding: 32, backgroundColor: '#111827' },
  logo: { fontSize: 36, fontWeight: 'bold', color: '#ffffff', marginBottom: 32, textAlign: 'center', letterSpacing: -1 },
  logoDot: { color: '#4ade80' },
  inputGroup: { marginBottom: 16 },
  inputGroupBottom: { marginBottom: 32 },
  label: { color: '#9ca3af', marginBottom: 8, fontWeight: '500' },
  input: { backgroundColor: '#1f2937', color: '#ffffff', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: '#374151' },
  buttonGroup: { gap: 16 },
  primaryButton: { backgroundColor: '#22c55e', borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 16 },
  primaryButtonText: { color: '#111827', fontWeight: 'bold', fontSize: 18 },
  secondaryButton: { backgroundColor: '#1f2937', borderWidth: 1, borderColor: '#374151', borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  secondaryButtonText: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  dashContainer: { flex: 1, padding: 32, backgroundColor: '#111827', paddingTop: 64 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 },
  headerText: { fontSize: 24, fontWeight: 'bold', color: '#ffffff' },
  logoutButton: { backgroundColor: '#1f2937', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#374151' },
  logoutButtonText: { color: '#f87171', fontWeight: '500' },
  card: { backgroundColor: '#1f2937', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  cardLabel: { color: '#9ca3af', marginBottom: 8 },
  cardValue: { color: '#ffffff', fontWeight: 'bold', fontSize: 18 },
  infoCard: { marginTop: 32, backgroundColor: 'rgba(34, 197, 94, 0.1)', padding: 24, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(34, 197, 94, 0.2)' },
  infoText: { color: '#4ade80', fontWeight: '500', textAlign: 'center' }
});
