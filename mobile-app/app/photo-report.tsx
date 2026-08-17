import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/context/AuthContext';
import { useRouter } from 'expo-router';
import { Camera, X, UploadCloud } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { decode } from 'base64-arraybuffer';

export default function PhotoReportScreen() {
  const { session } = useAuth();
  const router = useRouter();
  
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Ошибка', 'Для фотоотчета необходим доступ к камере.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.7,
      base64: true,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      setImageBase64(result.assets[0].base64 || null);
    }
  }

  async function uploadReport() {
    if (!imageBase64) return;
    setLoading(true);

    try {
      const fileName = `${session?.user.id}/${Date.now()}.jpg`;
      
      const { error: storageError } = await supabase.storage
        .from('photo-reports')
        .upload(fileName, decode(imageBase64), {
          contentType: 'image/jpeg'
        });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('photo_reports').insert({
        author_id: session?.user.id,
        site_id: 'e6b9a89c-0722-45e3-96b6-a6c6c5a528cc', // Using a placeholder site_id for now as site selection isn't ported yet
        description,
        photo_url: fileName,
        criticality: 'info'
      });

      if (dbError) throw dbError;

      Alert.alert('Успех', 'Фотоотчет успешно отправлен!', [
        { text: 'ОК', onPress: () => router.back() }
      ]);
    } catch (err: any) {
      Alert.alert('Ошибка', err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <LinearGradient colors={['#0f172a', '#064e3b']} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X color="#fff" size={24} />
          </Pressable>
          <Text style={styles.headerTitle}>Новый фотоотчет</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {!imageUri ? (
            <Pressable style={styles.photoPlaceholder} onPress={takePhoto}>
              <Camera color="#10b981" size={48} />
              <Text style={styles.photoText}>Сделать фото</Text>
            </Pressable>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <Pressable style={styles.retakeBtn} onPress={takePhoto}>
                <Text style={styles.retakeText}>Переснять</Text>
              </Pressable>
            </View>
          )}

          <Text style={styles.label}>Комментарий к фото (необязательно)</Text>
          <TextInput
            style={styles.input}
            placeholder="Опишите, что на фото..."
            placeholderTextColor="#64748b"
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Pressable 
            style={[styles.submitBtn, (!imageUri || loading) && styles.submitDisabled]} 
            disabled={!imageUri || loading}
            onPress={uploadReport}
          >
            {loading ? <ActivityIndicator color="#0f172a" /> : (
              <>
                <UploadCloud color="#0f172a" size={24} />
                <Text style={styles.submitText}>Отправить отчет</Text>
              </>
            )}
          </Pressable>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  safeArea: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  closeBtn: { padding: 8 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 18 },
  content: { padding: 24, flex: 1 },
  photoPlaceholder: { height: 300, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 24, borderWidth: 2, borderColor: 'rgba(16, 185, 129, 0.3)', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  photoText: { fontFamily: 'Inter_500Medium', color: '#10b981', marginTop: 12, fontSize: 16 },
  previewContainer: { height: 300, borderRadius: 24, overflow: 'hidden', marginBottom: 24, position: 'relative' },
  preview: { width: '100%', height: '100%' },
  retakeBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  retakeText: { fontFamily: 'Inter_500Medium', color: '#fff' },
  label: { fontFamily: 'Inter_500Medium', color: '#cbd5e1', marginBottom: 8, fontSize: 14 },
  input: { backgroundColor: 'rgba(0,0,0,0.2)', color: '#fff', borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', height: 120, fontFamily: 'Inter_400Regular' },
  submitBtn: { backgroundColor: '#10b981', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8, marginTop: 'auto' },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: 'Inter_600SemiBold', color: '#0f172a', fontSize: 16 }
});
