import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import MaterialIcon from '../lib/Icon';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { fetchDeliveryOrders, fetchCurrentBranchId } from '../services/orderService';

type DeliveredOrder = {
  id: string;
  orderId: string;
  customer: string;
  driver: string;
  total: number;
  deliveredAt: string;
};

const DeliveredOrdersScreen = () => {
  const [orders, setOrders] = useState<DeliveredOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const branchId = await fetchCurrentBranchId();
        if (!branchId) {
          throw new Error('Branch context is missing. Cannot load delivered orders.');
        }

        const rows = await fetchDeliveryOrders('delivered', branchId);
        const mappedOrders = rows.map((row) => ({
          id: row.id,
          orderId: row.order_number || row.id,
          customer: row.customer_name || 'Customer',
          driver: row.driver_id ? 'Assigned' : 'Unassigned',
          total: Number(row.total_amount ?? 0),
          deliveredAt: row.delivered_at || row.completed_at || '',
        }));
        setOrders(mappedOrders);
      } catch (err: any) {
        setError(err.message || 'Unable to load delivered orders');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

  const renderOrderItem = ({ item }: { item: DeliveredOrder }) => (
    <TouchableOpacity style={styles.orderCard} activeOpacity={0.7}>
      <View style={styles.orderHeader}>
        <View style={styles.headerContent}>
          <Text style={styles.orderId}>{item.orderId}</Text>
          <Text style={styles.customer}>{item.customer}</Text>
          <Text style={styles.driver}>{item.driver}</Text>
        </View>
        <Text style={styles.total}>${item.total.toFixed(2)}</Text>
      </View>
      <View style={styles.orderFooter}>
        <View style={styles.footerLeft}>
          <Text style={styles.itemsCount}>Delivered order</Text>
          <Text style={styles.deliveredAt}>{item.deliveredAt}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcon name="check-circle" size={24} color={COLORS.success} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Delivered Orders</Text>
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
        <MaterialIcon name="check-circle" size={24} color={COLORS.success} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Delivered Orders</Text>
          <Text style={styles.headerSubtitle}>{orders.length} orders completed</Text>
        </View>
      </View>
      {error ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={<Text style={styles.emptyText}>No delivered delivery orders found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background.primary,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.lg,
    backgroundColor: COLORS.surface.primary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  headerText: {
    marginLeft: SPACING.md,
    flex: 1,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  listContent: {
    padding: SPACING.lg,
  },
  orderCard: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: 8,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.success,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
  },
  headerContent: {
    flex: 1,
  },
  orderId: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
  },
  customer: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.text.secondary,
    marginTop: SPACING.xs,
  },
  driver: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  total: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    color: COLORS.primary.main,
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerLeft: {
    flex: 1,
  },
  itemsCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
  deliveredAt: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  errorText: {
    color: COLORS.error,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
  },
  emptyText: {
    color: COLORS.text.secondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: 'center',
    marginTop: SPACING.lg,
  },
});

export default DeliveredOrdersScreen;
