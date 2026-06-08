import React, { useEffect } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  visible?: boolean;
  onClose: () => void;
  table?: any;
};

export default function TableOrderDetailsSheet({ visible, onClose, table }: Props) {
  const queryClient = useQueryClient();
  const { t } = useTranslation?.() || ((k: string, d?: string) => d || k);

  const { data: orders = [], refetch } = useQuery(
    ['table-active-orders', table?.id],
    async () => {
      if (!table) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,total_amount,status')
        .eq('table_id', table.id)
        .in('status', ['pending', 'preparing', 'ready']);
      if (error) throw error;
      return data || [];
    },
    { enabled: !!table }
  );

  useEffect(() => {
    if (visible) refetch();
  }, [visible]);

  if (!visible || !table) return null;

  const closeOrder = async (orderId: string) => {
    try {
      const { error } = await supabase.from('orders').update({ status: 'completed' }).eq('id', orderId);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ['table-orders', table.branch_id] });
      refetch();
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed');
    }
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>{t('tables.ordersFor','Orders for table')} {table.table_number}</Text>
      <FlatList data={orders} keyExtractor={(i) => i.id} renderItem={({ item }) => (
        <View style={styles.orderRow}>
          <Text style={styles.orderText}>{item.order_number || item.id} — {item.status}</Text>
          <Pressable style={styles.smallBtn} onPress={() => closeOrder(item.id)}>
            <Text style={styles.smallBtnText}>{t('tables.closeOrder','Close')}</Text>
          </Pressable>
        </View>
      )} />
      <Pressable style={[styles.button, styles.ghost]} onPress={onClose}>
        <Text style={styles.buttonText}>{t('tables.close','Close')}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#1f2937', padding: 16, borderRadius: 12 },
  title: { color: '#fff', fontSize: 18, marginBottom: 8 },
  muted: { color: '#9CA3AF', marginBottom: 8 },
  button: { backgroundColor: '#10B981', padding: 12, borderRadius: 8, alignItems: 'center', marginTop: 8 },
  buttonText: { color: '#fff', fontWeight: '600' },
  ghost: { backgroundColor: '#374151' },
  orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#374151' },
  orderText: { color: '#fff' },
  smallBtn: { backgroundColor: '#374151', paddingHorizontal: 8, paddingVertical: 6, borderRadius: 6 },
  smallBtnText: { color: '#fff' },
});
