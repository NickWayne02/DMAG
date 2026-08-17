import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ActivityIndicator, FlatList } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, LocaleConfig } from 'react-native-calendars';
import { X, Clock, MapPin } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { supabase } from '../src/lib/supabase';
import { format, parseISO } from 'date-fns';

LocaleConfig.locales['ru'] = {
  monthNames: ['Январь','Февраль','Март','Апрель','Май','Июнь','Июль','Август','Сентябрь','Октябрь','Ноябрь','Декабрь'],
  monthNamesShort: ['Янв','Фев','Мар','Апр','Май','Июн','Июл','Авг','Сен','Окт','Ноя','Дек'],
  dayNames: ['воскресенье','понедельник','вторник','среда','четверг','пятница','суббота'],
  dayNamesShort: ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'],
  today: 'Сегодня'
};
LocaleConfig.defaultLocale = 'ru';

type ShiftEvent = {
  id: string;
  date: string;
  start: string;
  end: string;
  siteName: string;
  status: string;
  lunchTotal: number;
};

export default function CalendarScreen() {
  const router = useRouter();
  const { session } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [shifts, setShifts] = useState<ShiftEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  useEffect(() => {
    async function loadShifts() {
      if (!session) return;
      
      const { data, error } = await supabase
        .from('shifts')
        .select('id, site_name, status, started_at, ended_at, lunch_total_ms')
        .eq('user_id', session.user.id)
        .order('started_at', { ascending: false })
        .limit(50);
        
      if (data && !error) {
        const parsed = data.map((s: any) => ({
          id: s.id,
          date: s.started_at ? format(parseISO(s.started_at), 'yyyy-MM-dd') : '',
          start: s.started_at ? format(parseISO(s.started_at), 'HH:mm') : '--:--',
          end: s.ended_at ? format(parseISO(s.ended_at), 'HH:mm') : '--:--',
          siteName: s.site_name || 'Неизвестный объект',
          status: s.status,
          lunchTotal: s.lunch_total_ms || 0
        })).filter((s) => s.date !== '');
        setShifts(parsed);
      }
      setLoading(false);
    }
    loadShifts();
  }, [session]);

  const markedDates = shifts.reduce((acc: any, shift) => {
    acc[shift.date] = { 
      marked: true, 
      dotColor: shift.status === 'working' ? '#10b981' : (shift.status === 'lunch' ? '#f59e0b' : '#3b82f6') 
    };
    return acc;
  }, {});
  
  // Highlight selected date
  markedDates[selectedDate] = { 
    ...markedDates[selectedDate], 
    selected: true, 
    selectedColor: 'rgba(255,255,255,0.2)' 
  };

  const selectedShifts = shifts.filter(s => s.date === selectedDate);

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Мои смены</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={{ flex: 1, justifyContent: 'center' }}>
            <ActivityIndicator size="large" color="#3b82f6" />
          </View>
        ) : (
          <>
            <Calendar
              current={selectedDate}
              onDayPress={(day: any) => setSelectedDate(day.dateString)}
              markedDates={markedDates}
              theme={{
                calendarBackground: 'transparent',
                textSectionTitleColor: '#94a3b8',
                selectedDayBackgroundColor: '#3b82f6',
                selectedDayTextColor: '#ffffff',
                todayTextColor: '#10b981',
                dayTextColor: '#e2e8f0',
                textDisabledColor: '#475569',
                dotColor: '#3b82f6',
                selectedDotColor: '#ffffff',
                arrowColor: '#fff',
                monthTextColor: '#fff',
                textDayFontFamily: 'Inter_400Regular',
                textMonthFontFamily: 'Inter_600SemiBold',
                textDayHeaderFontFamily: 'Inter_500Medium',
              }}
            />

            <View style={styles.listContainer}>
              <Text style={styles.listTitle}>
                {format(parseISO(selectedDate), 'dd.MM.yyyy')}
              </Text>
              
              {selectedShifts.length === 0 ? (
                <Text style={styles.emptyText}>Нет смен в этот день</Text>
              ) : (
                <FlatList
                  data={selectedShifts}
                  keyExtractor={item => item.id}
                  renderItem={({ item }) => (
                    <View style={styles.shiftCard}>
                      <View style={styles.shiftHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <MapPin color="#3b82f6" size={16} />
                          <Text style={styles.siteName}>{item.siteName}</Text>
                        </View>
                        <View style={[styles.statusBadge, item.status === 'working' ? styles.statusActive : (item.status === 'lunch' ? styles.statusWarning : styles.statusFinished)]}>
                          <Text style={styles.statusText}>
                            {item.status === 'working' ? 'Идет' : (item.status === 'lunch' ? 'Обед' : 'Завершена')}
                          </Text>
                        </View>
                      </View>
                      
                      <View style={styles.shiftTime}>
                        <Clock color="#94a3b8" size={16} />
                        <Text style={styles.timeText}>{item.start} — {item.end}</Text>
                      </View>
                    </View>
                  )}
                  contentContainerStyle={{ paddingBottom: 24 }}
                />
              )}
            </View>
          </>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.05)' },
  closeBtn: { padding: 8 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 18 },
  listContainer: { flex: 1, padding: 24 },
  listTitle: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 18, marginBottom: 16 },
  emptyText: { fontFamily: 'Inter_400Regular', color: '#64748b', fontSize: 14 },
  shiftCard: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  shiftHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  siteName: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 16 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
  statusActive: { backgroundColor: 'rgba(16,185,129,0.2)' },
  statusWarning: { backgroundColor: 'rgba(245,158,11,0.2)' },
  statusFinished: { backgroundColor: 'rgba(148,163,184,0.2)' },
  statusText: { fontFamily: 'Inter_500Medium', color: '#fff', fontSize: 12 },
  shiftTime: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeText: { fontFamily: 'Inter_400Regular', color: '#94a3b8', fontSize: 14 }
});
