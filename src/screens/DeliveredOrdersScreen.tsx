import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

type DeliveredOrder = {
  id: string;
  orderId: string;
  customer: string;
  driver: string;
  items: number;
  total: number;
  deliveredAt: string;
  rating?: number;
};

const MOCK_DELIVERED_ORDERS: DeliveredOrder[] = [
  {
    id: '1',
    orderId: 'ORD-101',
    customer: 'Emma Davis',
    driver: 'John Smith',
    items: 2,
    total: 38.50,
    deliveredAt: '2024-05-18 09:30',
    rating: 5,
  },
  {
    id: '2',
    orderId: 'ORD-102',
    customer: 'Frank Miller',
    driver: 'Sarah Johnson',
    items: 4,
    total: 72.00,
    deliveredAt: '2024-05-18 10:15',
    rating: 4,
  },
  {
    id: '3',
    orderId: 'ORD-103',
    customer: 'Grace Lee',
    driver: 'Michael Chen',
    items: 3,
    total: 56.75,
    deliveredAt: '2024-05-18 11:00',
    rating: 5,
  },
];

const DeliveredOrdersScreen = () => {
  const [orders] = useState<DeliveredOrder[]>(MOCK_DELIVERED_ORDERS);

  const renderStars = (rating: number | undefined) => {
    if (!rating) return null;
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <MaterialIcons
            key={star}
            name={star <= rating ? 'star' : 'star-outline'}
            size={14}
            color={COLORS.warning}
          />
        ))}
      </View>
    );
  };

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
          <Text style={styles.itemsCount}>{item.items} items</Text>
          <Text style={styles.deliveredAt}>{item.deliveredAt}</Text>
        </View>
        {renderStars(item.rating)}
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialIcons name="check-circle" size={24} color={COLORS.success} />
        <View style={styles.headerText}>
          <Text style={styles.headerTitle}>Delivered Orders</Text>
          <Text style={styles.headerSubtitle}>{orders.length} orders completed</Text>
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
  ratingContainer: {
    flexDirection: 'row',
    gap: SPACING.xs,
  },
});

export default DeliveredOrdersScreen;
