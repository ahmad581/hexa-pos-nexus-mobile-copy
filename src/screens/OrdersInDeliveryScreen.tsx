import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, Alert, Linking,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MaterialIcon from '../lib/Icon';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { supabase, fetchDriverDailyOrders  } from '../lib/supabase';
import {
  fetchDeliveryOrders, fetchCurrentBranchId, updateDeliveryOrderStatus,
  fetchDrivers, assignDriverToOrder, fetchCurrentUserRole, canManageDeliveries,
  type Driver, type AppRole, subscribeDeliveryOrders,
} from '../services/orderService';
import OrderDetailsModal from '../components/OrderDetailsModal';

type OrderInDelivery = {
  id: string; orderId: string; customer: string; customerPhone: string | null;
  driver: string; driverId: string | null;
  total: number; pickupTime: string; estimatedDelivery: string; address: string; createdAt: string, order_seq: string;
};

const formatAddress = (row: any) => {
  const parts = [row.delivery_address, row.delivery_city].filter(Boolean);
  const base = parts.join(', ');
  return row.delivery_notes ? `${base}${base ? ' — ' : ''}${row.delivery_notes}` : base;
};

const fetchCurrentEmployeeId = async (): Promise<string | null> => {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) return null;
  const { data } = await supabase
    .from('employees').select('id')
    .eq('email', user.email).eq('is_active', true).maybeSingle();
  return data?.id ?? null;
};

const todayKey = (employeeId: string) => {
  const d = new Date();
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return `driverDelivered:${employeeId}:${ymd}`;
};

const readTally = async (employeeId: string): Promise<{ ids: string[]; total: number }> => {
  try {
    const raw = await AsyncStorage.getItem(todayKey(employeeId));
    if (!raw) return { ids: [], total: 0 };
    const parsed = JSON.parse(raw);
    return { ids: Array.isArray(parsed.ids) ? parsed.ids : [], total: Number(parsed.total) || 0 };
  } catch { return { ids: [], total: 0 }; }
};

const appendToTally = async (employeeId: string, orderId: string, orderTotal: number) => {
  const current = await readTally(employeeId);
  if (current.ids.includes(orderId)) return current;
  const next = { ids: [...current.ids, orderId], total: current.total + (Number(orderTotal) || 0) };
  try { await AsyncStorage.setItem(todayKey(employeeId), JSON.stringify(next)); } catch {}
  return next;
};

