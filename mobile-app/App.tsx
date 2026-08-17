import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, Alert, SafeAreaView, ActivityIndicator, StyleSheet, Animated } from 'react-native';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useFonts, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleButton({ onPress, text, type = 'primary', disabled = false }: { onPress: () => void, text: string, type?: 'primary' | 'secondary' | 'danger', disabled?: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      useNativeDriver: true,
      speed: 20,
    }).start();
  };

  const buttonStyle = [
    styles.buttonBase,
    type === 'primary' && styles.buttonPrimary,
    type === 'secondary' && styles.buttonSecondary,
    type === 'danger' && styles.buttonDanger,
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonTextBase,
    type === 'primary' && styles.buttonTextPrimary,
    type === 'secondary' && styles.buttonTextSecondary,
    type === 'danger' && styles.buttonTextDanger,
  ];

  return (
    <AnimatedPressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      style={[buttonStyle, { transform: [{ scale: scaleAnim }] }]}
    >
      <Text style={textStyle}>{text}</Text>
    </AnimatedPressable>
  );
}

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

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

  if (!fontsLoaded || loading) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color="#10b981" />
      </View>
    );
  }

  return (
    <LinearGradient colors={['#0f172a', '#064e3b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar style="light" />
        {session && session.user ? <Dashboard key={session.user.id} session={session} /> : <Auth />}
      </SafeAreaView>
    </LinearGradient>
  );
}

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) Alert.alert('Ошибка', error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) Alert.alert('Ошибка', error.message);
    else Alert.alert('Успех', 'Проверьте почту для подтверждения регистрации!');
    setLoading(false);
  }

  return (
    <View style={styles.authContainer}>
      <View style={styles.logoContainer}>
        <Text style={styles.logo}>
          DMAG<Text style={styles.logoDot}>.</Text>
        </Text>
        <Text style={styles.subtitle}>Добро пожаловать</Text>
      </View>
      
      <View style={styles.glassCard}>
        <View style={styles.inputGroup}>
          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            onChangeText={setEmail}
            value={email}
            placeholder="your@email.com"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>
        
        <View style={styles.inputGroupBottom}>
          <Text style={styles.label}>Пароль</Text>
          <TextInput
            style={styles.input}
            onChangeText={setPassword}
            value={password}
            secureTextEntry
            placeholder="********"
            placeholderTextColor="#64748b"
            autoCapitalize="none"
          />
        </View>
        
        <View style={styles.buttonGroup}>
          <ScaleButton onPress={signInWithEmail} text="Войти" disabled={loading} />
          <ScaleButton onPress={signUpWithEmail} text="Регистрация" type="secondary" disabled={loading} />
        </View>
      </View>
    </View>
  );
}

function Dashboard({ session }: { session: Session }) {
  return (
    <View style={styles.dashContainer}>
      <View style={styles.header}>
        <Text style={styles.headerText}>Дашборд</Text>
        <ScaleButton onPress={() => supabase.auth.signOut()} text="Выйти" type="danger" />
      </View>

      <View style={styles.glassCard}>
         <Text style={styles.cardLabel}>Вы вошли как:</Text>
         <Text style={styles.cardValue}>{session.user.email}</Text>
      </View>
      
      <View style={[styles.glassCard, styles.infoCard]}>
         <Text style={styles.infoText}>
            Это независимое нативное мобильное приложение с доступом в интернет.
         </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a' },
  safeArea: { flex: 1 },
  center: { alignItems: 'center', justifyContent: 'center' },
  authContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { fontFamily: 'Inter_700Bold', fontSize: 48, color: '#ffffff', letterSpacing: -2 },
  logoDot: { color: '#10b981' },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, color: '#94a3b8', marginTop: 8 },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  inputGroup: { marginBottom: 20 },
  inputGroupBottom: { marginBottom: 32 },
  label: { fontFamily: 'Inter_500Medium', color: '#cbd5e1', marginBottom: 8, fontSize: 14, paddingLeft: 4 },
  input: {
    fontFamily: 'Inter_400Regular',
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
    color: '#ffffff',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  buttonGroup: { gap: 16 },
  buttonBase: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  buttonPrimary: { backgroundColor: '#10b981' },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  buttonDanger: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.2)', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonTextBase: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  buttonTextPrimary: { color: '#064e3b' },
  buttonTextSecondary: { color: '#ffffff' },
  buttonTextDanger: { color: '#fca5a5', fontSize: 14 },
  dashContainer: { flex: 1, padding: 24, paddingTop: 48 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 40 },
  headerText: { fontFamily: 'Inter_700Bold', fontSize: 32, color: '#ffffff', letterSpacing: -1 },
  cardLabel: { fontFamily: 'Inter_400Regular', color: '#94a3b8', marginBottom: 8, fontSize: 14 },
  cardValue: { fontFamily: 'Inter_600SemiBold', color: '#ffffff', fontSize: 18 },
  infoCard: { marginTop: 24, backgroundColor: 'rgba(16, 185, 129, 0.05)', borderColor: 'rgba(16, 185, 129, 0.2)' },
  infoText: { fontFamily: 'Inter_500Medium', color: '#34d399', fontSize: 15, lineHeight: 22, textAlign: 'center' }
});
