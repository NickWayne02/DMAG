import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, Alert, SafeAreaView, ActivityIndicator } from 'react-native';
import { supabase } from './src/lib/supabase';
import { Session } from '@supabase/supabase-js';
import { StatusBar } from 'expo-status-bar';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-900">
        <ActivityIndicator size="large" color="#4ade80" />
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-gray-900">
      <StatusBar style="light" />
      {session && session.user ? <Dashboard key={session.user.id} session={session} /> : <Auth />}
    </SafeAreaView>
  );
}

function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function signInWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    setLoading(false);
  }

  async function signUpWithEmail() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) Alert.alert(error.message);
    else Alert.alert('Проверьте почту для подтверждения регистрации!');
    setLoading(false);
  }

  return (
    <View className="flex-1 justify-center p-8 bg-gray-900">
      <Text className="text-4xl font-bold text-white mb-8 text-center tracking-tighter">
        DMAG<Text className="text-green-400">.</Text>
      </Text>
      
      <View className="mb-4">
        <Text className="text-gray-400 mb-2 font-medium">Email</Text>
        <TextInput
          className="bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700"
          onChangeText={(text) => setEmail(text)}
          value={email}
          placeholder="your@email.com"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
        />
      </View>
      
      <View className="mb-8">
        <Text className="text-gray-400 mb-2 font-medium">Password</Text>
        <TextInput
          className="bg-gray-800 text-white rounded-xl px-4 py-3 border border-gray-700"
          onChangeText={(text) => setPassword(text)}
          value={password}
          secureTextEntry
          placeholder="********"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
        />
      </View>
      
      <View className="flex-col gap-4">
        <TouchableOpacity 
          className="bg-green-500 rounded-xl py-4 items-center"
          disabled={loading} 
          onPress={signInWithEmail}
        >
          <Text className="text-gray-900 font-bold text-lg">Войти</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          className="bg-gray-800 border border-gray-700 rounded-xl py-4 items-center"
          disabled={loading} 
          onPress={signUpWithEmail}
        >
          <Text className="text-white font-bold text-lg">Регистрация</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function Dashboard({ session }: { session: Session }) {
  return (
    <View className="flex-1 p-8 bg-gray-900 pt-16">
      <View className="flex-row justify-between items-center mb-8">
        <Text className="text-2xl font-bold text-white">Дашборд</Text>
        <TouchableOpacity 
          className="bg-gray-800 px-4 py-2 rounded-lg border border-gray-700"
          onPress={() => supabase.auth.signOut()}
        >
          <Text className="text-red-400 font-medium">Выйти</Text>
        </TouchableOpacity>
      </View>

      <View className="bg-gray-800 p-6 rounded-2xl border border-gray-700 items-center justify-center">
         <Text className="text-gray-400 mb-2">Вы вошли как:</Text>
         <Text className="text-white font-bold text-lg">{session.user.email}</Text>
      </View>
      
      <View className="mt-8 bg-green-500/10 p-6 rounded-2xl border border-green-500/20">
         <Text className="text-green-400 font-medium text-center">
            Это независимое нативное мобильное приложение с доступом в интернет.
         </Text>
      </View>
    </View>
  );
}
