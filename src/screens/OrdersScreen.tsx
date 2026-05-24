import React from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { THEME } from '../theme';

const orderItems = [
  { id: '101', title: 'Order #101', details: '2x burgers, 1x fries', status: 'Preparing' },
  { id: '102', title: 'Order #102', details: '1x salad, 1x juice', status: 'Ready' },
  { id: '103', title: 'Order #103', details: '3x tacos, 2x soda', status: 'Delivered' },
];

export default function OrdersScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Orders</Text>
      <FlatList
        data={orderItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderTopRow}>
              <Text style={styles.orderTitle}>{item.title}</Text>
              <Text style={styles.orderStatus}>{item.status}</Text>
            </View>
            <Text style={styles.orderDetails}>{item.details}</Text>
          </View>
        )}
        contentContainerStyle={styles.orderList}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.secondary,
    padding: THEME.spacing.lg,
  },
  title: {
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    marginBottom: THEME.spacing.lg,
  },
  orderList: {
    paddingBottom: THEME.spacing.xl,
  },
  orderCard: {
    backgroundColor: THEME.colors.surface.primary,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    marginBottom: THEME.spacing.sm,
    ...THEME.shadows.shadowMd,
  },
  orderTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: THEME.spacing.sm,
  },
  orderTitle: {
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.md,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
  orderStatus: {
    color: THEME.colors.primary.main,
    fontSize: THEME.typography.fontSize.sm,
  },
  orderDetails: {
    color: THEME.colors.text.secondary,
    fontSize: THEME.typography.fontSize.sm,
  },
});
