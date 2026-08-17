import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, Animated } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleButton({ onPress, text, type = 'primary', disabled = false }: { onPress: () => void, text: string, type?: 'primary' | 'secondary', disabled?: boolean }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();
  };

  const buttonStyle = [
    styles.buttonBase,
    type === 'primary' ? styles.buttonPrimary : styles.buttonSecondary,
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonTextBase,
    type === 'primary' ? styles.buttonTextPrimary : styles.buttonTextSecondary,
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

export default function LoginScreen() {
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
    <LinearGradient colors={['#0f172a', '#064e3b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authContainer}>
          <View style={styles.logoContainer}>
            <Text style={styles.logo}>DMAG<Text style={styles.logoDot}>.</Text></Text>
            <Text style={styles.subtitle}>Мобильное приложение</Text>
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
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
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
  buttonBase: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonPrimary: { backgroundColor: '#10b981' },
  buttonSecondary: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.15)' },
  buttonDisabled: { opacity: 0.5 },
  buttonTextBase: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  buttonTextPrimary: { color: '#064e3b' },
  buttonTextSecondary: { color: '#ffffff' },
});
