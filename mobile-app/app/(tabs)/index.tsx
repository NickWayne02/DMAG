import React, { useEffect, useState, useRef } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../src/lib/supabase';
import { format } from 'date-fns';
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
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        
        <View style={[styles.glassCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardLabel, { color: colors.muted }]}>Сотрудник</Text>
          <Text style={[styles.cardValue, { color: colors.foreground }]}>{session?.user.email}</Text>
        </View>

        <View style={[styles.glassCard, { marginTop: 16, alignItems: 'center', backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.timerTitle, { color: colors.muted }]}>
            {status === 'idle' ? 'Смена не начата' : status === 'working' ? 'Работа идёт' : 'Обед'}
          </Text>
          
          <Text style={[styles.timer, { color: colors.foreground }, status === 'working' && { color: colors.primary }, status === 'lunch' && { color: '#f59e0b' }]}>
            {formatHMS(shiftDuration)}
          </Text>
          
          {(totalLunch > 0 || status === 'lunch') && (
            <Text style={[styles.lunchTimer, { color: colors.muted }]}>Обед: {formatHMS(totalLunch)}</Text>
          )}

          <View style={styles.buttonRow}>
            {status === 'idle' && (
              <ScaleButton style={[styles.actionButton, { backgroundColor: colors.primary }]} onPress={handleStartShift} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color={colors.primaryForeground} /> : <PlayCircle color={colors.primaryForeground} size={24} />}
                <Text style={[styles.actionText, { color: colors.primaryForeground }]}>Начать смену</Text>
              </ScaleButton>
            )}

            {status === 'working' && (
              <ScaleButton style={[styles.actionButton, { backgroundColor: '#f59e0b' }]} onPress={handleStartLunch} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <Pause color="#fff" size={24} />}
                <Text style={[styles.actionText, { color: '#fff' }]}>Начать обед</Text>
              </ScaleButton>
            )}

            {status === 'lunch' && (
              <ScaleButton style={[styles.actionButton, { backgroundColor: '#3b82f6' }]} onPress={handleEndLunch} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <PlayCircle color="#fff" size={24} />}
                <Text style={[styles.actionText, { color: '#fff' }]}>Продолжить</Text>
              </ScaleButton>
            )}
            
            {(status === 'working' || status === 'lunch') && (
              <ScaleButton style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.8)' }]} onPress={handleEndShift} disabled={actionLoading}>
                {actionLoading ? <ActivityIndicator color="#fff" /> : <CheckCircle2 color="#fff" size={24} />}
                <Text style={[styles.actionText, { color: '#fff' }]}>Завершить</Text>
              </ScaleButton>
            )}
          </View>
        </View>

        {(status === 'working' || status === 'lunch') && (
          <ScaleButton 
            style={[styles.glassCard, styles.reportCard, { backgroundColor: 'rgba(16, 185, 129, 0.1)', borderColor: 'rgba(16, 185, 129, 0.2)' }]} 
            onPress={() => router.push('/photo-report')}
          >
            <Camera color="#10b981" size={32} />
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.reportTitle, { color: '#10b981' }]}>Отправить фотоотчет</Text>
              <Text style={[styles.reportSub, { color: colors.muted }]}>Зафиксируйте текущий прогресс</Text>
            </View>
          </ScaleButton>
        )}

        <ScaleButton 
          style={[styles.glassCard, styles.reportCard, { backgroundColor: 'rgba(59, 130, 246, 0.1)', borderColor: 'rgba(59, 130, 246, 0.2)' }]} 
          onPress={() => router.push('/calendar')}
        >
          <View style={{ width: 32, height: 32, backgroundColor: '#3b82f6', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
            <CalendarClock color="#fff" size={20} />
          </View>
          <View style={{ marginLeft: 16 }}>
            <Text style={[styles.reportTitle, { color: '#3b82f6' }]}>Мои смены</Text>
            <Text style={[styles.reportSub, { color: colors.muted }]}>График и история работы</Text>
          </View>
        </ScaleButton>

        {(role === 'admin' || role === 'super_admin') && (
          <ScaleButton 
            style={[styles.glassCard, styles.reportCard, { backgroundColor: 'rgba(139, 92, 246, 0.1)', borderColor: 'rgba(139, 92, 246, 0.2)', marginTop: 16 }]} 
            onPress={() => router.push('/(admin)')}
          >
            <View style={{ width: 32, height: 32, backgroundColor: '#8b5cf6', borderRadius: 8, alignItems: 'center', justifyContent: 'center' }}>
              <Shield color="#fff" size={20} />
            </View>
            <View style={{ marginLeft: 16 }}>
              <Text style={[styles.reportTitle, { color: '#8b5cf6' }]}>Админ-панель</Text>
              <Text style={[styles.reportSub, { color: colors.muted }]}>Управление и мониторинг</Text>
            </View>
          </ScaleButton>
        )}

      </ScrollView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1 },
  scroll: { padding: 24, paddingBottom: 64 },
  glassCard: { borderRadius: 24, padding: 24, borderWidth: 1 },
  cardLabel: { fontFamily: 'Inter_400Regular', marginBottom: 4, fontSize: 14 },
  cardValue: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  timerTitle: { fontFamily: 'Inter_500Medium', fontSize: 18, marginBottom: 8 },
  timer: { fontFamily: 'Inter_700Bold', fontSize: 48, fontVariant: ['tabular-nums'] },
  lunchTimer: { fontFamily: 'Inter_400Regular', fontSize: 16, marginTop: 4 },
  buttonRow: { flexDirection: 'row', gap: 12, marginTop: 32, width: '100%', justifyContent: 'center' },
  actionButton: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8 },
  actionText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 },
  reportCard: { marginTop: 16, flexDirection: 'row', alignItems: 'center', padding: 20 },
  reportTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  reportSub: { fontFamily: 'Inter_400Regular', fontSize: 14, marginTop: 2 }
});
