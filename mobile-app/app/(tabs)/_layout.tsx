import { Tabs } from 'expo-router';
import { useAuth } from '../../src/context/AuthContext';
import { View, Text, StyleSheet } from 'react-native';

export default function TabLayout() {
  const { session } = useAuth();

  if (!session) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Пожалуйста, авторизуйтесь</Text>
      </View>
    );
  }

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontFamily: 'Inter_600SemiBold' },
        tabBarStyle: { backgroundColor: '#0f172a', borderTopColor: '#1e293b' },
        tabBarActiveTintColor: '#10b981',
        tabBarInactiveTintColor: '#64748b',
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
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: 'Inter_400Regular',
    color: '#fff',
  },
});
