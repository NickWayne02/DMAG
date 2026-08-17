import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function AdminLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
          headerBackTitleVisible: false,
          contentStyle: { backgroundColor: '#0f172a' }
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Админ-панель' }} />
        <Stack.Screen name="monitoring" options={{ title: 'Мониторинг смен' }} />
        <Stack.Screen name="reports" options={{ title: 'Лента отчетов' }} />
      </Stack>
    </>
  );
}
