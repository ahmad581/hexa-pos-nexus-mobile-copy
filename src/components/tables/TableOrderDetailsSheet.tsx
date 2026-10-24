import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

type Props = {
  visible?: boolean;
  onClose: () => void;
  table?: any;
};

type ActiveOrder = {
  id: string;
  order_number: string | null;
  order_seq: number | null;
  total_amount: number | null;
  status: string;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
};

export default function TableOrderDetailsSheet({ visible, onClose, table }: Props) {
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const [clearing, setClearing] = useState(false);

  const {
    data: orders = [],
    isLoading: loadingOrders,
    isFetching: fetchingOrders,
    error: ordersError,
  } = useQuery<ActiveOrder[]>(
    ['table-active-orders', table?.id],
    async () => {
      if (!table) return [];
      const { data, error } = await supabase
        .from('orders')
        .select('id,order_number,order_seq,total_amount,status')
        .eq('table_id', table.id)
        .in('status', ['pending', 'preparing', 'ready'])
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    { enabled: !!visible && !!table }
  );

  const orderIds = useMemo(() => orders.map((order) => order.id), [orders]);
  const {
    data: items = [],
    isLoading: loadingItems,
    isFetching: fetchingItems,
    error: itemsError,
  } = useQuery<OrderItem[]>(
    ['table-active-order-items', table?.id, orderIds],
    async () => {
      if (orderIds.length === 0) return [];
      const { data, error } = await supabase
        .from('order_items')
        .select('id,order_id,product_name,quantity,unit_price,total_price')
        .in('order_id', orderIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    { enabled: !!visible && orderIds.length > 0 }
  );

  if (!visible || !table) return null;

  const formatMoney = (amount: number) => `JD${amount.toFixed(2)}`;
  const getOrderNumber = (order: ActiveOrder) =>
    order.order_seq != null ? `#${order.order_seq}` : order.order_number || `#${order.id.slice(0, 8)}`;
  const itemsForOrder = (orderId: string) => items.filter((item) => item.order_id === orderId);
  const subtotalForOrder = (orderId: string) =>
    itemsForOrder(orderId).reduce((sum, item) => sum + Number(item.total_price ?? 0), 0);
  const grandTotal = orders.reduce((sum, order) => sum + Number(order.total_amount ?? 0), 0);
  const loadingDetails = loadingOrders || loadingItems || fetchingOrders || fetchingItems;

  const clearTable = async () => {
    if (clearing) return;
    setClearing(true);
    try {
      if (orders.length > 0) {
        const { error: ordersError } = await supabase
          .from('orders')
          .update({ status: 'completed' })
          .eq('table_id', table.id)
          .in('status', ['pending', 'preparing', 'ready']);
        if (ordersError) throw ordersError;
      }

      const { error: tableError } = await supabase
        .from('tables')
        .update({ status: 'available' })
        .eq('id', table.id);
      if (tableError) throw tableError;

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tables', table.branch_id] }),
        queryClient.invalidateQueries({ queryKey: ['table-orders', table.branch_id] }),
        queryClient.invalidateQueries({ queryKey: ['table-active-orders', table.id] }),
      ]);
      onClose();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to clear the table.');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['tables', table.branch_id] }),
        queryClient.invalidateQueries({ queryKey: ['table-orders', table.branch_id] }),
        queryClient.invalidateQueries({ queryKey: ['table-active-orders', table.id] }),
      ]);
    } finally {
      setClearing(false);
    }
  };

  const queryError = ordersError || itemsError;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.dialog}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {t('tables.tableNumber', 'Table')} {table.table_number} — {t('tables.orderDetails', 'Order Details')}
            </Text>
            <Pressable onPress={onClose} accessibilityLabel={t('tables.close', 'Close')} hitSlop={8}>
              <Text style={styles.closeIcon}>×</Text>
            </Pressable>
          </View>

          {loadingDetails ? (
            <ActivityIndicator color="#00AFAF" style={styles.loading} />
          ) : queryError ? (
            <Text style={styles.errorText}>
              {queryError instanceof Error ? queryError.message : t('tables.loadOrdersFailed', 'Failed to load order details.')}
            </Text>
          ) : orders.length === 0 ? (
            <Text style={styles.emptyText}>{t('tables.noActiveOrders', 'No active orders for this table.')}</Text>
          ) : (
            <ScrollView style={styles.orderList} contentContainerStyle={styles.orderListContent}>
              {orders.map((order) => {
                const orderItems = itemsForOrder(order.id);
                const subtotal = subtotalForOrder(order.id);
                return (
                  <View key={order.id} style={styles.orderCard}>
                    <View style={styles.orderHeading}>
                      <Text style={styles.orderNumber}>{getOrderNumber(order)}</Text>
                      <View style={styles.statusBadge}>
                        <Text style={styles.statusText}>{t(`tables.${order.status}`, order.status)}</Text>
                      </View>
                    </View>
                    {orderItems.map((item) => (
                      <View key={item.id} style={styles.itemRow}>
                        <Text style={styles.itemName}>
                          {Number(item.quantity)} × {item.product_name}
                        </Text>
                        <Text style={styles.amount}>{formatMoney(Number(item.total_price ?? 0))}</Text>
                      </View>
                    ))}
                    <View style={styles.subtotalRow}>
                      <Text style={styles.subtotalLabel}>{t('tables.subtotal', 'Subtotal')}</Text>
                      <Text style={styles.subtotalValue}>{formatMoney(subtotal)}</Text>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {orders.length > 0 && !queryError && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>{t('tables.grandTotal', 'Grand Total')}</Text>
              <Text style={styles.totalValue}>{formatMoney(grandTotal)}</Text>
            </View>
          )}

          <View style={styles.actions}>
            <Pressable
              style={[styles.clearButton, (clearing || loadingDetails || !!queryError) && styles.disabledButton]}
              onPress={clearTable}
              disabled={clearing || loadingDetails || !!queryError}
            >
              {clearing ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <>
                  <Text style={styles.currencyIcon}>$</Text>
                  <Text style={styles.clearButtonText}>{t('tables.clearTable', 'Clear Table')}</Text>
                </>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 500,
    maxHeight: '85%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  title: { color: '#111827', fontSize: 18, fontWeight: '600', flex: 1, marginRight: 12 },
  closeIcon: { color: '#64748B', fontSize: 22, lineHeight: 24 },
  loading: { paddingVertical: 24 },
  errorText: { color: '#B91C1C', paddingVertical: 12 },
  emptyText: { color: '#64748B', paddingVertical: 12 },
  orderList: { flexGrow: 0, maxHeight: 420 },
  orderListContent: { gap: 12, paddingBottom: 2 },
  orderCard: { borderWidth: 1, borderColor: '#DBE3EF', borderRadius: 9, padding: 12 },
  orderHeading: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  orderNumber: { color: '#111827', fontSize: 14, fontWeight: '700' },
  statusBadge: { borderWidth: 1, borderColor: '#DBE3EF', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  statusText: { color: '#111827', fontSize: 11, fontWeight: '600', textTransform: 'capitalize' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5 },
  itemName: { color: '#334155', fontSize: 13, flex: 1, marginRight: 12 },
  amount: { color: '#111827', fontSize: 13 },
  subtotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#DBE3EF',
    marginTop: 6,
    paddingTop: 10,
  },
  subtotalLabel: { color: '#111827', fontWeight: '600' },
  subtotalValue: { color: '#111827', fontWeight: '600' },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#DBE3EF',
    marginTop: 14,
    paddingTop: 12,
  },
  totalLabel: { color: '#111827', fontSize: 17, fontWeight: '700' },
  totalValue: { color: '#00AFAF', fontSize: 17, fontWeight: '700' },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 16 },
  clearButton: {
    minWidth: 126,
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#00AFAF',
    borderRadius: 7,
    paddingHorizontal: 14,
    gap: 6,
  },
  disabledButton: { opacity: 0.6 },
  currencyIcon: { color: '#fff', fontSize: 18, fontWeight: '500' },
  clearButtonText: { color: '#fff', fontWeight: '700' },
});
