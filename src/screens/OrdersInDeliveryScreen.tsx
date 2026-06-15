import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import MaterialIcon from '../lib/Icon';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { supabase } from '../lib/supabase';
import {
  fetchDeliveryOrders,
  fetchCurrentBranchId,
  updateDeliveryOrderStatus,
  fetchDrivers,
  assignDriverToOrder,
  fetchCurrentUserRole,
  canManageDeliveries,
  type DeliveryStatus,
  type Driver,
  type AppRole,
  subscribeDeliveryOrders,
} from '../services/orderService';

type OrderInDelivery = {
  id: string; orderId: string; customer: string; driver: string; driverId: string | null;
  total: number; pickupTime: string; estimatedDelivery: string; address: string;
};

const formatAddress = (row: any) => {
  const parts = [row.delivery_address, row.delivery_city].filter(Boolean);
  const base = parts.join(', ');
  return row.delivery_notes ? `${base}${base ? ' — ' : ''}${row.delivery_notes}` : base;
};

const OrdersInDeliveryScreen = () => {
  const [orders, setOrders] = useState<OrderInDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [actionOrderId, setActionOrderId] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const [role, setRole] = useState<AppRole | null>(null);
  const canManage = canManageDeliveries(role);

  const loadOrders = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [branchId, currentRole] = await Promise.all([
        fetchCurrentBranchId(),
        fetchCurrentUserRole(),
      ]);
      setRole(currentRole);
      if (!branchId) throw new Error('Branch context is missing. Cannot load delivery orders.');
      const rows = await fetchDeliveryOrders('in_delivery', branchId);

      const ids = Array.from(new Set(rows.map((r: any) => r.driver_id).filter(Boolean)));
      let nameById: Record<string, string> = {};
      if (ids.length) {
        const { data: emps } = await supabase
          .from('employees')
          .select('id, first_name, last_name')
          .in('id', ids as string[]);
        nameById = Object.fromEntries(
          (emps ?? []).map((e: any) => [e.id, `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Driver']),
        );
      }

      setOrders(rows.map((row: any) => ({
        id: row.id,
        orderId: row.order_number || (row.order_seq ? `#${row.order_seq}` : row.id.slice(0, 8)),
        customer: row.customer_name || 'Customer',
        driverId: row.driver_id ?? null,
        driver: row.driver_id ? (nameById[row.driver_id] ?? 'Assigned') : 'Unassigned',
        total: Number(row.total_amount ?? 0),
        pickupTime: row.created_at ? new Date(row.created_at).toLocaleString() : '',
        estimatedDelivery: 'In transit',
        address: formatAddress(row),
      })));
    } catch (err: any) {
      setError(err.message || 'Unable to load delivery orders');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadOrders();
    const unsubscribe = subscribeDeliveryOrders(loadOrders, 'in_delivery');
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [loadOrders]);

  const handleStatusChange = async (next: DeliveryStatus) => {
    if (!actionOrderId) return;
    const id = actionOrderId;
    setIsUpdating(true);
    try {
      await updateDeliveryOrderStatus(id, next, next === 'pending' ? { driverId: null } : undefined);
      setOrders(prev => prev.filter(o => o.id !== id));
      setActionOrderId(null);
    } catch (err: any) {
      Alert.alert('Update failed', err.message || 'Could not update the order');
    } finally { setIsUpdating(false); }
  };

  const openAssignModal = async (orderId: string) => {
    setActionOrderId(null);
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

  const handleStatusChangeFor = async (id: string, next: DeliveryStatus) => {
    setIsUpdating(true);
    try {
      await updateDeliveryOrderStatus(id, next);
      setOrders(prev => prev.filter(o => o.id !== id));
    } catch (e: any) {
      Alert.alert('Update failed', e.message || 'Could not update the order');
    } finally { setIsUpdating(false); }
  };

  const renderOrderItem = ({ item }: { item: OrderInDelivery }) => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.orderId}>{item.orderId}</Text>
          <Text style={styles.customer}>{item.customer}</Text>
          <Text style={styles.driver}>{item.driver}</Text>
        </View>
        <Text style={styles.total}>${item.total.toFixed(2)}</Text>
        {canManage && (
          <TouchableOpacity
            style={styles.moreBtn}
            onPress={() => setActionOrderId(item.id)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <MaterialIcon name="more-vert" size={22} color={COLORS.text.secondary} />
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.addressRow}>
        <MaterialIcon name="place" size={16} color={COLORS.text.secondary} />
        <Text style={styles.addressText} numberOfLines={2}>
          {item.address || 'No address provided'}
        </Text>
      </View>

      <View style={styles.orderFooter}>
        <View style={styles.footerItem}>
          <MaterialIcon name="schedule" size={14} color={COLORS.text.tertiary} />
          <Text style={styles.footerText}>{item.pickupTime}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcon name="local-shipping" size={14} color={COLORS.info} />
          <Text style={styles.footerText}>{item.estimatedDelivery}</Text>
        </View>
      </View>

      {canManage && (
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => handleStatusChangeFor(item.id, 'delivered')}
          disabled={isUpdating}
        >
          <MaterialIcon name="check-circle" size={16} color="#fff" />
          <Text style={styles.primaryBtnText}>Mark Delivered</Text>
        </TouchableOpacity>
      )}
    </View>
  );

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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary.main} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcon name="local-shipping" size={24} color={COLORS.info} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Orders in Delivery</Text>
          <Text style={styles.headerSubtitle}>{orders.length} orders on the way</Text>
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
        visible={!!actionOrderId && !isUpdating && canManage}
        transparent animationType="slide"
        onRequestClose={() => setActionOrderId(null)}
      >
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={() => setActionOrderId(null)}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Order actions</Text>
            <TouchableOpacity style={styles.sheetItem} onPress={() => handleStatusChange('delivered')}>
              <MaterialIcon name="check-circle" size={20} color={COLORS.success ?? '#16a34a'} />
              <Text style={styles.sheetItemText}>Mark Delivered</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={() => actionOrderId && openAssignModal(actionOrderId)}>
              <MaterialIcon name="person" size={20} color={COLORS.info} />
              <Text style={styles.sheetItemText}>Reassign Driver</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.sheetItem} onPress={() => handleStatusChange('pending')}>
              <MaterialIcon name="pending-actions" size={20} color={COLORS.warning} />
              <Text style={styles.sheetItemText}>Move back to Pending</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.sheetItem, styles.cancelItem]} onPress={() => setActionOrderId(null)}>
              <Text style={[styles.sheetItemText, { color: COLORS.text.secondary }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

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
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: SPACING.md },
  headerContent: { flex: 1 },
  orderId: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  customer: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  driver: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginTop: SPACING.xs },
  total: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold as any, color: COLORS.primary.main, marginRight: SPACING.sm },
  moreBtn: { padding: 4 },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  addressText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginLeft: 6 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  footerItem: { flexDirection: 'row', alignItems: 'center' },
  footerText: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginLeft: SPACING.xs },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success ?? COLORS.primary.main, paddingVertical: 10, borderRadius: 6, marginTop: SPACING.md },
  primaryBtnText: { color: '#fff', fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, marginLeft: 6 },
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
