import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { fetchDeliveryOrders, fetchCurrentBranchId } from '../services/orderService';

type PendingOrder = {
  id: string;
  orderId: string;
  customer: string;
  total: number;
  createdAt: string;
};

const PendingOrdersScreen = () => {
  const [orders, setOrders] = useState<PendingOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const branchId = await fetchCurrentBranchId();
        if (!branchId) {
          throw new Error('Branch context is missing. Cannot load delivery orders.');
        }

        const rows = await fetchDeliveryOrders('pending', branchId);
        const mappedOrders = rows.map((row) => ({
          id: row.id,
          orderId: row.order_number || row.id,
          customer: row.customer_name || 'Customer',
          total: Number(row.total_amount ?? 0),
          createdAt: row.created_at || '',
        }));
        setOrders(mappedOrders);
      } catch (err: any) {
        setError(err.message || 'Unable to load pending delivery orders');
      } finally {
        setIsLoading(false);
      }
    };

    loadOrders();
  }, []);

  const renderOrderItem = ({ item }: { item: PendingOrder }) => (
    <TouchableOpacity style={styles.orderCard} activeOpacity={0.7}>
      <View style={styles.orderHeader}>
        <View>
          <Text style={styles.orderId}>{item.orderId}</Text>
          <Text style={styles.customer}>{item.customer}</Text>
        </View>
        <Text style={styles.total}>${item.total.toFixed(2)}</Text>
      </View>
      <View style={styles.orderFooter}>
        <Text style={styles.itemsCount}>Delivery order</Text>
        <Text style={styles.createdAt}>{item.createdAt}</Text>
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <MaterialIcons name="pending-actions" size={24} color={COLORS.primary.main} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Pending Orders</Text>
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
        <MaterialIcons name="pending-actions" size={24} color={COLORS.primary.main} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Pending Orders</Text>
          <Text style={styles.headerSubtitle}>{orders.length} orders waiting</Text>
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
          ListEmptyComponent={<Text style={styles.emptyText}>No pending delivery orders found.</Text>}
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
    borderLeftColor: COLORS.warning,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: SPACING.md,
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
  itemsCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
  createdAt: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
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

export default PendingOrdersScreen;