const OrdersInDeliveryScreen = () => {
  const [orders, setOrders] = useState<OrderInDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);

  const [dailyStats, setDailyStats] = useState({ count: 0, total: 0 });

  const [employeeId, setEmployeeId] = useState<string | null>(null);

  const isDriver = role === 'Driver';
  
  const canManage = canManageDeliveries(role) && !isDriver;

  const loadOrders = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [branchId, currentRole, employeeId] = await Promise.all([
        fetchCurrentBranchId(), fetchCurrentUserRole(), fetchCurrentEmployeeId(),
      ]);
      setRole(currentRole);
      setEmployeeId(employeeId)
      if (!branchId) throw new Error('Branch context is missing. Cannot load delivery orders.');

      let rows = await fetchDeliveryOrders('in_delivery', branchId);
      if (currentRole === 'Driver') {
        if (!employeeId) { setOrders([]); return; }
        rows = rows.filter((r: any) => r.driver_id === employeeId);
      }

      const ids = Array.from(new Set(rows.map((r: any) => r.driver_id).filter(Boolean)));
      let nameById: Record<string, string> = {};
      if (ids.length) {
        const { data: emps } = await supabase
          .from('employees').select('id, first_name, last_name').in('id', ids as string[]);
        nameById = Object.fromEntries(
          (emps ?? []).map((e: any) => [e.id, `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Driver']),
        );
      }

      console.log('rows>>>', rows);
      

      setOrders(rows.map((row: any) => ({
        id: row.id,
        orderId: row.order_number || (row.order_seq ? `#${row.order_seq}` : row.id.slice(0, 8)),
        customer: row.customer_name || 'Customer',
        customerPhone: row.customer_phone ?? null,
        driverId: row.driver_id ?? null,
        driver: row.driver_id ? (nameById[row.driver_id] ?? 'Assigned') : 'Unassigned',
        total: Number(row.total_amount ?? 0),
        pickupTime: row.created_at ? new Date(row.created_at).toLocaleString() : '',
        estimatedDelivery: 'In transit',
        address: formatAddress(row),
        order_seq: row.order_seq ?? '',
        createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
      })));
    } catch (err: any) {
      setError(err.message || 'Unable to load delivery orders');
    } finally { setIsLoading(false); }
  }, []);

  const openAssignModal = async (orderId: string) => {
    setAssignOrderId(orderId);
    if (drivers !== null) return;
    setDriversLoading(true); setDriversError(null);
    try {
      const branchId = await fetchCurrentBranchId();
      if (!branchId) throw new Error('Branch context is missing.');
      setDrivers(await fetchDrivers(branchId));
    } catch (e: any) {
      setDriversError(e.message || 'Unable to load drivers');
    } finally { setDriversLoading(false); }
  };

  const reassignDriver = async (driverId: string) => {
    if (!assignOrderId) return;
    const id = assignOrderId;
    setIsUpdating(true);
    try {
      await assignDriverToOrder(id, driverId);
      const name = drivers?.find(d => d.id === driverId)?.name ?? 'Assigned';
      setOrders(prev => prev.map(o => o.id === id ? { ...o, driverId, driver: name } : o));
      setAssignOrderId(null);
    } catch (e: any) {
      Alert.alert('Update failed', e.message || 'Could not reassign driver');
    } finally { setIsUpdating(false); }
  };

  const loadDriverDailyStats = useCallback(async () => {
    if (!isDriver || !employeeId) {
      setDailyStats({ count: 0, total: 0 });
      return;
    }
    const live = await fetchDriverDailyOrders(employeeId);
    const tally = await readTally(employeeId);

    // Dedup: only count tally entries not already visible in the live result
    const liveSet = new Set(live.ids);
    const extraIds = tally.ids.filter(id => !liveSet.has(id));
    const extraTotal = extraIds.length === tally.ids.length
      ? tally.total
      : extraIds.reduce((s, id) => {
          // we don't track per-id totals, so fall back to proportional share
          return s + tally.total / tally.ids.length;
        }, 0);

    setDailyStats({
      count: live.count + extraIds.length,
      total: live.total + extraTotal,
    });
  }, [isDriver, employeeId]);

  const markDelivered = (id: string) => {
    const run = async () => {
      setIsUpdating(true);
      try {
        const delivered = orders.find(o => o.id === id);
        await updateDeliveryOrderStatus(id, 'delivered', { driverId: employeeId });
        if (isDriver && employeeId && delivered) {
          await appendToTally(employeeId, id, delivered.total);
        }
        setOrders(prev => prev.filter(o => o.id !== id));
        await loadDriverDailyStats();
      } catch (e: any) {
        if (Platform.OS === 'web') window.alert(e.message || 'Could not update the order');
        else Alert.alert('Update failed', e.message || 'Could not update the order');
      } finally {
        setIsUpdating(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm('Mark as delivered?\nThis will finalize the order and remove it from your delivery list.')) {
        run();
      }
      return;
    }

    Alert.alert(
      'Mark as delivered?',
      'This will finalize the order and remove it from your delivery list.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: run },
      ],
      { cancelable: true },
    );
  };

  const callClient = async (phone: string | null) => {
    if (!phone) { Alert.alert('No phone number', 'This customer has no phone on file.'); return; }
    const sanitized = phone.replace(/[^0-9+]/g, '');
    const url = `tel:${sanitized}`;
    const ok = await Linking.canOpenURL(url);
    if (!ok) { Alert.alert('Call unavailable', 'This device cannot place phone calls.'); return; }
    Linking.openURL(url);
  };

  const renderOrderItem = ({ item }: { item: OrderInDelivery }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.orderId}>{item.address}</Text>
        </View>
        <Text style={styles.total}>${item.total.toFixed(2)}</Text>
      </View>

      <Text style={styles.driver}>{item.driver}</Text>

      <View style={styles.addressRow}>
        <Text style={styles.addressText}>{item.order_seq}</Text>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.footerItem}>
          <Text style={styles.footerText}>{item.createdAt}</Text>
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity
          style={styles.iconBtn}
          onPress={() => setDetailsOrderId(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="View order details"
        >
          <MaterialIcon name="visibility" size={22} color={COLORS.text.secondary} />
        </TouchableOpacity>

        {canManage && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => openAssignModal(item.id)}
            disabled={isUpdating}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Reassign driver"
          >
            <MaterialIcon name="send to" size={22} color={COLORS.info} />
          </TouchableOpacity>
        )}

        {item.customerPhone ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => callClient(item.customerPhone)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Call client"
          >
            <MaterialIcon name="call" size={22} color={COLORS.primary.main} />
          </TouchableOpacity>
        ) : null}

        {isDriver && (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => markDelivered(item.id)}
            disabled={isUpdating}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Mark delivered"
          >
            <MaterialIcon name="check-circle" size={22} color={COLORS.success ?? '#16a34a'} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  useEffect(() => { loadDriverDailyStats(); }, [loadDriverDailyStats]);
  useEffect(() => {
    loadOrders();
    const unsubscribe = subscribeDeliveryOrders(loadOrders, 'in_delivery');
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [loadOrders]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcon name="local-shipping" size={24} color={COLORS.info} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Orders in Delivery</Text>
            <Text style={styles.headerSubtitle}>Loading orders…</Text>
          </View>
        </View>
        <View style={styles.loadingContainer}><ActivityIndicator size="large" color={COLORS.primary.main} /></View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcon name="local-shipping" size={24} color={COLORS.info} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Orders in Delivery</Text>
          <Text style={styles.headerSubtitle}>
            {isDriver
              ? `${dailyStats.count} assigned today • $${dailyStats.total.toFixed(2)}`
              : `${orders.length} orders on the way`}
          </Text>
        </View>
      </View>

      {error ? (
        <View style={styles.errorContainer}><Text style={styles.errorText}>{error}</Text></View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No delivery orders currently en route.</Text>}
          refreshing={isLoading}
          onRefresh={loadOrders}
        />
      )}

      <Modal
        visible={!!assignOrderId && !isUpdating && canManage}
        transparent animationType="slide"
        onRequestClose={() => setAssignOrderId(null)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setAssignOrderId(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Reassign driver</Text>
            {driversLoading ? (
              <ActivityIndicator color={COLORS.primary.main} style={{ paddingVertical: SPACING.lg }} />
            ) : driversError ? (
              <Text style={styles.errorText}>{driversError}</Text>
            ) : !drivers || drivers.length === 0 ? (
              <Text style={styles.emptyText}>No drivers available on this branch.</Text>
            ) : (
              drivers.map(d => (
                <TouchableOpacity key={d.id} style={styles.sheetItem} onPress={() => reassignDriver(d.id)}>
                  <MaterialIcon name="person" size={20} color={COLORS.info} />
                  <View style={{ marginLeft: 12, flex: 1 }}>
                    <Text style={styles.sheetItemText}>{d.name}</Text>
                    {d.phone ? <Text style={styles.driverPhone}>{d.phone}</Text> : null}
                  </View>
                </TouchableOpacity>
              ))
            )}
            <TouchableOpacity style={[styles.sheetItem, styles.cancelItem]} onPress={() => setAssignOrderId(null)}>
              <Text style={[styles.sheetItemText, { color: COLORS.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <OrderDetailsModal
        orderId={detailsOrderId}
        visible={!!detailsOrderId}
        onClose={() => setDetailsOrderId(null)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, backgroundColor: COLORS.surface.primary, borderBottomWidth: 1, borderBottomColor: COLORS.border.medium },
  headerText: { marginLeft: SPACING.md, flex: 1 },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  headerSubtitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  listContent: { padding: SPACING.lg },
  orderCard: { backgroundColor: COLORS.surface.primary, borderRadius: 8, padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.info },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderId: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  customer: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  driver: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginTop: SPACING.xs },
  total: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold as any, color: COLORS.primary.main },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  addressText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginLeft: 6 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginLeft: SPACING.xs },
  actionsRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginTop: SPACING.md, paddingTop: SPACING.sm, borderTopWidth: 1, borderTopColor: COLORS.border.medium },
  iconBtn: { padding: 8, borderRadius: 6 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg },
  errorText: { color: COLORS.error, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center' },
  emptyText: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.fontSize.sm, textAlign: 'center', marginTop: SPACING.lg },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: SPACING.lg },
  sheetTitle: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary, marginBottom: SPACING.md },
  sheetItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14 },
  sheetItemText: { fontSize: TYPOGRAPHY.fontSize.md, color: COLORS.text.primary, marginLeft: 12 },
  cancelItem: { justifyContent: 'center', borderTopWidth: 1, borderTopColor: COLORS.border.medium, marginTop: SPACING.sm },
  driverPhone: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginTop: 2 },
});

export default OrdersInDeliveryScreen;
