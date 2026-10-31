import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, FlatList, Alert, TextInput } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useQueryClient } from '@tanstack/react-query';
import { useOrder } from '../../hooks';
import { useBranch } from '../../hooks/useBranch';
import submitOrderMobile from '../../services/submitOrderMobile';

type Props = {
  visible?: boolean;
  onClose: () => void;
  order: any[];
  origin?: string | null;
  /** When provided, the sheet delegates submission to the caller (e.g. MenuScreen.submitOrder). */
  onSubmit?: () => Promise<void> | void;
  /** Overrides for context-like state. Props win over the local useOrder() copy. */
  selectedTable?: any;
  orderType?: 'dine-in' | 'takeout' | 'delivery';
  customerInfo?: any;
  orderNotes?: string | null;
  editingOrderId?: string | null;
};

export default function OrderSummarySheet({
  visible,
  onClose,
  order,
  origin,
  onSubmit,
  selectedTable: selectedTableProp,
  orderType: orderTypeProp,
  customerInfo: customerInfoProp,
  orderNotes: orderNotesProp,
  editingOrderId: editingOrderIdProp,
}: Props) {
  const [submitting, setSubmitting] = useState(false);
  const navigation = useNavigation<any>();
  const orderHook = useOrder() as any;
  const branchHook = useBranch() as any;
  const selectedBranch = branchHook?.selectedBranch ?? branchHook ?? null;
  const queryClient = useQueryClient();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState<string>('');

  if (!visible) return null;
  const total = (order || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 1)), 0);

  // Props win over the (per-instance, not-shared) useOrder() copy.
  const effectiveSelectedTable =
    selectedTableProp !== undefined ? selectedTableProp : orderHook?.selectedTable ?? null;
  const effectiveOrderType =
    orderTypeProp !== undefined ? orderTypeProp : orderHook?.orderType || 'dine-in';
  const effectiveCustomerInfo =
    customerInfoProp !== undefined ? customerInfoProp : orderHook?.customerInfo ?? null;
  const effectiveOrderNotes =
    orderNotesProp !== undefined ? orderNotesProp : (orderHook?.orderNotes as string) ?? null;
  const effectiveEditingOrderId =
    editingOrderIdProp !== undefined ? editingOrderIdProp : orderHook?.editingOrderId ?? null;

  const handleSubmit = async () => {
    if (submitting) return;
    setSubmitting(true);

    try {
      // Prefer the caller's submit handler — it owns the real state.
      if (onSubmit) {
        await onSubmit();
        return;
      }

      const payload = {
        selectedBranch,
        selectedTable: effectiveSelectedTable,
        
        orderType: effectiveOrderType,
        customerInfo: effectiveCustomerInfo,
        orderNotes: effectiveOrderNotes || undefined,
        currentOrder: order || [],
        editingOrderId: effectiveEditingOrderId,
      };

      const ok = await submitOrderMobile(payload as any);
      if (!ok) {
        Alert.alert('Error', 'Failed to submit order');
        return;
      }

      Alert.alert('Order submitted');
      orderHook?.clearCurrentOrder?.();
      const originFromHook = orderHook?.originRoute;
      const originUsed = origin ?? originFromHook;
      const branchId = selectedBranch?.id || null;

      try {
        queryClient.invalidateQueries({ queryKey: ['tables', branchId] });
        queryClient.invalidateQueries({ queryKey: ['table-orders', branchId] });
      } catch (e) {
        // ignore
      }

      try {
        if (originUsed === '/tables' || originUsed === 'tables') {
          navigation.navigate('App', { screen: 'Tables' });
          return;
        }
        if (!originUsed) {
          navigation.navigate('Pending');
          return;
        }
        const cleaned = String(originUsed).replace(/^\//, '').toLowerCase();
        if (cleaned === 'orders' || cleaned === 'order') {
          navigation.navigate('Pending');
          return;
        }
        try {
          navigation.navigate(cleaned.charAt(0).toUpperCase() + cleaned.slice(1));
        } catch (e) {
          navigation.navigate('Pending');
        }
      } catch (e) {
        // ignore navigation errors
      }
    } finally {
      setSubmitting(false);
    }
  };

  const openEditItem = (item: any) => {
    setEditingItemId(item.id);
    setEditingText(item.notes || '');
  };

  const saveItemNotes = () => {
    if (editingItemId) {
      orderHook?.updateItemNotes?.(editingItemId, editingText || null);
    }
    setEditingItemId(null);
    setEditingText('');
  };

  return (
    <View style={styles.sheet}>
      <Text style={styles.title}>Order summary</Text>
      <FlatList
        data={order}
        keyExtractor={(i) => i.id}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <View style={{ flex: 1 }}>
              <Text style={styles.name}>{item.name}</Text>
              {item.notes ? <Text style={{ color: '#64748B', fontSize: 12 }}>Instr: {item.notes}</Text> : null}
            </View>
            <Text style={styles.qty}>{item.quantity}×</Text>
            <Text style={styles.price}>${(item.price || 0).toFixed(2)}</Text>
            <Pressable onPress={() => openEditItem(item)} style={{ marginLeft: 8, padding: 6, backgroundColor: '#e6ecee', borderRadius: 6 }}>
              <Text style={{ color: '#1F2933', fontSize: 12 }}>Edit</Text>
            </Pressable>
          </View>
        )}
      />
      <View style={{ marginTop: 8 }}>
        <Text style={{ color: '#64748B', marginBottom: 6 }}>Order instructions</Text>
        <TextInput
          value={orderHook?.orderNotes || ''}
          onChangeText={(v) => orderHook?.setOrderNotes?.(v)}
          placeholder="Special instructions for this order"
          style={{ backgroundColor: '#e6ecee', color: '#1F2933', padding: 8, borderRadius: 8 }}
        />
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalText}>Total</Text>
        <Text style={styles.totalText}>${total.toFixed(2)}</Text>
      </View>
      <Pressable style={styles.close} onPress={onClose}>
        <Text style={{ color: '#073B3B' }}>Close</Text>
      </Pressable>
      {(order || []).length > 0 && (
        <Pressable style={[styles.close, { marginTop: 8 }]} onPress={handleSubmit} disabled={submitting}>
          <Text style={{ color: '#073B3B' }}>{submitting ? 'Submitting...' : 'Submit Order'}</Text>
        </Pressable>
      )}
      {editingItemId && (
        <View style={{ position: 'absolute', left: 16, right: 16, top: '30%', backgroundColor: '#FFFFFF', padding: 12, borderRadius: 8 }}>
          <Text style={{ color: '#1F2933', fontWeight: '700', marginBottom: 8 }}>Item instructions</Text>
          <TextInput
            value={editingText}
            onChangeText={setEditingText}
            placeholder="Special instructions"
            style={{ backgroundColor: '#e6ecee', color: '#1F2933', padding: 8, borderRadius: 8 }}
          />
          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <Pressable onPress={() => { setEditingItemId(null); setEditingText(''); }} style={{ flex: 1, marginRight: 8, backgroundColor: '#e6ecee', padding: 10, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#1F2933' }}>Cancel</Text>
            </Pressable>
            <Pressable onPress={saveItemNotes} style={{ flex: 1, backgroundColor: '#01A9A8', padding: 10, borderRadius: 8, alignItems: 'center' }}>
              <Text style={{ color: '#073B3B' }}>Save</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  sheet: { backgroundColor: '#FFFFFF', padding: 16, borderRadius: 12, margin: 16 },
  title: { color: '#1F2933', fontWeight: '700', fontSize: 18, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 },
  name: { color: '#1F2933' },
  qty: { color: '#64748B' },
  price: { color: '#1F2933' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, borderTopWidth: 1, borderTopColor: '#CBD5D8', paddingTop: 12 },
  totalText: { color: '#1F2933', fontWeight: '700' },
  close: { marginTop: 12, backgroundColor: '#01A9A8', padding: 12, borderRadius: 8, alignItems: 'center' },
});
