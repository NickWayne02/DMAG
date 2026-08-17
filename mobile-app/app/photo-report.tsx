import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Image, ActivityIndicator, Alert, TextInput } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../src/lib/supabase';
import { useAuth } from '../src/context/AuthContext';
import { useTheme } from '../src/context/ThemeContext';
import { useRouter } from 'expo-router';
import { Camera, X, UploadCloud } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { decode } from 'base64-arraybuffer';

export default function PhotoReportScreen() {
  const { session } = useAuth();
  const { colors } = useTheme();
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
        .upload(fileName, decode(imageBase64), { contentType: 'image/jpeg' });

      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from('photo_reports').insert({
        author_id: session?.user.id,
        site_id: 'e6b9a89c-0722-45e3-96b6-a6c6c5a528cc', // Placeholder
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
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Pressable onPress={() => router.back()} style={styles.closeBtn}>
            <X color={colors.foreground} size={24} />
          </Pressable>
          <Text style={[styles.headerTitle, { color: colors.foreground }]}>Новый фотоотчет</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={styles.content}>
          {!imageUri ? (
            <Pressable style={[styles.photoPlaceholder, { backgroundColor: colors.card, borderColor: colors.primary }]} onPress={takePhoto}>
              <Camera color={colors.primary} size={48} />
              <Text style={[styles.photoText, { color: colors.primary }]}>Сделать фото</Text>
            </Pressable>
          ) : (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.preview} />
              <Pressable style={styles.retakeBtn} onPress={takePhoto}>
                <Text style={styles.retakeText}>Переснять</Text>
              </Pressable>
            </View>
          )}

          <Text style={[styles.label, { color: colors.foreground }]}>Комментарий к фото (необязательно)</Text>
          <TextInput
            style={[styles.input, { backgroundColor: colors.card, color: colors.foreground, borderColor: colors.border }]}
            placeholder="Опишите, что на фото..."
            placeholderTextColor={colors.muted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          <Pressable 
            style={[styles.submitBtn, { backgroundColor: colors.primary }, (!imageUri || loading) && styles.submitDisabled]} 
            disabled={!imageUri || loading}
            onPress={uploadReport}
          >
            {loading ? <ActivityIndicator color={colors.primaryForeground} /> : (
              <>
                <UploadCloud color={colors.primaryForeground} size={24} />
                <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Отправить отчет</Text>
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, borderBottomWidth: 1 },
  closeBtn: { padding: 8 },
  headerTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  content: { padding: 24, flex: 1 },
  photoPlaceholder: { height: 300, borderRadius: 24, borderWidth: 2, borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  photoText: { fontFamily: 'Inter_500Medium', marginTop: 12, fontSize: 16 },
  previewContainer: { height: 300, borderRadius: 24, overflow: 'hidden', marginBottom: 24, position: 'relative' },
  preview: { width: '100%', height: '100%' },
  retakeBtn: { position: 'absolute', bottom: 16, alignSelf: 'center', backgroundColor: 'rgba(0,0,0,0.6)', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  retakeText: { fontFamily: 'Inter_500Medium', color: '#fff' },
  label: { fontFamily: 'Inter_500Medium', marginBottom: 8, fontSize: 14 },
  input: { borderRadius: 16, padding: 16, fontSize: 16, borderWidth: 1, height: 120, fontFamily: 'Inter_400Regular' },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 16, gap: 8, marginTop: 'auto' },
  submitDisabled: { opacity: 0.5 },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 }
});
