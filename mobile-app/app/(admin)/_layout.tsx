import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../../src/context/ThemeContext';

export default function AdminLayout() {
  const { colors, settings } = useTheme();

  return (
    <>
      <StatusBar style={settings.mode === 'light' ? 'dark' : 'light'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.card },
          headerTintColor: colors.foreground,
          headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Админ-панель' }} />
        <Stack.Screen name="monitoring" options={{ title: 'Мониторинг смен' }} />
        <Stack.Screen name="reports" options={{ title: 'Лента отчетов' }} />
        <Stack.Screen name="users" options={{ title: 'Сотрудники' }} />
        <Stack.Screen name="create-user" options={{ title: 'Новый сотрудник', presentation: 'modal' }} />
        <Stack.Screen name="sites" options={{ title: 'Объекты' }} />
      </Stack>
    </>
  );
}
