import React, { useState, useRef } from 'react';
import { View, Text, TextInput, Pressable, Alert, StyleSheet, Animated } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../../src/context/ThemeContext';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleButton({ onPress, text, type = 'primary', disabled = false, colors }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true, speed: 20 }).start();
  const handlePressOut = () => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }).start();

  const isPrimary = type === 'primary';
  const buttonStyle = [
    styles.buttonBase,
    isPrimary ? { backgroundColor: colors.primary, shadowColor: colors.neonCyan, shadowOffset: { width: 0, height: 0 }, shadowOpacity: 0.8, shadowRadius: 15, elevation: 10 } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonTextBase,
    isPrimary ? { color: '#000000' } : { color: colors.foreground },
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
  const { colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authContainer}>
          <View style={styles.logoContainer}>
            <Text style={[styles.logo, { color: colors.foreground }]}>DMAG<Text style={{ color: colors.primary, textShadowColor: colors.neonCyan, textShadowOffset: {width: 0, height: 0}, textShadowRadius: 15 }}>.</Text></Text>
            <Text style={[styles.subtitle, { color: 'rgba(255,255,255,0.7)' }]}>Мобильное приложение</Text>
          </View>
          
          <View style={[styles.glassCard, { backgroundColor: '#0a0a0a', borderColor: 'rgba(255, 255, 255, 0.1)' }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#000000', color: '#ffffff', borderColor: 'rgba(255,255,255,0.1)' }]}
                onChangeText={setEmail}
                value={email}
                placeholder="your@email.com"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputGroupBottom}>
              <Text style={[styles.label, { color: 'rgba(255,255,255,0.7)' }]}>Пароль</Text>
              <TextInput
                style={[styles.input, { backgroundColor: '#000000', color: '#ffffff', borderColor: 'rgba(255,255,255,0.1)' }]}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                placeholder="********"
                placeholderTextColor="rgba(255,255,255,0.4)"
                autoCapitalize="none"
              />
            </View>
            
            <View style={styles.buttonGroup}>
              <ScaleButton onPress={signInWithEmail} text="Войти" disabled={loading} colors={colors} />
              <ScaleButton onPress={signUpWithEmail} text="Регистрация" type="secondary" disabled={loading} colors={colors} />
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  authContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 48 },
  logo: { fontFamily: 'Inter_700Bold', fontSize: 56, letterSpacing: -2 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 8, textTransform: 'uppercase', letterSpacing: 2, fontSize: 10 },
  glassCard: { borderRadius: 32, padding: 32, borderWidth: 1 },
  inputGroup: { marginBottom: 24 },
  inputGroupBottom: { marginBottom: 40 },
  label: { fontFamily: 'Inter_500Medium', marginBottom: 10, fontSize: 14, paddingLeft: 4, textTransform: 'uppercase', letterSpacing: 1, fontSize: 10 },
  input: { fontFamily: 'Inter_400Regular', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 18, fontSize: 16, borderWidth: 1 },
  buttonGroup: { gap: 16 },
  buttonBase: { borderRadius: 16, paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonTextBase: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
