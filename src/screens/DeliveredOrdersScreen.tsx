import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, Alert, ScrollView, Platform,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import MaterialIcon from '../lib/Icon';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { supabase } from '../lib/supabase';
import {
  fetchDeliveryOrders, fetchCurrentBranchId, updateDeliveryOrderStatus,
  fetchCurrentUserRole, canManageDeliveries, isManager,
  type DeliveryStatus, type AppRole, subscribeDeliveryOrders,
} from '../services/orderService';
import OrderDetailsModal from '../components/OrderDetailsModal';

type DeliveredOrder = {
  id: string; orderId: string; customer: string; driver: string;
  total: number; deliveredAt: string; address: string; order_seq: string; createdAt: string;
};

type CalcOrder = {
  id: string;
  total_amount: number;
  driver_id: string | null;
  delivered_at: string | null;
  delivery_price: number;
};

type DriverOption = { id: string; name: string };

type DateFieldProps = {
  label: string;
  value: Date | null;
  onChange: (d: Date | null) => void;
};

const toYMD = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const DateField: React.FC<DateFieldProps> = ({ label, value, onChange }) => {
  const [showNative, setShowNative] = useState(false);

  if (Platform.OS === 'web') {
    // Render a styled button that wraps a real <input type="date"> for full browser support.
    return (
      <View style={styles.dateFieldWrap}>
        <Text style={styles.dateFieldLabel}>{label}</Text>
        {/* @ts-ignore - raw DOM input on web */}
        <input
          type="date"
          value={value ? toYMD(value) : ''}
          onChange={(e: any) => {
            const v = e.target.value;
            if (!v) return onChange(null);
            const [y, m, d] = v.split('-').map(Number);
            onChange(new Date(y, m - 1, d, label.toLowerCase() === 'to' ? 23 : 0, label.toLowerCase() === 'to' ? 59 : 0, 0));
          }}
          style={{
            padding: 10,
            borderRadius: 8,
            border: `1px solid ${COLORS.border.medium}`,
            background: COLORS.background.secondary,
            color: COLORS.text.primary,
            fontSize: 14,
            minWidth: 140,
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.dateFieldWrap}>
      <Text style={styles.dateFieldLabel}>{label}</Text>
      <TouchableOpacity
        style={styles.dateFieldBtn}
        onPress={() => setShowNative(true)}
      >
        <Text style={styles.dateFieldBtnText}>
          {value ? value.toLocaleDateString() : 'Select…'}
        </Text>
      </TouchableOpacity>
      {showNative && (
        <DateTimePicker
          value={value ?? new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_event, selected) => {
            setShowNative(false);
            if (selected) {
              const d = new Date(selected);
              if (label.toLowerCase() === 'to') d.setHours(23, 59, 59, 999);
              else d.setHours(0, 0, 0, 0);
              onChange(d);
            }
          }}
        />
      )}
    </View>
  );
};

const formatAddress = (row: any) => {
  const parts = [row.delivery_address, row.delivery_city].filter(Boolean);
  const base = parts.join(', ');
  return row.delivery_notes ? `${base}${base ? ' — ' : ''}${row.delivery_notes}` : base;
};

const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x; };
const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x; };
const fmtDate = (d: Date | null) => d ? d.toLocaleDateString() : 'Any';

