import React, { useEffect, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View, Text, FlatList, StyleSheet, Pressable, useWindowDimensions,
  RefreshControl, ScrollView, Alert, TextInput, Modal,
} from 'react-native';
import MaterialIcon from '../lib/Icon';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useBranch, useSettings, useTranslation, useRole, useCall, useOrder } from '../hooks';
import MenuItemCard from '../components/menu/MenuItemCard';
import StatusPill from '../components/menu/StatusPill';
import { MenuItem, Category, Subcategory } from '../types/menu';

const COLORS = {
  bg: '#0B1220',
  panel: '#0F172A',
  card: '#1F2937',
  cardBorder: '#374151',
  chip: '#1F2937',
  chipActive: '#10B981',
  accent: '#10B981',
  danger: '#EF4444',
  text: '#F9FAFB',
  textDim: '#9CA3AF',
  badgeBlue: '#10B981',
};

export default function MenuScreen({ route, navigation }: any) {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= 768;
  const orderPanelWidth = Math.min(400, Math.max(300, Math.round(width * 0.32)));
  const quantityPadWidth = 60;
  const mobileCartHeight = Math.max(280, Math.min(360, Math.round(height * 0.42)));
  const _branchHook = useBranch() as any;
  const selectedBranch = _branchHook?.selectedBranch ?? _branchHook ?? null;
  const branchId = selectedBranch?.id || null;
  const { t } = useTranslation();
  const { isCashier } = useRole() as any;
  const { activeCallInfo, endCall, isInCall } = useCall() as any;
  const {
    addItemToOrder, currentOrder, setCustomerInfo, setOrderType, setSelectedTable,
    selectedTable, loadOrderForEditingById, setOriginRoute, clearCurrentOrder,
    removeItemFromOrder, updateItemQuantity, updateItemNotes, setCurrentOrder,
  } = useOrder() as any;

  const canMarkSoldOut = isCashier && isCashier();

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isRefreshing, setRefreshing] = useState(false);
  const [orderTypeLocal, setOrderTypeLocal] = useState('Dine In');
  const [showOrderTypeMenu, setShowOrderTypeMenu] = useState(false);
  const [notes, setNotes] = useState('');
  const [selectedQuantity, setSelectedQuantity] = useState('1');
  const [quantityEntryStarted, setQuantityEntryStarted] = useState(false);
  const [quantityEditItemId, setQuantityEditItemId] = useState<string | null>(null);
  const [quantityBeforeEdit, setQuantityBeforeEdit] = useState<{ value: string; started: boolean } | null>(null);

  // ---- Per-line (cart item) notes editor ----
  const [noteCartIndex, setNoteCartIndex] = useState<number | null>(null);
  const [itemNote, setItemNote] = useState('');

  const openCartItemNotes = (index: number) => {
    const it = currentOrder?.[index];
    if (!it) return;
    setItemNote(it.notes || '');
    setNoteCartIndex(index);
  };
  const closeItemNotes = () => setNoteCartIndex(null);
  const confirmItemNotes = () => {
    if (noteCartIndex === null) return;
    const trimmed = itemNote.trim();
    // Prefer a dedicated helper if the OrderContext exposes one
    if (typeof updateItemNotes === 'function') {
      const it = currentOrder?.[noteCartIndex];
      if (it) updateItemNotes(it.id, trimmed || null, noteCartIndex);
    } else if (typeof setCurrentOrder === 'function') {
      setCurrentOrder((prev: any[]) =>
        (prev || []).map((it, i) =>
          i === noteCartIndex ? { ...it, notes: trimmed || undefined } : it
        )
      );
    } else {
      // Last-resort mutation so the UI at least reflects the change locally
      if (currentOrder?.[noteCartIndex]) {
        currentOrder[noteCartIndex].notes = trimmed || undefined;
      }
    }
    closeItemNotes();
  };

  const editingItem = noteCartIndex !== null ? currentOrder?.[noteCartIndex] : null;

  const queryClient = useQueryClient();

  const { data: items = [] } = useQuery(['menu-items', branchId], async () => {
    if (!branchId) return [];
    const { data, error } = await supabase
      .from('menu_items').select('*').eq('branch_id', branchId)
      .order('display_order', { ascending: true }).order('created_at', { ascending: true });
    if (error) throw error;
    return (data || []).map((r: any) => ({
      id: r.id, name: r.name, description: r.description ?? '', price: Number(r.price),
      category: r.category, subcategory: r.subcategory ?? null, available: r.is_available,
      soldOut: !r.is_available, display_order: r.display_order, printerId: r.printer_id ?? null,
    } as MenuItem));
  }, { enabled: !!branchId });

  const { data: categories = [] } = useQuery(['menu-categories', branchId], async () => {
    if (!branchId) return [];
    const { data } = await supabase.from('menu_items').select('category').eq('branch_id', branchId);
    const uniques = Array.from(
      new Set<string>((data || []).map((d: any) => d.category).filter((value: any): value is string => Boolean(value)))
    );
    const { data: orderData } = await supabase.from('menu_category_order')
      .select('category_value,display_order,is_sold_out').eq('branch_id', branchId);
    const merged = uniques.map((v: string) => {
      const o = (orderData || []).find((x: any) => x.category_value === v);
      return {
        value: v, label: (v || '').charAt(0).toUpperCase() + (v || '').slice(1),
        soldOut: o?.is_sold_out || false, display_order: o?.display_order || 999,
      } as Category;
    });
    return merged.sort((a, b) => (a.display_order || 0) - (b.display_order || 0) || a.label.localeCompare(b.label));
  }, { enabled: !!branchId });

  const { data: subcategories = [] } = useQuery(['menu-subcategories', branchId], async () => {
    if (!branchId) return [];
    const { data } = await supabase.from('menu_subcategories').select('*')
      .eq('branch_id', branchId).order('display_order', { ascending: true });
    return (data || []).map((s: any) => ({
      id: s.id, value: s.subcategory_value, label: s.subcategory_label,
      category_value: s.category_value, is_sold_out: s.is_sold_out,
    } as Subcategory));
  }, { enabled: !!branchId });

  useEffect(() => {
    if (!selectedCategory && categories.length) setSelectedCategory(categories[0].value);
  }, [categories]);

  useEffect(() => {
    const params = (route && route.params) || {};
    const { editingOrderId, tableNumber, tableId, origin } = params;
    if (editingOrderId) { setOriginRoute('/orders'); loadOrderForEditingById(editingOrderId); }
    if (tableNumber) {
      setOrderType('dine-in');
      if (!selectedTable || selectedTable.table_number !== tableNumber || !selectedTable.id) {
        setSelectedTable({ id: tableId ?? null, table_number: tableNumber });
      }
      setOriginRoute(origin || '/tables');
    } else if (origin) setOriginRoute(origin);
  }, [route]);

  useEffect(() => {
    if (activeCallInfo && !currentOrder?.length) {
      setCustomerInfo && setCustomerInfo({
        name: activeCallInfo.customerName, phone: activeCallInfo.phoneNumber, address: activeCallInfo.address,
      });
    }
  }, [activeCallInfo]);

  const onRefresh = async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['menu-items', branchId] });
    await queryClient.invalidateQueries({ queryKey: ['menu-categories', branchId] });
    setRefreshing(false);
  };

  const filtered = items.filter((i: any) => i.category === selectedCategory);
  const filteredSubs = subcategories.filter((s: any) => s.category_value === selectedCategory);

  const orderTotal = (currentOrder || []).reduce(
    (s: number, it: any) => s + Number(it.price || 0) * (it.quantity || 1), 0,
  );
  const orderCount = (currentOrder || []).reduce((s: number, it: any) => s + (it.quantity || 1), 0);

  const enterQuantityDigit = (digit: string) => {
    setSelectedQuantity((current) => {
      if (!quantityEntryStarted) return digit;
      return current === '0' ? digit : `${current}${digit}`;
    });
    setQuantityEntryStarted(true);
  };

  const enterQuantityDecimal = () => {
    setSelectedQuantity((current) => {
      const base = quantityEntryStarted ? current : '0';
      return base.includes('.') ? base : `${base}.`;
    });
    setQuantityEntryStarted(true);
  };

  const removeQuantityDigit = () => {
    setSelectedQuantity((current) => {
      const trimmed = current.slice(0, -1);
      return trimmed && trimmed !== '.' ? trimmed : '0';
    });
    setQuantityEntryStarted(true);
  };

  const selectQuantityPreset = (value: string) => {
    setSelectedQuantity(value);
    setQuantityEntryStarted(true);
  };

  const cancelQuantityEdit = () => {
    setQuantityEditItemId(null);
    setSelectedQuantity(quantityBeforeEdit?.value ?? '1');
    setQuantityEntryStarted(quantityBeforeEdit?.started ?? false);
    setQuantityBeforeEdit(null);
  };

  const selectCartItemForQuantityEdit = (item: any) => {
    if (!quantityEditItemId) {
      setQuantityBeforeEdit({ value: selectedQuantity, started: quantityEntryStarted });
    }
    setQuantityEditItemId(item.id);
    setSelectedQuantity(String(item.quantity || 1));
    setQuantityEntryStarted(false);
  };

  const confirmQuantityEdit = () => {
    if (!quantityEditItemId) return;
    const quantity = Number(selectedQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Select a quantity greater than zero.');
      return;
    }

    updateItemQuantity?.(quantityEditItemId, quantity);
    cancelQuantityEdit();
  };

  const removeCartItem = (itemId: string) => {
    removeItemFromOrder?.(itemId);
    if (quantityEditItemId === itemId) cancelQuantityEdit();
  };

  const addMenuItem = (item: MenuItem) => {
    if (quantityEditItemId) {
      Alert.alert('Finish quantity edit', 'Confirm or cancel the current quantity edit first.');
      return;
    }
    const quantity = Number(selectedQuantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      Alert.alert('Invalid quantity', 'Select a quantity greater than zero.');
      return;
    }
    addItemToOrder(item, quantity);
    setSelectedQuantity('1');
    setQuantityEntryStarted(false);
  };

  const submitOrder = async () => {
    if (quantityEditItemId) {
      Alert.alert('Finish quantity edit', 'Confirm or cancel the current quantity edit first.');
      return;
    }
    if (!branchId) return Alert.alert('Missing branch');
    if (!currentOrder?.length) return Alert.alert('No items');
    try {
      const payload: any = {
        branch_id: branchId,
        order_number: `ORD-${Date.now().toString(36).toUpperCase()}`,
        total_amount: orderTotal,
        status: 'pending',
        notes: notes || null,
        created_at: new Date().toISOString(),
      };

      if (selectedTable) {
        const st = selectedTable as any;
        let resolvedTableId: string | null = st.id ?? null;
        if (!resolvedTableId && st.table_number != null) {
          const { data: tbl } = await supabase.from('tables').select('id')
            .eq('branch_id', branchId).eq('table_number', String(st.table_number)).maybeSingle();
          resolvedTableId = tbl?.id ?? null;
        }
        if (resolvedTableId) payload.table_id = resolvedTableId;
      }

      const { data: inserted, error } = await supabase.from('orders').insert(payload).select().single();
      if (error) throw error;

      if (inserted?.id && currentOrder.length) {
        const itemsPayload = currentOrder.map((it: any) => ({
          order_id: inserted.id, menu_item_id: it.id, product_name: it.name || '',
          quantity: it.quantity || 1, unit_price: it.price,
          total_price: Number(it.price || 0) * (it.quantity || 1),
          special_instructions: it.notes || null,
        }));
        const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
        if (itemsError) throw itemsError;
      }

      if (payload.table_id) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', payload.table_id);
      }

      await queryClient.refetchQueries({ queryKey: ['table-orders', branchId] });
      await queryClient.refetchQueries({ queryKey: ['tables', branchId] });
      clearCurrentOrder();
      cancelQuantityEdit();
      setNotes('');
      navigation?.navigate?.('App', { screen: 'Tables' });
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to submit order');
    }
  };

  const CategoryStrip = (
    <View style={[styles.categoryBar, isTablet && styles.tabletCategoryBar]}>
      {isTablet ? (
        <View style={styles.tabletCategoryGrid}>
          {categories.map((c: any) => {
            const active = c.value === selectedCategory;
            const count = items.filter((i: any) => i.category === c.value).length;
            return (
              <Pressable
                key={c.value}
                onPress={() => setSelectedCategory(c.value)}
                style={[styles.chip, styles.tabletChip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, styles.tabletChipText, active && { color: '#fff' }]}>
                  {c.label}
                </Text>
                <View style={styles.chipCount}>
                  <Text style={[styles.chipCountText, styles.tabletChipCountText]}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryList}>
          {categories.map((c: any) => {
            const active = c.value === selectedCategory;
            const count = items.filter((i: any) => i.category === c.value).length;
            return (
              <Pressable
                key={c.value}
                onPress={() => setSelectedCategory(c.value)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && { color: '#fff' }]}>{c.label}</Text>
                <View style={styles.chipCount}>
                  <Text style={styles.chipCountText}>{count}</Text>
                </View>
              </Pressable>
            );
          })}
        </ScrollView>
      )}
    </View>
  );

  const QuantityPad = (
    <View style={styles.quantityPad}>
      <View style={styles.quantityDisplay}>
        <Text style={styles.quantityDisplayText} numberOfLines={1}>{selectedQuantity}</Text>
      </View>
      <View style={styles.quantityEditActions}>
        <Pressable
          style={[styles.quantityEditKey, !quantityEditItemId && styles.quantityEditKeyDisabled]}
          onPress={confirmQuantityEdit}
          disabled={!quantityEditItemId}
          accessibilityLabel="Confirm quantity edit"
        >
          <MaterialIcon name="check" size={18} color={quantityEditItemId ? COLORS.accent : COLORS.textDim} />
        </Pressable>
        <Pressable
          style={[styles.quantityEditKey, !quantityEditItemId && styles.quantityEditKeyDisabled]}
          onPress={cancelQuantityEdit}
          disabled={!quantityEditItemId}
          accessibilityLabel="Cancel quantity edit"
        >
          <MaterialIcon name="close" size={18} color={quantityEditItemId ? COLORS.danger : COLORS.textDim} />
        </Pressable>
      </View>
      <Pressable style={styles.quantityKey} onPress={removeQuantityDigit} accessibilityLabel="Backspace">
        <Text style={styles.backspaceText}>⌫</Text>
      </Pressable>
      {['9', '8', '7', '6', '5', '4', '3', '2', '1', '0'].map((digit) => (
        <Pressable key={digit} style={styles.quantityKey} onPress={() => enterQuantityDigit(digit)}>
          <Text style={styles.quantityKeyText}>{digit}</Text>
        </Pressable>
      ))}
      <Pressable style={styles.quantityKey} onPress={enterQuantityDecimal}>
        <Text style={styles.quantityKeyText}>.</Text>
      </Pressable>
      {[
        { label: '.750', value: '0.750' },
        { label: '.500', value: '0.500' },
        { label: '.250', value: '0.250' },
      ].map((preset) => (
        <Pressable key={preset.value} style={styles.quantityKey} onPress={() => selectQuantityPreset(preset.value)}>
          <Text style={styles.quantityPresetText}>{preset.label}</Text>
        </Pressable>
      ))}
    </View>
  );

  // --- Order panel ---
  const OrderPanel = (
    <View style={[styles.orderPanel, isTablet ? styles.tabletOrderPanel : styles.mobileOrderPanel]}>
      {/* Header */}
      <View style={styles.orderHeader}>
        <View style={styles.branchBadge}>
          <Text style={styles.branchBadgeText}>{selectedBranch?.name || 'main'}</Text>
        </View>
        <View style={styles.countBadge}><Text style={styles.countBadgeText}>{orderCount}</Text></View>
      </View>

      {/* Cart */}
      <ScrollView style={styles.cartList} contentContainerStyle={styles.cartListContent}>
        {!currentOrder?.length ? (
          <View style={styles.emptyCart}>
            <MaterialIcon name="shopping-cart" size={48} color={COLORS.textDim} />
            <Text style={[styles.emptyTitle, isTablet && styles.tabletCartText]}>No items in current order</Text>
            <Text style={[styles.emptyHint, isTablet && styles.tabletCartMuted]}>Tap items to add them</Text>
          </View>
        ) : (
          <View style={styles.cartItems}>
            {currentOrder.map((it: any, idx: number) => (
              <View
                key={`${it.id}-${idx}`}
                style={[
                  styles.cartRow,
                  isTablet && styles.tabletCartRow,
                  quantityEditItemId === it.id && styles.selectedCartRow,
                ]}
              >
                <View style={styles.cartItemTop}>
                  <Pressable
                    style={styles.cartItemInfo}
                    onPress={() => selectCartItemForQuantityEdit(it)}
                    accessibilityRole="button"
                    accessibilityLabel={`Edit quantity for ${it.name}`}
                    accessibilityState={{ selected: quantityEditItemId === it.id }}
                  >
                    <Text style={[styles.cartName, isTablet && styles.tabletCartText]}>{it.name}</Text>
                    <Text style={[styles.cartPrice, isTablet && styles.tabletCartMuted]}>
                      JD{Number(it.price).toFixed(2)} × {it.quantity || 1}
                    </Text>
                  </Pressable>
                  <View style={styles.cartItemControls}>
                    <View style={[styles.qtyBox, isTablet && styles.tabletQtyBox]}>
                      <Pressable
                        accessibilityLabel={`Decrease ${it.name} quantity`}
                        onPress={() => updateItemQuantity?.(it.id, Math.max(0, (it.quantity || 1) - 1))}
                        disabled={quantityEditItemId === it.id}
                      >
                        <MaterialIcon name="remove" size={18} color={isTablet ? '#334155' : COLORS.text} />
                      </Pressable>
                      <Text style={[styles.qtyText, isTablet && styles.tabletCartText]}>{it.quantity || 1}</Text>
                      <Pressable
                        accessibilityLabel={`Increase ${it.name} quantity`}
                        onPress={() => updateItemQuantity?.(it.id, (it.quantity || 1) + 1)}
                        disabled={quantityEditItemId === it.id}
                      >
                        <MaterialIcon name="add" size={18} color={isTablet ? '#334155' : COLORS.text} />
                      </Pressable>
                    </View>
                    <Pressable
                      accessibilityLabel={`Remove ${it.name}`}
                      onPress={() => removeCartItem(it.id)}
                      style={styles.removeItemButton}
                    >
                      <MaterialIcon name="close" size={18} color={COLORS.danger} />
                    </Pressable>
                  </View>
                </View>
                <Pressable
                  onPress={() => openCartItemNotes(idx)}
                  style={styles.itemNoteButton}
                  accessibilityLabel={`${it.notes ? 'Edit' : 'Add'} note for ${it.name}`}
                >
                  <MaterialIcon name="edit" size={14} color={COLORS.accent} />
                  <Text style={styles.itemNoteButtonText}>{it.notes ? 'Edit item note' : 'Add item note'}</Text>
                </Pressable>
                {it.notes ? <Text style={styles.cartNotes} numberOfLines={2}>Note: {it.notes}</Text> : null}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* Notes */}
      <Text style={[styles.notesLabel, isTablet && styles.tabletCartText]}>Order Notes</Text>
      <TextInput
        value={notes} onChangeText={setNotes} placeholder="Add notes (optional)"
        placeholderTextColor={isTablet ? '#94A3B8' : COLORS.textDim}
        style={[styles.notesInput, isTablet && [styles.tabletNotesInput, styles.tabletInput]]}
        multiline
      />

      {/* Total */}
      <View style={[styles.totalRow, isTablet && styles.tabletTotalRow]}>
        <Text style={[styles.totalLabel, isTablet && styles.tabletCartText]}>Total</Text>
        <Text style={styles.totalValue}>JD{orderTotal.toFixed(2)}</Text>
      </View>

      {/* Action bar */}
      <View style={styles.actionsRow}>
        {/* <Pressable style={styles.actionGhost}>
          <MaterialIcon name="point-of-sale" size={20} color={COLORS.text} />
        </Pressable> */}
        <Pressable
          style={[styles.actionGhost, isTablet && styles.tabletActionGhost]}
          onPress={() => { clearCurrentOrder(); setNotes(''); cancelQuantityEdit(); }}
        >
          <MaterialIcon name="close" size={20} color={COLORS.danger} />
        </Pressable>
        <Pressable
          style={[
            styles.submitBtn,
            isTablet && styles.tabletSubmitBtn,
            (!currentOrder?.length || quantityEditItemId) && { opacity: 0.5 },
          ]}
          onPress={submitOrder} disabled={!currentOrder?.length || !!quantityEditItemId}
        >
          <Text style={{ color: COLORS.text }}>
            Submit
          </Text>
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isTablet && styles.tabletContainer]}>
      <View style={[styles.screenLayout, { flexDirection: isTablet ? 'row' : 'column' }]}>
        {isTablet && (
          <View style={[styles.tabletOrderPanelContainer, { width: orderPanelWidth }]}>
            {OrderPanel}
          </View>
        )}
        {isTablet && QuantityPad}

        {/* Menu area */}
        <View style={[styles.menuArea, isTablet && styles.tabletMenuArea]}>
          <View style={[styles.menuHeader, isTablet && styles.tabletMenuHeader]}>
            <Pressable
              onPress={() => navigation?.navigate?.('App', { screen: 'Tables' })}
              style={styles.cancelButton}
              hitSlop={8}
            >
              <MaterialIcon name="arrow-back" size={18} color={COLORS.text} />
              <Text style={[styles.cancelText, isTablet && styles.tabletCartText]}>Cancel</Text>
            </Pressable>
            <Text style={[styles.screenTitle, isTablet && styles.tabletCartText]}>Menu</Text>
            <View style={styles.headerSpacer} />
            {isInCall && activeCallInfo && (
              <View style={styles.callStatus}>
                <StatusPill onClose={() => { endCall(); navigation?.replace?.('/call-center'); }}>
                  📞 {t('order.takingOrderFor', 'Taking order for')}: {activeCallInfo.customerName} ({activeCallInfo.phoneNumber})
                </StatusPill>
              </View>
            )}
          </View>

          {!isTablet && CategoryStrip}

          {/* Subcategory cards */}
          {!isTablet && filteredSubs.length > 0 && (
            <ScrollView horizontal showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.subRow} style={styles.outerSubRow}>
              {filteredSubs.map((s: any) => (
                <View key={s.id} style={styles.subCard}>
                  <Text style={styles.subCardText}>{s.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}

          {/* Items — tap adds directly */}
          {isTablet ? (
            <ScrollView
              style={styles.menuItemsList}
              contentContainerStyle={styles.tabletMenuItemsContent}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
            >
              <View style={styles.tabletMenuItemsGrid}>
                {filtered.map((item: MenuItem) => (
                  <View key={item.id} style={styles.tabletMenuItemWrapper}>
                    <MenuItemCard
                      item={item}
                      onPress={() => addMenuItem(item)}
                      onLongPress={() => { if (canMarkSoldOut) { /* toggle sold out */ } }}
                      layout="grid"
                    />
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <FlatList
              data={filtered}
              keyExtractor={(i: any) => i.id}
              numColumns={2}
              renderItem={({ item }) => (
                <View style={styles.menuItemWrapper}>
                  <MenuItemCard
                    item={item}
                    onPress={() => addMenuItem(item)}
                    onLongPress={() => { if (canMarkSoldOut) { /* toggle sold out */ } }}
                  />
                </View>
              )}
              refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
              style={styles.menuItemsList}
              contentContainerStyle={styles.menuItemsContent}
            />
          )}
          {isTablet && CategoryStrip}
        </View>

        {/* Cart-item notes sheet */}
        <Modal
          visible={noteCartIndex !== null}
          transparent
          animationType="slide"
          onRequestClose={closeItemNotes}
        >
          <Pressable style={sheetStyles.backdrop} onPress={closeItemNotes} />
          <View style={sheetStyles.sheet}>
            <View style={sheetStyles.handle} />
            <Text style={sheetStyles.title}>{editingItem?.name || 'Item notes'}</Text>
            {editingItem ? (
              <Text style={sheetStyles.price}>
                JD{Number(editingItem.price ?? 0).toFixed(2)} × {editingItem.quantity || 1}
              </Text>
            ) : null}

            <Text style={sheetStyles.label}>Special instructions</Text>
            <TextInput
              value={itemNote}
              onChangeText={setItemNote}
              placeholder="e.g. no onions, extra spicy…"
              placeholderTextColor={COLORS.textDim}
              style={sheetStyles.input}
              multiline
              autoFocus
            />

            <View style={sheetStyles.actions}>
              <Pressable style={[styles.actionGhost, { flex: 1, width: undefined }]} onPress={closeItemNotes}>
                <Text style={{ color: COLORS.text, fontWeight: '700' }}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.submitBtn]} onPress={confirmItemNotes}>
                <Text style={{ color: '#fff', fontWeight: '800' }}>Save</Text>
              </Pressable>
            </View>
          </View>
        </Modal>

        {!isTablet && (
          <View style={[styles.mobileCartContainer, { height: mobileCartHeight }]}>
            {OrderPanel}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bg,
  },
  tabletContainer: { backgroundColor: COLORS.bg },
  screenLayout: { flex: 1, minHeight: 0 },
  menuArea: { flex: 1, minWidth: 0, minHeight: 0 },
  tabletMenuArea: { backgroundColor: COLORS.bg, borderLeftWidth: 1, borderLeftColor: COLORS.cardBorder },
  menuHeader: {
    minHeight: 58, flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 18, paddingVertical: 10, flexWrap: 'wrap',
  },
  tabletMenuHeader: { backgroundColor: COLORS.bg },
  cancelButton: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 84 },
  cancelText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  screenTitle: { color: COLORS.text, fontSize: 20, fontWeight: '800', flex: 1, textAlign: 'center' },
  headerSpacer: { minWidth: 84 },
  callStatus: { width: '100%', marginTop: 8 },

  categoryBar: { paddingBottom: 10 },
  tabletCategoryBar: {
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: COLORS.bg,
  },
  categoryList: { gap: 8, paddingHorizontal: 10 },
  tabletCategoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 10 },
  subRow: { paddingHorizontal: 16, gap: 10, paddingBottom: 8 },
  outerSubRow: { flexGrow: 0 },
  subCard: {
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
    borderRadius: 8, paddingVertical: 9, paddingHorizontal: 16, minWidth: 90,
  },
  subCardText: { color: COLORS.text, fontWeight: '700' },
  menuItemsList: { flex: 1, minHeight: 0 },
  menuItemsContent: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 16 },
  menuItemWrapper: { flex: 1, minWidth: 0, paddingHorizontal: 6, paddingBottom: 8 },
  tabletMenuItemsContent: { paddingHorizontal: 10, paddingTop: 4, paddingBottom: 16 },
  tabletMenuItemsGrid: { flexDirection: 'row', flexWrap: 'wrap', alignContent: 'flex-start' },
  tabletMenuItemWrapper: { width: 168, paddingHorizontal: 4, paddingBottom: 4 },
  chip: {
    backgroundColor: COLORS.chip, borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10,
    minWidth: 80, alignItems: 'center',
  },
  chipActive: { backgroundColor: COLORS.chipActive },
  tabletChip: {
    backgroundColor: COLORS.chip,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 5,
    minWidth: 96,
    minHeight: 52,
    justifyContent: 'center',
  },
  tabletChipText: { color: COLORS.text, fontWeight: '600', fontSize: 12 },
  tabletChipCountText: { color: COLORS.textDim, fontSize: 10 },
  chipText: { color: COLORS.text, fontWeight: '700' },
  chipCount: { marginTop: 2 },
  chipCountText: { color: 'rgba(255,255,255,0.7)', fontSize: 11 },

  // Order panel
  orderPanel: {
    flex: 1, minHeight: 0, backgroundColor: COLORS.panel, padding: 16,
    borderLeftWidth: 1, borderLeftColor: COLORS.cardBorder,
  },
  tabletOrderPanelContainer: { flexShrink: 0, minWidth: 0, minHeight: 0 },
  tabletOrderPanel: {
    width: '100%',
    flex: 1,
    backgroundColor: COLORS.panel,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    padding: 12,
  },
  mobileOrderPanel: { width: '100%', borderLeftWidth: 0, borderTopWidth: 1, borderTopColor: COLORS.cardBorder },
  mobileCartContainer: { flexShrink: 0 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, minHeight: 34 },
  branchBadge: { backgroundColor: COLORS.badgeBlue, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 6 },
  branchBadgeText: { color: '#fff', fontWeight: '700' },
  countBadge: {
    backgroundColor: COLORS.accent, width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { color: '#fff', fontWeight: '800' },

  orderTypeBtn: {
    borderWidth: 1, borderColor: COLORS.accent, borderRadius: 8,
    paddingHorizontal: 14, paddingVertical: 12, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between', marginBottom: 12,
  },
  orderTypeText: { color: COLORS.text, fontWeight: '600' },
  orderTypeMenu: {
    backgroundColor: COLORS.card, borderRadius: 8, marginTop: -8, marginBottom: 12,
    borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  orderTypeMenuItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder },

  emptyCart: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 40 },
  emptyTitle: { color: COLORS.text, fontWeight: '600', marginTop: 12 },
  emptyHint: { color: COLORS.textDim, fontSize: 12, marginTop: 4 },

  cartList: { flex: 1, minHeight: 60 },
  cartListContent: { flexGrow: 1, paddingBottom: 8 },
  cartItems: { paddingVertical: 4 },
  cartRow: {
    paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: COLORS.cardBorder,
  },
  selectedCartRow: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderRadius: 6,
    paddingHorizontal: 6,
  },
  tabletCartRow: { borderBottomColor: COLORS.cardBorder },
  cartItemTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6 },
  cartItemInfo: { flex: 1, minWidth: 0 },
  cartItemControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  removeItemButton: { width: 28, height: 34, alignItems: 'center', justifyContent: 'center' },
  cartName: { color: COLORS.text, fontWeight: '600' },
  cartPrice: { color: COLORS.textDim, fontSize: 12, marginTop: 2 },
  cartNotes: { color: COLORS.accent, fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  tabletCartText: { color: COLORS.text },
  tabletCartMuted: { color: COLORS.textDim },
  tabletQtyBox: { backgroundColor: COLORS.card },
  itemNoteButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    marginTop: 2,
  },
  itemNoteButtonText: { color: COLORS.accent, fontSize: 12, fontWeight: '600' },
  qtyBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.card, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4,
  },
  qtyText: { color: COLORS.text, fontWeight: '700', minWidth: 18, textAlign: 'center' },

  notesLabel: { color: COLORS.text, fontWeight: '600', marginTop: 8, marginBottom: 6 },
  notesInput: {
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
    color: COLORS.text, padding: 10, minHeight: 56, textAlignVertical: 'top',
  },
  tabletNotesInput: { minHeight: 50, borderRadius: 5, padding: 8 },
  tabletInput: { backgroundColor: COLORS.card, borderColor: COLORS.cardBorder, color: COLORS.text },

  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: 14, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.cardBorder,
  },
  tabletTotalRow: { borderTopColor: COLORS.cardBorder, paddingTop: 8, marginTop: 8 },
  totalLabel: { color: COLORS.text, fontSize: 16, fontWeight: '700' },
  totalValue: { color: COLORS.accent, fontSize: 18, fontWeight: '800' },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  actionGhost: {
    width: 44, height: 44, borderRadius: 8, alignItems: 'center', justifyContent: 'center',
    backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.cardBorder,
  },
  tabletActionGhost: { backgroundColor: COLORS.card, borderColor: COLORS.cardBorder },
  submitBtn: {
    flex: 1, height: 44, backgroundColor: COLORS.accent, borderRadius: 8,
    alignItems: 'center', justifyContent: 'center',
  },
  tabletSubmitBtn: { backgroundColor: COLORS.accent, borderRadius: 5 },
  quantityPad: {
    width: 60,
    flexShrink: 0,
    alignItems: 'stretch',
    gap: 4,
    paddingHorizontal: 4,
    paddingVertical: 4,
    backgroundColor: COLORS.panel,
    borderRightWidth: 1,
    borderRightColor: COLORS.cardBorder,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.cardBorder,
  },
  quantityDisplay: {
    height: 36,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: 5,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  quantityDisplayText: { color: COLORS.text, fontSize: 15, fontWeight: '700' },
  quantityEditActions: { flexDirection: 'row', gap: 4 },
  quantityEditKey: {
    flex: 1,
    minHeight: 36,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 5,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityEditKeyDisabled: { opacity: 0.45 },
  backspaceText: { color: COLORS.danger, fontSize: 18, fontWeight: '700' },
  quantityKey: {
    minHeight: 36,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 5,
    backgroundColor: COLORS.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 1,
  },
  quantityKeyText: { color: COLORS.text, fontSize: 15, fontWeight: '600' },
  quantityPresetText: { color: COLORS.text, fontSize: 11, fontWeight: '600' },
});

const sheetStyles = StyleSheet.create({
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    backgroundColor: COLORS.panel, padding: 16, paddingBottom: 28,
    borderTopLeftRadius: 16, borderTopRightRadius: 16,
    borderTopWidth: 1, borderColor: COLORS.cardBorder,
  },
  handle: {
    alignSelf: 'center', width: 40, height: 4, borderRadius: 2,
    backgroundColor: COLORS.cardBorder, marginBottom: 12,
  },
  title: { color: COLORS.text, fontSize: 18, fontWeight: '800' },
  price: { color: COLORS.accent, fontWeight: '700', marginTop: 2, marginBottom: 12 },
  label: { color: COLORS.text, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: COLORS.card, borderRadius: 8, borderWidth: 1, borderColor: COLORS.cardBorder,
    color: COLORS.text, padding: 10, minHeight: 80, textAlignVertical: 'top', marginBottom: 12,
  },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  actions: { flexDirection: 'row', gap: 10 },
});
