import React, { useEffect, useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { View, Text, FlatList, StyleSheet, Pressable, useWindowDimensions, RefreshControl, ScrollView, Alert } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBranch, useSettings, useTranslation, useRole, useCall, useOrder } from '../hooks';
import CategoryChips from '../components/menu/CategoryChips';
import MenuItemCard from '../components/menu/MenuItemCard';
import OrderSummarySheet from '../components/menu/OrderSummarySheet';
import StatusPill from '../components/menu/StatusPill';
import { MenuItem, Category, Subcategory } from '../types/menu';

export default function MenuScreen({ route, navigation }: any) {
  const _branchHook = useBranch() as any;
  const selectedBranch = _branchHook?.selectedBranch ?? _branchHook ?? null;
  const branchId = selectedBranch?.id || null;
  const { menuDesign } = useSettings();
  const { t } = useTranslation();
  const { isManager, isSuperManager, isSystemMaster, isCashier } = useRole() as any;
  const { activeCallInfo, endCall, isInCall } = useCall() as any;
  const {
    addItemToOrder,
    currentOrder,
    setCustomerInfo,
    setOrderType,
    setSelectedTable,
    selectedTable,
    loadOrderForEditingById,
    setOriginRoute,
    clearCurrentOrder,
  } = useOrder() as any;

  const canManageMenu = false;
  const canMarkSoldOut = canManageMenu || (isCashier && isCashier());

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [showSummary, setShowSummary] = useState(false);

  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery(['menu-items', branchId], async () => {
    if (!branchId) return [];
    const { data, error } = await supabase
      .from('menu_items')
      .select('*')
      .eq('branch_id', branchId)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? '',
      price: Number(r.price),
      category: r.category,
      subcategory: r.subcategory ?? null,
      available: r.is_available,
      soldOut: !r.is_available,
      display_order: r.display_order,
      printerId: r.printer_id ?? null,
    } as MenuItem));
  }, { enabled: !!branchId });

  const { data: categories = [] } = useQuery(['menu-categories', branchId], async () => {
    if (!branchId) return [];
    const { data } = await supabase.from('menu_items').select('category').eq('branch_id', branchId);
    const uniques = Array.from(new Set((data || []).map((d: any) => d.category).filter(Boolean)));
    const { data: orderData } = await supabase.from('menu_category_order').select('category_value,display_order,is_sold_out').eq('branch_id', branchId);
    const merged = uniques.map((v: string) => {
      const o = (orderData || []).find((x: any) => x.category_value === v);
      return { value: v, label: (v || '').charAt(0).toUpperCase() + (v || '').slice(1), soldOut: o?.is_sold_out || false, display_order: o?.display_order || 999 } as Category;
    });
    return merged.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.label.localeCompare(b.label));
  }, { enabled: !!branchId });

  const { data: subcategories = [] } = useQuery(['menu-subcategories', branchId], async () => {
    if (!branchId) return [];
    const { data } = await supabase.from('menu_subcategories').select('*').eq('branch_id', branchId).order('display_order', { ascending: true });
    return (data || []).map((s: any) => ({ id: s.id, value: s.subcategory_value, label: s.subcategory_label, category_value: s.category_value, is_sold_out: s.is_sold_out } as Subcategory));
  }, { enabled: !!branchId });

  useEffect(() => {
    if (!selectedCategory && categories.length) setSelectedCategory(categories[0].value);
  }, [categories]);

  useEffect(() => {
    const params = (route && route.params) || {};
    console.log('params: ', params);

    const { editingOrderId, tableNumber, tableId, origin } = params;

    if (editingOrderId) {
      setOriginRoute('/orders');
      loadOrderForEditingById(editingOrderId);
    }
    if (tableNumber) {
      setOrderType('dine-in');
      if (!selectedTable || selectedTable.table_number !== tableNumber || !selectedTable.id) {
        setSelectedTable({ id: tableId ?? null, table_number: tableNumber });
      }
      setOriginRoute(origin || '/tables');
    } else if (origin) {
      setOriginRoute(origin);
    }
  }, [route]);

  useEffect(() => {
    if (activeCallInfo && !currentOrder?.length) {
      setCustomerInfo && setCustomerInfo({ name: activeCallInfo.customerName, phone: activeCallInfo.phoneNumber, address: activeCallInfo.address });
    }
  }, [activeCallInfo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['menu-items', branchId] });
    await queryClient.invalidateQueries({ queryKey: ['menu-categories', branchId] });
    setRefreshing(false);
  };

  const filtered = items.filter((i: any) => i.category === selectedCategory);

  const submitOrder = async () => {
    if (!branchId) return Alert.alert('Missing branch');
    if (!currentOrder?.length) return Alert.alert('No items');
    try {
      const total = currentOrder.reduce(
        (s: number, it: any) => s + Number(it.price || 0) * (it.quantity || 1),
        0,
      );
      const payload: any = {
        branch_id: branchId,
        order_number: `ORD-${Date.now().toString(36).toUpperCase()}`,
        total_amount: total,
        status: 'pending',
        created_at: new Date().toISOString(),
      };
      console.log('payload><><>', payload);
      
      if (selectedTable) {
        const st = selectedTable as any;
        let resolvedTableId: string | null = st.id ?? null;

        if (!resolvedTableId && st.table_number != null) {
          const { data: t } = await supabase
            .from('tables')
            .select('id')
            .eq('branch_id', branchId)
            .eq('table_number', String(st.table_number))
            .maybeSingle();
          resolvedTableId = t?.id ?? null;
        }

        console.log('[MenuScreen.submitOrder] resolved table_id=', resolvedTableId, 'from', st);
        if (resolvedTableId) payload.table_id = resolvedTableId;
      }

      const { data: inserted, error } = await supabase
        .from('orders')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      if (inserted?.id && currentOrder.length) {
        const itemsPayload = currentOrder.map((it: any) => ({
          order_id: inserted.id,
          menu_item_id: it.id,
          product_name: it.name || '',                            // ← add
          quantity: it.quantity || 1,
          unit_price: it.price,
          total_price: Number(it.price || 0) * (it.quantity || 1), // ← add
          special_instructions: it.notes || null,
        }));
        console.log('itemsPayload>>>>>', itemsPayload);
        
        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      if (payload.table_id) {
        await supabase
          .from('tables')
          .update({ status: 'occupied' })
          .eq('id', payload.table_id);
      }

      await queryClient.refetchQueries({ queryKey: ['table-orders', branchId] });
      await queryClient.refetchQueries({ queryKey: ['tables', branchId] });
      clearCurrentOrder();

      navigation?.navigate?.('App', { screen: 'Tables' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit order');
    }
  };

  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ padding: 16 }}>
        {isInCall && activeCallInfo && (
          <StatusPill onClose={() => { endCall(); navigation?.replace?.('/call-center'); }}>
            📞 {t('order.takingOrderFor', 'Taking order for')}: {activeCallInfo.customerName} ({activeCallInfo.phoneNumber})
          </StatusPill>
        )}
      </View>

      <CategoryChips categories={categories} selected={selectedCategory} onSelect={setSelectedCategory} />

      <FlatList
        data={filtered}
        keyExtractor={(i: any) => i.id}
        renderItem={({ item }) => (
          <MenuItemCard item={item} onPress={() => { addItemToOrder(item); }} onLongPress={() => { if (canMarkSoldOut) { /* toggle sold out */ } }} />
        )}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
        contentContainerStyle={{ padding: 16 }}
      />

      {width >= 1024 ? (
        <View style={styles.sidePanel}>
          <OrderSummarySheet
            visible={true}
            onClose={() => {}}
            order={currentOrder}
            origin={(route && route.params && route.params.origin) || null}
            onSubmit={submitOrder}
            selectedTable={selectedTable}
            orderType="dine-in"
          />
        </View>
      ) : (
        <Pressable style={styles.bottomBar} onPress={() => setShowSummary(true)}>
          <Text style={{ color: '#fff', fontWeight: '700' }}>
            {currentOrder.length} items — ${(currentOrder.reduce((s: number, it: any) => s + Number(it.price || 0) * (it.quantity || 1), 0) || 0).toFixed(2)}
          </Text>
        </Pressable>
      )}

      <OrderSummarySheet
        visible={showSummary}
        onClose={() => setShowSummary(false)}
        order={currentOrder}
        origin={(route && route.params && route.params.origin) || null}
        onSubmit={submitOrder}
        selectedTable={selectedTable}
        orderType="dine-in"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  sidePanel: { position: 'absolute', right: 0, top: 0, bottom: 0, width: 420, padding: 16 },
  bottomBar: { position: 'absolute', left: 16, right: 16, bottom: 20, backgroundColor: '#10B981', padding: 12, borderRadius: 12, alignItems: 'center' },
});
