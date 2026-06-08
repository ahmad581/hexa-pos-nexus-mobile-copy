import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  visible?: boolean;
  onClose: () => void;
  table?: any;
  branchId?: string | null;
  onMoved?: () => void;
};

export default function MoveTableSheet({ visible, onClose, table, branchId, onMoved }: Props) {
  const [targets, setTargets] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const { t } = useTranslation?.() || ((k: string, d?: string) => d || k);

  useEffect(() => {
    if (!visible || !branchId) return;
    (async () => {
      const { data } = await supabase.from('tables').select('id,table_number,status,branch_id').eq('branch_id', branchId).eq('status', 'available');
      setTargets(data || []);
    })();
  }, [visible, branchId]);

  if (!visible || !table) return null;

  const moveTo = async (targetId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ table_id: targetId }).eq('table_id', table.id).in('status', ['pending', 'preparing', 'ready']);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['table-orders', branchId] });
      onMoved && onMoved();
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to move');
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{t('tables.moveOrdersFrom','Move orders from table')} {table.table_number}</Text>
      <FlatList data={targets} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <Pressable onPress={() => moveTo(item.id)} style={styles.target}>
          <Text style={styles.targetText}>{t('tables.tableNumber','Table')} {item.table_number}</Text>
        </Pressable>
      )} />
      <Pressable style={[styles.button, styles.ghost]} onPress={onClose}>
        <Text style={styles.buttonText}>{t('tables.close','Close')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12, maxHeight: 400 },
  title: { color: '#fff', fontSize: 18, marginBottom: 8 },
  target: { padding: 12, borderRadius: 8, backgroundColor: '#111827', marginBottom: 8, borderWidth: 1, borderColor: '#374151' },
  targetText: { color: '#fff' },
  button: { backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  ghost: { backgroundColor: '#374151' },
});