const DeliveredOrdersScreen = () => {
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const isDriver = role === 'Driver';
  const canManage = canManageDeliveries(role) && !isDriver;

  // Calculator state
  const [calcVisible, setCalcVisible] = useState(false);
  const [calcLoading, setCalcLoading] = useState(false);
  const [calcError, setCalcError] = useState<string | null>(null);
  const [calcOrders, setCalcOrders] = useState<CalcOrder[]>([]);
  const [calcDrivers, setCalcDrivers] = useState<DriverOption[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState<string>('all');

  // Date range
  const [startDate, setStartDate] = useState<Date | null>(startOfDay(new Date()));
  const [endDate, setEndDate] = useState<Date | null>(endOfDay(new Date()));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const loadOrders = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [branchId, currentRole] = await Promise.all([fetchCurrentBranchId(), fetchCurrentUserRole()]);
      setRole(currentRole);
      if (!branchId) throw new Error('Branch context is missing. Cannot load delivered orders.');
      const rows = await fetchDeliveryOrders('delivered', branchId);

      const ids = Array.from(new Set(rows.map((r: any) => r.driver_id).filter(Boolean)));
      let nameById: Record<string, string> = {};
      if (ids.length) {
        const { data: emps } = await supabase
          .from('employees').select('id, first_name, last_name').in('id', ids as string[]);
        nameById = Object.fromEntries(
          (emps ?? []).map((e: any) => [e.id, `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Driver']),
        );
      }

      setOrders(rows.map((row: any) => ({
        id: row.id,
        orderId: row.order_number || (row.order_seq ? `#${row.order_seq}` : row.id.slice(0, 8)),
        customer: row.customer_name || 'Customer',
        driver: row.driver_id ? (nameById[row.driver_id] ?? 'Assigned') : 'Unassigned',
        total: Number(row.total_amount ?? 0),
        deliveredAt: row.delivered_at
          ? new Date(row.delivered_at).toLocaleString()
          : row.completed_at ? new Date(row.completed_at).toLocaleString() : '',
        address: formatAddress(row),
        order_seq: row.order_seq || '',
        createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
      })));
    } catch (err: any) {
      setError(err.message || 'Unable to load delivered orders');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadOrders();
    const unsubscribe = subscribeDeliveryOrders(loadOrders, 'delivered');
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [loadOrders]);

  const loadCalcData = useCallback(async () => {
    setCalcLoading(true);
    setCalcError(null);
    try {
      const branchId = await fetchCurrentBranchId();
      if (!branchId) throw new Error('Branch context is missing.');

      const { data: ordersData, error: ordersErr } = await supabase
        .from('orders')
        .select('id, total_amount, driver_id, delivered_at, status, delivery_places(delivery_price)')
        .eq('branch_id', branchId)
        .eq('status', 'completed')
        .not('delivered_at', 'is', null);
      if (ordersErr) throw ordersErr;

      const normalized: CalcOrder[] = (ordersData || []).map((o: any) => ({
        id: o.id,
        total_amount: Number(o.total_amount) || 0,
        driver_id: o.driver_id,
        delivered_at: o.delivered_at,
        delivery_price: Number(o.delivery_places?.delivery_price) || 0,
      }));
      setCalcOrders(normalized);

      const { data: empRows, error: empErr } = await supabase
        .from('employees')
        .select('id, first_name, last_name, position, role, is_active, branch_id')
        .eq('branch_id', branchId)
        .eq('is_active', true)
        .order('first_name', { ascending: true });
      if (empErr) throw empErr;

      const drivers: DriverOption[] = (empRows || [])
        .filter((e: any) => {
          const p = (e.position || '').toLowerCase().trim();
          const r = (e.role || '').toLowerCase().trim();
          return p === 'driver' || r === 'driver';
        })
        .map((e: any) => ({
          id: e.id,
          name: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Driver',
        }));
      setCalcDrivers(drivers);
    } catch (e: any) {
      setCalcError(e.message ?? 'Failed to load calculator data');
    } finally {
      setCalcLoading(false);
    }
  }, []);

  const openCalculator = () => {
    setCalcVisible(true);
    setSelectedDriverId('all');
    setStartDate(startOfDay(new Date()));
    setEndDate(endOfDay(new Date()));
    loadCalcData();
  };

  const totals = useMemo(() => {
    const inScope = calcOrders.filter((o) => {
      const d = o.delivered_at ? new Date(o.delivered_at) : null;
      if (startDate || endDate) {
        if (!d) return false;
        if (startDate && d < startDate) return false;
        if (endDate && d > endDate) return false;
      }
      if (selectedDriverId === 'all') return true;
      if (selectedDriverId === 'unassigned') return !o.driver_id;
      return o.driver_id === selectedDriverId;
    });

    const fees = inScope.reduce((s, o) => s + o.delivery_price, 0);
    const grand = inScope.reduce((s, o) => s + o.total_amount, 0);
    const subtotal = grand - fees;
    return { subtotal, fees, grand, count: inScope.length };
  }, [calcOrders, startDate, endDate, selectedDriverId]);

  const handleStatusChange = async (next: DeliveryStatus) => {
    if (!actionOrderId) return;
    const id = actionOrderId;
    setIsUpdating(true);
    try {
      await updateDeliveryOrderStatus(id, next);
      setOrders(prev => prev.filter(o => o.id !== id));
      setActionOrderId(null);
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Could not update the order');
    } finally { setIsUpdating(false); }
  };

  const renderOrderItem = ({ item }: { item: DeliveredOrder }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.orderId}>{item.address}</Text>
        </View>
        <Text style={styles.total}>${item.total.toFixed(2)}</Text>
      </View>
      <Text style={styles.driver}>{item.driver}</Text>
      <View style={styles.addressRow}><Text style={styles.addressText}>{item.order_seq}</Text></View>
      <View style={styles.orderFooter}><View style={styles.footerLeft}><Text style={styles.deliveredAt}>{item.createdAt}</Text></View></View>
      <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => setDetailsOrderId(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="View order details">
          <MaterialIcon name="visibility" size={22} color={COLORS.text.secondary} />
        </TouchableOpacity>
        {canManage && (
          <TouchableOpacity style={styles.moreBtn} onPress={() => setActionOrderId(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <MaterialIcon name="more-vert" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  const renderHeader = (subtitle: string) => (
    <View style={styles.header}>
      <MaterialIcon name="check-circle" size={24} color={COLORS.success} />
      <View style={styles.headerText}>
        <Text style={styles.headerTitle}>Delivered Orders</Text>
        <Text style={styles.headerSubtitle}>{subtitle}</Text>
      </View>
      <TouchableOpacity style={styles.calcBtn} onPress={openCalculator}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} accessibilityLabel="Open driver earnings calculator">
        <MaterialIcon name="calculate" size={24} color={COLORS.primary.main} />
      </TouchableOpacity>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        {renderHeader('Loading orders…')}
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary.main} /></View>
      </View>
    );
  }

  const driverPickerOptions: DriverOption[] = [
    { id: 'all', name: 'All drivers' },
    { id: 'unassigned', name: 'Unassigned' },
    ...calcDrivers,
  ];

  const setQuickRange = (kind: 'today' | 'week' | 'month' | 'all') => {
    const now = new Date();
    if (kind === 'today') { setStartDate(startOfDay(now)); setEndDate(endOfDay(now)); }
    else if (kind === 'week') {
      const s = new Date(now); s.setDate(now.getDate() - 6);
      setStartDate(startOfDay(s)); setEndDate(endOfDay(now));
    } else if (kind === 'month') {
      const s = new Date(now); s.setDate(now.getDate() - 29);
      setStartDate(startOfDay(s)); setEndDate(endOfDay(now));
    } else { setStartDate(null); setEndDate(null); }
  };

  return (
    <View style={styles.container}>
      {renderHeader(`${orders.length} orders completed`)}

      {error ? (
        <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No delivered delivery orders found.</Text>}
          refreshing={isLoading}
          onRefresh={loadOrders}
        />
      )}

      {isManager(role) && (
        <Modal visible={!!actionOrderId && !isUpdating && canManage} transparent animationType="slide"
          onRequestClose={() => setActionOrderId(null)}>
          <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setActionOrderId(null)}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>Change status</Text>
              <TouchableOpacity style={styles.sheetItem} onPress={() => handleStatusChange('in_delivery')}>
                <MaterialIcon name="local-shipping" size={20} color={COLORS.info} />
                <Text style={styles.sheetItemText}>Move back to In Delivery</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.sheetItem, styles.cancelItem]} onPress={() => setActionOrderId(null)}>
                <Text style={[styles.sheetItemText, { color: COLORS.text.secondary }]}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      <Modal visible={calcVisible} transparent animationType="slide" onRequestClose={() => setCalcVisible(false)}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setCalcVisible(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calcSheet}>
            <Text style={styles.sheetTitle}>Driver earnings calculator</Text>

            {/* Quick presets */}
            <View style={styles.toggleRow}>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setQuickRange('today')}>
                <Text style={styles.toggleText}>Today</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setQuickRange('week')}>
                <Text style={styles.toggleText}>7d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setQuickRange('month')}>
                <Text style={styles.toggleText}>30d</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.toggleBtn} onPress={() => setQuickRange('all')}>
                <Text style={styles.toggleText}>All</Text>
              </TouchableOpacity>
            </View>

            {/* Date range pickers */}
            <View style={{ flexDirection: 'row', gap: 12, marginBottom: 12 }}>
              <DateField label="From" value={startDate} onChange={setStartDate} />
              <DateField label="To" value={endDate} onChange={setEndDate} />
            </View>

            {showStartPicker && (
              <DateTimePicker
                value={startDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowStartPicker(Platform.OS === 'ios');
                  if (d) setStartDate(startOfDay(d));
                }}
              />
            )}
            {showEndPicker && (
              <DateTimePicker
                value={endDate ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(_, d) => {
                  setShowEndPicker(Platform.OS === 'ios');
                  if (d) setEndDate(endOfDay(d));
                }}
              />
            )}

            <Text style={styles.calcLabel}>Driver ({calcDrivers.length} available)</Text>
            <ScrollView style={styles.driverList} nestedScrollEnabled>
              {driverPickerOptions.map(opt => (
                <TouchableOpacity key={opt.id}
                  style={[styles.driverItem, selectedDriverId === opt.id && styles.driverItemActive]}
                  onPress={() => setSelectedDriverId(opt.id)}>
                  <Text style={[styles.driverItemText, selectedDriverId === opt.id && styles.driverItemTextActive]}>
                    {opt.name}
                  </Text>
                  {selectedDriverId === opt.id && (
                    <MaterialIcon name="check" size={18} color={COLORS.primary.main} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>

            {calcLoading ? (
              <ActivityIndicator size="small" color={COLORS.primary.main} style={{ marginTop: SPACING.md }} />
            ) : calcError ? (
              <Text style={styles.errorText}>{calcError}</Text>
            ) : (
              <View style={styles.totalsBlock}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Orders ({totals.count})</Text>
                  <Text style={styles.totalValue}>${totals.subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery fees</Text>
                  <Text style={styles.totalValue}>${totals.fees.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandRow]}>
                  <Text style={styles.grandLabel}>Total</Text>
                  <Text style={styles.grandValue}>${totals.grand.toFixed(2)}</Text>
                </View>
              </View>
            )}

            <TouchableOpacity style={[styles.sheetItem, styles.cancelItem]} onPress={() => setCalcVisible(false)}>
              <Text style={[styles.sheetItemText, { color: COLORS.text.secondary }]}>Close</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      <OrderDetailsModal orderId={detailsOrderId} visible={!!detailsOrderId} onClose={() => setDetailsOrderId(null)} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, backgroundColor: COLORS.surface.primary, borderBottomWidth: 1, borderBottomColor: COLORS.border.medium },
  headerText: { marginLeft: SPACING.md, flex: 1 },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  headerSubtitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  calcBtn: { padding: 8, borderRadius: 6 },
  listContent: { padding: SPACING.lg },
  orderCard: { backgroundColor: COLORS.surface.primary, borderRadius: 8, padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.success },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  customer: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  driver: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginTop: SPACING.xs },
  total: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold as any, color: COLORS.primary.main, marginRight: SPACING.sm, alignSelf: 'flex-end' },
  moreBtn: { padding: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  addressText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginLeft: 6 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerLeft: { flex: 1 },
  itemsCount: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary },
  deliveredAt: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginTop: SPACING.xs },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border.medium },
  iconBtn: { padding: 8, borderRadius: 6 },
  dateFieldWrap: { flex: 1 },
  dateFieldLabel: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginBottom: 4 },
  dateFieldBtn: {
    paddingVertical: 10, paddingHorizontal: 12,
    borderRadius: 8, borderWidth: 1, borderColor: COLORS.border.medium,
    backgroundColor: COLORS.background.secondary,
  },
  dateFieldBtnText: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.fontSize.md },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  errorText: { color: COLORS.error, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
  emptyText: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center', marginTop: SPACING.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: SPACING.lg },
  calcSheet: { backgroundColor: COLORS.surface.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: SPACING.lg, maxHeight: '90%' },
  sheetTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary, marginBottom: SPACING.md },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  sheetItemText: { fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.text.primary, marginLeft: 12 },
  cancelItem: { justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.border.medium, marginTop: SPACING.sm },
  toggleRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  toggleBtn: { flex: 1, paddingVertical: 8, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: COLORS.border.medium },
  toggleText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary },
  dateRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.md },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 10, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border.medium },
  dateBtnText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.primary },
  calcLabel: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginBottom: SPACING.xs },
  driverList: { maxHeight: 200, borderWidth: 1, borderColor: COLORS.border.medium, borderRadius: 8 },
  driverItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border.medium },
  driverItemActive: { backgroundColor: COLORS.background.primary },
  driverItemText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.primary },
  driverItemTextActive: { color: COLORS.primary.main, fontWeight: TYPOGRAPHY.fontWeight.semibold as any },
  totalsBlock: { marginTop: SPACING.md, paddingTop: SPACING.md, borderTopWidth: 1, borderTopColor: COLORS.border.medium },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary },
  totalValue: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.primary, fontWeight: TYPOGRAPHY.fontWeight.semibold as any },
  grandRow: { marginTop: 6, paddingTop: 10, borderTopWidth: 1, borderTopColor: COLORS.border.medium },
  grandLabel: { fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.text.primary, fontWeight: TYPOGRAPHY.fontWeight.semibold as any },
  grandValue: { fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.primary.main, fontWeight: TYPOGRAPHY.fontWeight.bold as any },
});

export default DeliveredOrdersScreen;
