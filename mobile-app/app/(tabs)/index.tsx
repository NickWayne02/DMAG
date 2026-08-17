import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/lib/supabase';
import { format } from 'date-fns';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlayCircle, Pause, CheckCircle2, Loader2, Camera, CalendarClock, Shield } from 'lucide-react-native';
import { useRouter } from 'expo-router';

type ShiftStatus = 'idle' | 'working' | 'lunch' | 'finished';

type PersistedShift = {
  status: ShiftStatus;
  shiftStart: number | null;
  shiftEnd: number | null;
  lunchStart: number | null;
  lunchAccumMs: number;
  shiftId: string | null;
};

const SHIFT_STORAGE_KEY = 'dmag.mobile.shift';

function formatHMS(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

function ScaleButton({ onPress, children, style, disabled }: any) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  return (
    <AnimatedPressable
      onPress={onPress}
      disabled={disabled}
      onPressIn={() => Animated.spring(scaleAnim, { toValue: 0.95, useNativeDriver: true }).start()}
      onPressOut={() => Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true }).start()}
      style={[style, { transform: [{ scale: scaleAnim }], opacity: disabled ? 0.6 : 1 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

export default function DashboardScreen() {
  const { session, role } = useAuth();
  const { colors, settings } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  const [status, setStatus] = useState<ShiftStatus>('idle');
  const [shiftStart, setShiftStart] = useState<number | null>(null);
  const [lunchStart, setLunchStart] = useState<number | null>(null);
  const [lunchAccumMs, setLunchAccumMs] = useState(0);
  const [shiftId, setShiftId] = useState<string | null>(null);
  
  const [now, setNow] = useState(Date.now());
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(SHIFT_STORAGE_KEY).then(raw => {
      if (raw) {
        const p: PersistedShift = JSON.parse(raw);
        if (p.status !== 'finished') {
          setStatus(p.status);
          setShiftStart(p.shiftStart);
          setLunchStart(p.lunchStart);
          setLunchAccumMs(p.lunchAccumMs);
          setShiftId(p.shiftId);
        }
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (status === 'idle' || status === 'finished') return;
    const p: PersistedShift = { status, shiftStart, shiftEnd: null, lunchStart, lunchAccumMs, shiftId };
    AsyncStorage.setItem(SHIFT_STORAGE_KEY, JSON.stringify(p));
  }, [status, shiftStart, lunchStart, lunchAccumMs, shiftId]);

  useEffect(() => {
    if (status === 'working' || status === 'lunch') {
      const id = setInterval(() => setNow(Date.now()), 1000);
      return () => clearInterval(id);
    }
  }, [status]);

  async function getLocation() {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Без доступа к геопозиции начать смену нельзя.');
      return null;
    }
    const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
    return loc.coords;
  }

  async function handleStartShift() {
    setActionLoading(true);
    const coords = await getLocation();
    if (!coords) { setActionLoading(false); return; }

    const { data, error } = await supabase.from('shifts').insert({
      user_id: session?.user.id,
      status: 'working',
      started_at: new Date().toISOString(),
      start_lat: coords.latitude,
      start_lon: coords.longitude,
      site_name: 'Mobile Site' // Placeholder
    }).select('id').single();

    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      setShiftId(data.id);
      setShiftStart(Date.now());
      setStatus('working');
    }
    setActionLoading(false);
  }

  async function handleStartLunch() {
    setActionLoading(true);
    const { error } = await supabase.from('shifts').update({
      status: 'lunch',
      lunch_started_at: new Date().toISOString()
    }).eq('id', shiftId);

    if (!error) {
      setLunchStart(Date.now());
      setStatus('lunch');
    }
    setActionLoading(false);
  }

  async function handleEndLunch() {
    setActionLoading(true);
    const addedLunch = Date.now() - (lunchStart || Date.now());
    const newAccum = lunchAccumMs + addedLunch;
    
    const { error } = await supabase.from('shifts').update({
      status: 'working',
      lunch_total_ms: newAccum
    }).eq('id', shiftId);

    if (!error) {
      setLunchAccumMs(newAccum);
      setLunchStart(null);
      setStatus('working');
    }
    setActionLoading(false);
  }

  async function handleEndShift() {
    setActionLoading(true);
    const coords = await getLocation();
    
    const finalLunchAccum = status === 'lunch' ? lunchAccumMs + (Date.now() - (lunchStart || Date.now())) : lunchAccumMs;

    const { error } = await supabase.from('shifts').update({
      status: 'finished',
      ended_at: new Date().toISOString(),
      lunch_total_ms: finalLunchAccum,
      end_lat: coords?.latitude,
      end_lon: coords?.longitude
    }).eq('id', shiftId);

    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      setStatus('idle');
      setShiftStart(null);
      setLunchStart(null);
      setLunchAccumMs(0);
      setShiftId(null);
      AsyncStorage.removeItem(SHIFT_STORAGE_KEY);
      Alert.alert('Смена завершена', 'Отличная работа!');
    }
    setActionLoading(false);
  }

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const shiftDuration = shiftStart ? (now - shiftStart) - (status === 'lunch' ? (now - (lunchStart || now)) : 0) - lunchAccumMs : 0;
  const currentLunch = status === 'lunch' ? (now - (lunchStart || now)) : 0;
  const totalLunch = lunchAccumMs + currentLunch;

  return (
    <View style={[styles.container, { backgroundColor: '#000000' }]}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        {/* Neon Header Gradient */}
        <LinearGradient 
          colors={['#0a2351', '#0d47a1', '#42a5f5']} 
          style={[styles.headerGradient, { paddingTop: Math.max(insets.top, 24) }]}
        >
          <View style={styles.headerContent}>
            <View style={styles.avatarPlaceholder}>
              <Text style={styles.avatarText}>{session?.user.email?.substring(0,1).toUpperCase()}</Text>
            </View>
            <View>
              <Text style={[styles.roleText, { color: colors.neonCyan, textShadowColor: colors.neonCyan, textShadowOffset: { width: 0, height: 0 }, textShadowRadius: 10 }]}>Сотрудник</Text>
              <Text style={styles.emailText}>{session?.user.email}</Text>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.contentPadding}>
          {/* Main Control Deck */}
          <View style={[styles.neonCard, { borderColor: colors.border, backgroundColor: '#0a0a0a', marginTop: -40 }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
               <View style={[styles.statusDot, { backgroundColor: status === 'idle' ? 'rgba(255,255,255,0.4)' : status === 'working' ? colors.neonLime : colors.neonAmber, shadowColor: status === 'working' ? colors.neonLime : colors.neonAmber, shadowRadius: 10, shadowOpacity: 1, elevation: 5 }]} />
               <Text style={[styles.timerTitle, { color: 'rgba(255,255,255,0.7)' }]}>
                 {status === 'idle' ? 'СМЕНА НЕ НАЧАТА' : status === 'working' ? 'РАБОТА ИДЕТ' : 'ОБЕД'}
               </Text>
            </View>
            
            <Text style={[styles.timer, { color: '#ffffff', textShadowColor: status === 'working' ? colors.neonLime : 'transparent', textShadowRadius: status === 'working' ? 15 : 0 }]}>
              {formatHMS(shiftDuration)}
            </Text>
            
            {(totalLunch > 0 || status === 'lunch') && (
              <Text style={[styles.lunchTimer, { color: colors.neonAmber }]}>ОБЕД: {formatHMS(totalLunch)}</Text>
            )}

            <View style={styles.buttonRow}>
              {status === 'idle' && (
                <ScaleButton style={[styles.actionButton, { backgroundColor: colors.neonLime, shadowColor: colors.neonLime, shadowRadius: 15, shadowOpacity: 0.8, elevation: 10 }]} onPress={handleStartShift} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#000" /> : <PlayCircle color="#000" size={24} />}
                  <Text style={[styles.actionText, { color: '#000' }]}>Начать смену</Text>
                </ScaleButton>
              )}

              {status === 'working' && (
                <ScaleButton style={[styles.actionButton, { backgroundColor: colors.neonAmber, shadowColor: colors.neonAmber, shadowRadius: 15, shadowOpacity: 0.8, elevation: 10 }]} onPress={handleStartLunch} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#000" /> : <Pause color="#000" size={24} />}
                  <Text style={[styles.actionText, { color: '#000' }]}>Начать обед</Text>
                </ScaleButton>
              )}

              {status === 'lunch' && (
                <ScaleButton style={[styles.actionButton, { backgroundColor: colors.neonCyan, shadowColor: colors.neonCyan, shadowRadius: 15, shadowOpacity: 0.8, elevation: 10 }]} onPress={handleEndLunch} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color="#000" /> : <PlayCircle color="#000" size={24} />}
                  <Text style={[styles.actionText, { color: '#000' }]}>Продолжить</Text>
                </ScaleButton>
              )}
              
              {(status === 'working' || status === 'lunch') && (
                <ScaleButton style={[styles.actionButton, { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.neonRed }]} onPress={handleEndShift} disabled={actionLoading}>
                  {actionLoading ? <ActivityIndicator color={colors.neonRed} /> : <CheckCircle2 color={colors.neonRed} size={24} />}
                  <Text style={[styles.actionText, { color: colors.neonRed }]}>Завершить</Text>
                </ScaleButton>
              )}
            </View>
          </View>

          {/* Action Tiles */}
          {(status === 'working' || status === 'lunch') && (
            <ScaleButton 
              style={[styles.neonCard, styles.reportCard, { backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)' }]} 
              onPress={() => router.push('/photo-report')}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(16, 185, 129, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Camera color={colors.neonLime} size={24} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.reportTitle, { color: colors.neonLime }]}>Отправить фотоотчет</Text>
                <Text style={[styles.reportSub, { color: 'rgba(255,255,255,0.6)' }]}>Зафиксируйте текущий прогресс</Text>
              </View>
            </ScaleButton>
          )}

          <ScaleButton 
            style={[styles.neonCard, styles.reportCard, { backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)' }]} 
            onPress={() => router.push('/calendar')}
          >
            <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(59, 130, 246, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <CalendarClock color={colors.neonCyan} size={24} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.reportTitle, { color: colors.neonCyan }]}>Мои смены</Text>
              <Text style={[styles.reportSub, { color: 'rgba(255,255,255,0.6)' }]}>График и история работы</Text>
            </View>
          </ScaleButton>

          {(role === 'admin' || role === 'super_admin') && (
            <ScaleButton 
              style={[styles.neonCard, styles.reportCard, { backgroundColor: '#0a0a0a', borderColor: 'rgba(255,255,255,0.1)' }]} 
              onPress={() => router.push('/(admin)')}
            >
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(139, 92, 246, 0.1)', alignItems: 'center', justifyContent: 'center' }}>
                <Shield color={colors.neonViolet} size={24} />
              </View>
              <View style={{ marginLeft: 16 }}>
                <Text style={[styles.reportTitle, { color: colors.neonViolet }]}>Админ-панель</Text>
                <Text style={[styles.reportSub, { color: 'rgba(255,255,255,0.6)' }]}>Управление и мониторинг</Text>
              </View>
            </ScaleButton>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  scroll: { paddingBottom: 64 },
  headerGradient: { paddingHorizontal: 24, paddingBottom: 60, borderBottomLeftRadius: 32, borderBottomRightRadius: 32, shadowColor: '#0a2351', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 20, elevation: 10 },
  headerContent: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  avatarPlaceholder: { width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(255,255,255,0.1)', borderColor: 'rgba(255,255,255,0.3)', borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: 'Inter_700Bold', fontSize: 20, color: '#ffffff' },
  roleText: { fontFamily: 'Inter_700Bold', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  emailText: { fontFamily: 'Inter_600SemiBold', fontSize: 18, color: '#ffffff', marginTop: 2 },
  contentPadding: { paddingHorizontal: 20 },
  neonCard: { borderRadius: 24, padding: 24, borderWidth: 1 },
  statusDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  timerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase' },
  timer: { fontFamily: 'Inter_700Bold', fontSize: 56, fontVariant: ['tabular-nums'], letterSpacing: -1 },
  lunchTimer: { fontFamily: 'Inter_600SemiBold', fontSize: 14, marginTop: 8 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%', justifyContent: 'center' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 20, gap: 8 },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 15 },
  reportCard: { marginTop: 16, flexDirection: 'row', alignItems: 'center', padding: 20 },
  reportTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 16, marginBottom: 2 },
  reportSub: { fontFamily: 'Inter_400Regular', fontSize: 12 }
});
