import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, Pressable, TextInput, Alert, Modal } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
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
    <View style={styles.card}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 }}>
        <Building2 color="#f59e0b" size={24} />
        <Text style={styles.name}>{item.name}</Text>
      </View>
      
      {item.address && (
        <View style={styles.detailRow}>
          <MapPin color="#64748b" size={16} />
          <Text style={styles.detailText}>{item.address}</Text>
        </View>
      )}
      
      {item.customer && (
        <View style={styles.detailRow}>
          <Text style={styles.customerLabel}>Заказчик:</Text>
          <Text style={styles.detailText}>{item.customer}</Text>
        </View>
      )}
    </View>
  );

  return (
    <LinearGradient colors={['#0f172a', '#1e293b']} style={styles.container}>
      {loading ? (
        <ActivityIndicator size="large" color="#f59e0b" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={sites}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
        />
      )}

      <Pressable 
        style={styles.fab}
        onPress={() => setModalVisible(true)}
      >
        <Plus color="#fff" size={24} />
      </Pressable>

      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Новый объект</Text>
              <Pressable onPress={() => setModalVisible(false)}>
                <X color="#94a3b8" size={24} />
              </Pressable>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Название объекта *"
              placeholderTextColor="#64748b"
              value={siteName}
              onChangeText={setSiteName}
            />
            <TextInput
              style={styles.input}
              placeholder="Адрес (необязательно)"
              placeholderTextColor="#64748b"
              value={siteAddress}
              onChangeText={setSiteAddress}
            />
            <TextInput
              style={styles.input}
              placeholder="Заказчик (необязательно)"
              placeholderTextColor="#64748b"
              value={siteCustomer}
              onChangeText={setSiteCustomer}
            />

            <Pressable 
              style={[styles.submitBtn, creating && { opacity: 0.5 }]} 
              onPress={handleCreateSite}
              disabled={creating}
            >
              {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Создать</Text>}
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
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)'
  },
  name: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 18 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  detailText: { fontFamily: 'Inter_400Regular', color: '#94a3b8', fontSize: 14 },
  customerLabel: { fontFamily: 'Inter_500Medium', color: '#64748b', fontSize: 14 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#f59e0b',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#f59e0b',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5
  },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1e293b', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 },
  modalTitle: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 20 },
  input: { backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', borderRadius: 12, padding: 16, fontSize: 16, marginBottom: 16, fontFamily: 'Inter_400Regular' },
  submitBtn: { backgroundColor: '#f59e0b', padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  submitText: { fontFamily: 'Inter_600SemiBold', color: '#fff', fontSize: 16 }
});
