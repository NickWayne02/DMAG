import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { useTheme } from '../../src/context/ThemeContext';
import { View, Text, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { session } = useAuth();
  const { colors, settings } = useTheme();

  if (!session) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.foreground }]}>Пожалуйста, авторизуйтесь</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.card, borderBottomWidth: 1, borderBottomColor: colors.border },
        headerTintColor: colors.foreground,
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        tabBarStyle: { 
          backgroundColor: settings.mode === 'neon' ? '#000' : colors.card, 
          borderTopColor: colors.border 
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: 'Inter_500Medium' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Дашборд',
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Чат',
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Настройки',
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter_400Regular',
  },
});
