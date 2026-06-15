import React, { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  visible?: boolean;
  onClose: () => void;
  table?: any;
  branchId?: string | null;
  onReserved?: () => void;
};

export default function ReserveTableSheet({ visible, onClose, table, branchId, onReserved }: Props) {
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [time, setTime] = useState<Date | null>(null);
  const [showPicker, setShowPicker] = useState(false);
  const queryClient = useQueryClient();
  const { t } = useTranslation?.() || ((k: string, d?: string) => d || k);

  useEffect(() => {
    if (table) {
      setName(table.reserved_for || '');
      setNotes(table.reservation_notes || '');
      setTime(table.reserved_at ? new Date(table.reserved_at) : null);
    }
  }, [table]);

  if (!visible || !table) return null;

  const save = async () => {
    try {
      const payload: any = { status: 'reserved', reserved_for: name || null, reservation_notes: notes || null, reserved_at: (time || new Date()).toISOString() };
      console.log('payload>>>', payload);
      
      const { error } = await supabase.from('tables').update(payload).eq('id', table.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tables', branchId] });
      onReserved && onReserved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const clear = async () => {
    try {
      const { error } = await supabase.from('tables').update({ status: 'available', reserved_for: null, reserved_at: null, reservation_notes: null }).eq('id', table.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['tables', branchId] });
      onReserved && onReserved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  const onChange = (_: any, selected?: Date) => {
    // DateTimePicker removed for web; this handler kept for compatibility
    if (selected) setTime(selected);
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{table.status === 'reserved' ? t('tables.editReservation','Edit Reservation') : t('tables.reserveTable','Reserve Table')}</Text>
      <TextInput placeholder={t('tables.customerName','Customer name')} value={name} onChangeText={setName} style={styles.input} />
      <TextInput placeholder={t('tables.notes','Notes')} value={notes} onChangeText={setNotes} style={styles.input} />
      <Pressable style={styles.button} onPress={() => setTime(new Date())}>
        <Text style={styles.buttonText}>{time ? time.toLocaleString() : t('tables.pickReservationTime','Set reservation time (now)')}</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>{t('tables.saveReservation','Save Reservation')}</Text>
      </Pressable>
      {table.status === 'reserved' && <Pressable style={[styles.button, styles.clear]} onPress={clear}><Text style={styles.buttonText}>{t('tables.clearReservation','Clear reservation')}</Text></Pressable>}
      <Pressable style={[styles.button, styles.ghost]} onPress={onClose}><Text style={styles.buttonText}>{t('tables.close','Close')}</Text></Pressable>
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
  clear: { backgroundColor: '#EF4444' },
});
