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

  const buttonStyle = [
    styles.buttonBase,
    type === 'primary' ? { backgroundColor: colors.primary } : { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.border },
    disabled && styles.buttonDisabled,
  ];

  const textStyle = [
    styles.buttonTextBase,
    type === 'primary' ? { color: colors.primaryForeground } : { color: colors.foreground },
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
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.authContainer}>
          <View style={styles.logoContainer}>
            <Text style={[styles.logo, { color: colors.foreground }]}>DMAG<Text style={{ color: colors.primary }}>.</Text></Text>
            <Text style={[styles.subtitle, { color: colors.muted }]}>Мобильное приложение</Text>
          </View>
          
          <View style={[styles.glassCard, { backgroundColor: 'rgba(255, 255, 255, 0.02)', borderColor: colors.border }]}>
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.foreground }]}>Email</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }]}
                onChangeText={setEmail}
                value={email}
                placeholder="your@email.com"
                placeholderTextColor={colors.muted}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
            
            <View style={styles.inputGroupBottom}>
              <Text style={[styles.label, { color: colors.foreground }]}>Пароль</Text>
              <TextInput
                style={[styles.input, { backgroundColor: colors.card, color: colors.cardForeground, borderColor: colors.border }]}
                onChangeText={setPassword}
                value={password}
                secureTextEntry
                placeholder="********"
                placeholderTextColor={colors.muted}
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
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  authContainer: { flex: 1, justifyContent: 'center', padding: 24 },
  logoContainer: { alignItems: 'center', marginBottom: 40 },
  logo: { fontFamily: 'Inter_700Bold', fontSize: 48, letterSpacing: -2 },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 8 },
  glassCard: { borderRadius: 24, padding: 24, borderWidth: 1 },
  inputGroup: { marginBottom: 20 },
  inputGroupBottom: { marginBottom: 32 },
  label: { fontFamily: 'Inter_500Medium', marginBottom: 8, fontSize: 14, paddingLeft: 4 },
  input: { fontFamily: 'Inter_400Regular', borderRadius: 16, paddingHorizontal: 20, paddingVertical: 16, fontSize: 16, borderWidth: 1 },
  buttonGroup: { gap: 16 },
  buttonBase: { borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  buttonDisabled: { opacity: 0.5 },
  buttonTextBase: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
});
