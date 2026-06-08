import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  visible?: boolean;
  onClose: () => void;
  table?: any;
  onSaved?: () => void;
};

export default function EditTableSheet({ visible, onClose, table, onSaved }: Props) {
  const [tableNumber, setTableNumber] = useState('');
  const [capacity, setCapacity] = useState('2');
  const [status, setStatus] = useState('available');
  const queryClient = useQueryClient();

  useEffect(() => {
    if (table) {
      setTableNumber(String(table.table_number || ''));
      setCapacity(String(table.capacity || 2));
      setStatus(table.status || 'available');
    }
  }, [table]);

  const { t } = useTranslation?.() || ((k: string, d?: string) => d || k);

  if (!visible || !table) return null;

  const save = async () => {
    const { error } = await supabase.from('tables').update({ table_number: Number(tableNumber), capacity: Number(capacity), status }).eq('id', table.id);
    if (error) {
      Alert.alert('Error', error.message || 'Failed');
    } else {
      queryClient.invalidateQueries({ queryKey: ['tables', table.branch_id] });
      onSaved && onSaved();
      onClose();
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{t('tables.editTable','Edit Table')}</Text>
      <TextInput placeholder={t('tables.tableNumber','Table number')} value={tableNumber} onChangeText={setTableNumber} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder={t('tables.capacity','Capacity')} value={capacity} onChangeText={setCapacity} style={styles.input} keyboardType="numeric" />
      <TextInput placeholder={t('tables.status','Status')} value={status} onChangeText={setStatus} style={styles.input} />
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>{t('tables.save','Save')}</Text>
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
