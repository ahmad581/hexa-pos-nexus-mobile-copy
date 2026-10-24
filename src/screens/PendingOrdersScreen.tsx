import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Modal, Alert,
} from 'react-native';
import MaterialIcon from '../lib/Icon';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import {
  fetchDeliveryOrders, fetchCurrentBranchId, updateDeliveryOrderStatus,
  fetchDrivers, fetchCurrentUserRole, canManageDeliveries, subscribeDeliveryOrders,
  type Driver, type AppRole,
} from '../services/orderService';
import OrderDetailsModal from '../components/OrderDetailsModal';

type PendingOrder = {
  id: string; orderId: string; customer: string; total: number;
  createdAt: string; address: string; order_seq: string;
};

const formatAddress = (row: any) => {
  const parts = [row.delivery_address, row.delivery_city].filter(Boolean);
  const base = parts.join(', ');
  return row.delivery_notes ? `${base}${base ? ' — ' : ''}${row.delivery_notes}` : base;
};

const PendingOrdersScreen = () => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  const [assignOrderId, setAssignOrderId] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<Driver[] | null>(null);
  const [driversLoading, setDriversLoading] = useState(false);
  const [driversError, setDriversError] = useState<string | null>(null);

  const [detailsOrderId, setDetailsOrderId] = useState<string | null>(null);

  const [role, setRole] = useState<AppRole | null>(null);
  const isDriver = role === 'Driver';
  const canManage = canManageDeliveries(role) && !isDriver;

  const loadOrders = useCallback(async () => {
    setIsLoading(true); setError(null);
    try {
      const [branchId, currentRole] = await Promise.all([fetchCurrentBranchId(), fetchCurrentUserRole()]);
      setRole(currentRole);
      if (!branchId) throw new Error('Branch context is missing. Cannot load delivery orders.');
      const rows = await fetchDeliveryOrders('pending', branchId);
      setOrders(rows.map((row: any) => ({
        id: row.id,
        orderId: row.order_number || (row.order_seq ? `#${row.order_seq}` : row.id.slice(0, 8)),
        customer: row.customer_name || 'Customer',
        total: Number(row.total_amount ?? 0),
        createdAt: row.created_at ? new Date(row.created_at).toLocaleString() : '',
        address: formatAddress(row),
        order_seq: row.order_seq || '',
      })));
    } catch (err: any) {
      setError(err.message || 'Unable to load pending delivery orders');
    } finally { setIsLoading(false); }
  }, []);

  useEffect(() => {
    loadOrders();
    const unsubscribe = subscribeDeliveryOrders(loadOrders, 'pending');
    return () => { if (typeof unsubscribe === 'function') unsubscribe(); };
  }, [loadOrders]);

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

  const assignDriver = async (driverId: string) => {
    if (!assignOrderId) return;
    setIsUpdating(true);
    try {
      await updateDeliveryOrderStatus(assignOrderId, 'in_delivery', { driverId });
      setOrders(prev => prev.filter(o => o.id !== assignOrderId));
      setAssignOrderId(null);
    } catch (e: any) {
      Alert.alert('Update failed', e.message || 'Could not assign driver');
    } finally { setIsUpdating(false); }
  };

  const renderOrderItem = ({ item }: { item: PendingOrder }) => {
    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <Text style={styles.orderId}>{item.address}</Text>
          <Text style={styles.total}>${item.total.toFixed(2)}</Text>
        </View>

        <View style={styles.addressRow}>
          <Text style={styles.addressText}>{item.order_seq}</Text>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.createdAt}>{item.createdAt}</Text>
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
              accessibilityLabel="Assign driver"
            >
              <MaterialIcon name="assign" size={22} color={COLORS.primary.main} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcon name="pending-actions" size={24} color={COLORS.primary.main} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Pending Orders</Text>
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
        <MaterialIcon name="pending-actions" size={24} color={COLORS.primary.main} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Pending Orders</Text>
          <Text style={styles.headerSubtitle}>{orders.length} orders waiting</Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No pending delivery orders found.</Text>}
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
            <Text style={styles.sheetTitle}>Assign driver</Text>
            {driversLoading ? (
              <ActivityIndicator color={COLORS.primary.main} style={{ paddingVertical: SPACING.lg }} />
            ) : driversError ? (
              <Text style={styles.errorText}>{driversError}</Text>
            ) : !drivers || drivers.length === 0 ? (
              <Text style={styles.emptyText}>No drivers available on this branch.</Text>
            ) : (
              drivers.map(d => (
                <TouchableOpacity key={d.id} style={styles.sheetItem} onPress={() => assignDriver(d.id)}>
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
  driverPhone: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary, marginTop: 2 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg, backgroundColor: COLORS.surface.primary, borderBottomWidth: 1, borderBottomColor: COLORS.border.medium },
  headerText: { marginLeft: SPACING.md, flex: 1 },
  headerTitle: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  headerSubtitle: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  listContent: { padding: SPACING.lg },
  orderCard: { backgroundColor: COLORS.surface.primary, borderRadius: 8, padding: SPACING.md, marginBottom: SPACING.md, borderLeftWidth: 4, borderLeftColor: COLORS.warning },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  orderId: { fontSize: TYPOGRAPHY.fontSize.md, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  customer: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginTop: SPACING.xs },
  total: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.bold as any, color: COLORS.primary.main },
  addressRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: SPACING.sm },
  addressText: { flex: 1, fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.text.secondary, marginLeft: 6 },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemsCount: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary },
  createdAt: { fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.tertiary },
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
});

export default PendingOrdersScreen;
