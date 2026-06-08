import React, { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  visible?: boolean;
  onClose: () => void;
  branchId: string | null;
  onAdded?: () => void;
};

export default function AddUnitSheet({ visible, onClose, branchId, onAdded }: Props) {
  // simple view-based sheet; no native bottom-sheet used
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('2');
  const queryClient = useQueryClient();

  const { t } = useTranslation?.() || ((k: string, d?: string) => d || k);

  if (!visible) return null;

  const create = async () => {
    if (!branchId) return Alert.alert('Missing branch');
    const num = Number(tableNumber || Date.now().toString().slice(-4));
    const { error } = await supabase.from('tables').insert([{ branch_id: branchId, table_number: num, capacity: Number(capacity || 2), status: 'available' }]);
    if (error) {
      Alert.alert('Error', error.message || 'Failed');
    } else {
      queryClient.invalidateQueries({ queryKey: ['tables', branchId] });
      onAdded && onAdded();
      onClose();
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{t('tables.addTable','Add Table')}</Text>
      <TextInput placeholder={t('tables.tableNumber','Table number')} value={tableNumber} onChangeText={setTableNumber} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder={t('tables.capacity','Capacity')} value={capacity} onChangeText={setCapacity} style={styles.input} keyboardType="numeric" />
      <Pressable style={styles.button} onPress={create}>
        <Text style={styles.buttonText}>{t('tables.create','Create')}</Text>
      </Pressable>
      <Pressable style={[styles.button, styles.ghost]} onPress={onClose}>
        <Text style={styles.buttonText}>{t('tables.close','Close')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12 },
  title: { color: '#fff', fontSize: 18, marginBottom: 8 },
  input: { backgroundColor: '#111827', color: '#fff', padding: 8, borderRadius: 8, marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  button: { backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  ghost: { backgroundColor: '#374151' },
});
