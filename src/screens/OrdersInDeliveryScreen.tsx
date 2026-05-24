import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

type OrderInDelivery = {
  id: string;
  orderId: string;
  customer: string;
  driver: string;
  items: number;
  total: number;
  pickupTime: string;
  estimatedDelivery: string;
};

const MOCK_IN_DELIVERY_ORDERS: OrderInDelivery[] = [
  {
    id: '1',
    orderId: 'ORD-004',
    customer: 'Alice Brown',
    driver: 'Michael Chen',
    items: 4,
    total: 67.75,
    pickupTime: '2024-05-18 12:15',
    estimatedDelivery: '2024-05-18 13:00',
  },
  {
    id: '2',
    orderId: 'ORD-005',
    customer: 'Charlie Wilson',
    driver: 'Sarah Johnson',
    items: 3,
    total: 54.30,
    pickupTime: '2024-05-18 12:30',
    estimatedDelivery: '2024-05-18 13:15',
  },
];

const OrdersInDeliveryScreen = () => {
  const [orders] = useState<OrderInDelivery[]>(MOCK_IN_DELIVERY_ORDERS);

  const renderOrderItem = ({ item }: { item: OrderInDelivery }) => (
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
        <View style={styles.footerItem}>
          <MaterialIcons name="schedule" size={14} color={COLORS.text.tertiary} />
          <Text style={styles.footerText}>{item.pickupTime}</Text>
        </View>
        <View style={styles.footerItem}>
          <MaterialIcons name="local-shipping" size={14} color={COLORS.info} />
          <Text style={styles.footerText}>{item.estimatedDelivery}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="local-shipping" size={24} color={COLORS.info} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Orders in Delivery</Text>
          <Text style={styles.headerSubtitle}>{orders.length} orders on the way</Text>
        </View>
      </View>
      <FlatList
        data={orders}
        renderItem={renderOrderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
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
    borderLeftColor: COLORS.info,
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
  },
  footerItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  footerText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginLeft: SPACING.xs,
  },
});

export default OrdersInDeliveryScreen;
