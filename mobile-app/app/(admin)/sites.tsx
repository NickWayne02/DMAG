import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { useTheme } from '../../src/context/ThemeContext';
import { Building2, Plus, MapPin, X } from 'lucide-react-native';

type Site = {
  id: string;
  name: string;
  address: string | null;
  customer: string | null;
};

export default function SitesScreen() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const { colors } = useTheme();
  
  // Form state
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [siteCustomer, setSiteCustomer] = useState('');
  const [creating, setCreating] = useState(false);

  async function loadSites() {
    setLoading(true);
    const { data } = await supabase.from('sites').select('*').order('name');
    if (data) setSites(data);
    setLoading(false);
  }

  useEffect(() => {
    loadSites();
  }, []);

  async function handleCreateSite() {
    if (!siteName.trim()) {
      Alert.alert('Ошибка', 'Название объекта обязательно');
      return;
    }
    
    setCreating(true);
    const { error } = await supabase.from('sites').insert({
      name: siteName.trim(),
      address: siteAddress.trim() || null,
      customer: siteCustomer.trim() || null
    });

    setCreating(false);
    
    if (error) {
      Alert.alert('Ошибка', error.message);
    } else {
      setModalVisible(false);
      setSiteName('');
      setSiteAddress('');
      setSiteCustomer('');
      loadSites();
    }
  }

  const renderItem = ({ item }: { item: Site }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Building2 color={colors.primary} size={24} />
        <Text style={[styles.name, { color: colors.foreground }]}>{item.name}</Text>
      </View>
      
      {item.address && (
        <View style={styles.detailRow}>
          <MapPin color={colors.muted} size={16} />
          <Text style={[styles.detailText, { color: colors.muted }]}>{item.address}</Text>
        </View>
      )}
      
      {item.customer && (
        <View style={styles.detailRow}>
          <Text style={[styles.customerLabel, { color: colors.muted }]}>Заказчик:</Text>
          <Text style={[styles.detailText, { color: colors.muted }]}>{item.customer}</Text>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={[colors.background, colors.muted]} style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable 
        style={[styles.fab, { backgroundColor: colors.primary, shadowColor: colors.primary }]}
        onPress={() => setModalVisible(true)}
      >
        <Plus color={colors.primaryForeground} size={24} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.foreground }]}>Новый объект</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X color={colors.muted} size={24} />
              </Pressable>
            </View>

            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
              placeholder="Название объекта *"
              placeholderTextColor={colors.muted}
              value={siteName}
              onChangeText={setSiteName}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
              placeholder="Адрес (необязательно)"
              placeholderTextColor={colors.muted}
              value={siteAddress}
              onChangeText={setSiteAddress}
            />
            <TextInput
              style={[styles.input, { backgroundColor: colors.background, color: colors.foreground, borderColor: colors.border, borderWidth: 1 }]}
              placeholder="Заказчик (необязательно)"
              placeholderTextColor={colors.muted}
              value={siteCustomer}
              onChangeText={setSiteCustomer}
            />

            <Pressable 
              style={[styles.submitBtn, { backgroundColor: colors.primary }, creating && { opacity: 0.5 }]} 
              onPress={handleCreateSite}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color={colors.primaryForeground} /> : <Text style={[styles.submitText, { color: colors.primaryForeground }]}>Создать</Text>}
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  list: { padding: 16, paddingBottom: 100 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  name: { fontFamily: 'Inter_600SemiBold', fontSize: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  detailText: { fontFamily: 'Inter_400Regular', fontSize: 14 },
  customerLabel: { fontFamily: 'Inter_500Medium', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Inter_600SemiBold', fontSize: 20 },
  input: { borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  submitBtn: { padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { fontFamily: 'Inter_600SemiBold', fontSize: 16 }
});
