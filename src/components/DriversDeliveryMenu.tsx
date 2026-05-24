import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';
import { supabase } from '../services/supabase';

interface DriversDeliveryMenuProps {
  userRole?: string;
}

type SupabaseDriver = {
  id: string;
  first_name: string;
  last_name: string;
  vehicle_number: string;
  branch_id: string;
};

type SupabaseOrder = {
  id: string;
  order_number: string;
  customer_name: string;
  total: number;
  delivered_at: string;
  driver_id: string;
};

type DriverWithOrders = {
  id: string;
  name: string;
  vehicleNumber: string;
  totalDeliveries: number;
  totalEarnings: number;
  orders: {
    id: string;
    orderId: string;
    customer: string;
    amount: number;
    deliveredAt: string;
  }[];
};

const DriversDeliveryMenu: React.FC<DriversDeliveryMenuProps> = ({ userRole = 'manager' }) => {
  const [expandedDriverId, setExpandedDriverId] = useState<string | null>(null);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [drivers, setDrivers] = useState<DriverWithOrders[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Only show menu to managers and super managers
  const canViewMenu = userRole === 'manager' || userRole === 'super_manager' || userRole === 'cashier' || userRole === 'SystemMaster';
  
  useEffect(() => {
    if (!canViewMenu) return;
    const fetchDriversAndOrders = async () => {
      setLoading(true);
      setError(null);
      try {
        // Fetch all drivers (employees with role 'driver')
        const { data: driverRows, error: driverError } = await supabase
          .from('employees')
          .select('id, first_name, last_name, vehicle_number, branch_id, role')
          .in('role', ['driver'])
          .order('first_name', { ascending: true });

        if (driverError) throw driverError;
        if (!driverRows) throw new Error('No drivers found');

        // Fetch all delivered orders
        const { data: orderRows, error: orderError } = await supabase
          .from('orders')
          .select('id, order_number, customer_name, total, delivered_at, driver_id, status')
          .eq('status', 'delivered');

        if (orderError) throw orderError;

        // Map drivers to their delivered orders
        const driversWithOrders: DriverWithOrders[] = driverRows.map((driver: any) => {
          const orders = (orderRows || []).filter((order: any) => order.driver_id === driver.id);
          return {
            id: driver.id,
            name: `${driver.first_name || ''} ${driver.last_name || ''}`.trim(),
            vehicleNumber: driver.vehicle_number || '',
            totalDeliveries: orders.length,
            totalEarnings: orders.reduce((sum: number, o: any) => sum + (o.total || 0), 0),
            orders: orders.map((order: any) => ({
              id: order.id,
              orderId: order.order_number,
              customer: order.customer_name,
              amount: order.total,
              deliveredAt: order.delivered_at ? new Date(order.delivered_at).toLocaleString() : '',
            })),
          };
        });
        setDrivers(driversWithOrders);
      } catch (err: any) {
        setError(err.message || 'Failed to load drivers');
      } finally {
        setLoading(false);
      }
    };
    fetchDriversAndOrders();
  }, [canViewMenu]);

  if (!canViewMenu) {
    return null;
  }

  const toggleDriver = (driverId: string) => {
    setExpandedDriverId(expandedDriverId === driverId ? null : driverId);
  };

  const totalDeliveries = drivers.reduce((sum, driver) => sum + driver.totalDeliveries, 0);
  const totalEarnings = drivers.reduce((sum, driver) => sum + driver.totalEarnings, 0);

  return (
    <View style={styles.container}>
      {/* Menu Header */}
      <TouchableOpacity
        style={styles.menuHeader}
        onPress={() => setIsMenuOpen(!isMenuOpen)}
        activeOpacity={0.7}
      >
        <View style={styles.headerContent}>
          <MaterialIcons name="local-shipping" size={24} color={COLORS.primary.main} />
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Driver Deliveries</Text>
            <Text style={styles.headerSubtitle}>
              {drivers.length} Drivers • {totalDeliveries} Deliveries
            </Text>
          </View>
        </View>
        <MaterialIcons
          name={isMenuOpen ? 'expand-less' : 'expand-more'}
          size={24}
          color={COLORS.text.secondary}
        />
      </TouchableOpacity>

      {/* Loading/Error State */}
      {isMenuOpen && loading && (
        <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
          <ActivityIndicator size="small" color={COLORS.primary.main} />
          <Text style={{ color: COLORS.text.secondary, marginTop: SPACING.md }}>Loading drivers...</Text>
        </View>
      )}
      {isMenuOpen && error && (
        <View style={{ padding: SPACING.lg, alignItems: 'center' }}>
          <Text style={{ color: COLORS.error }}>{error}</Text>
        </View>
      )}

      {/* Summary Stats */}
      {isMenuOpen && !loading && !error && (
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Deliveries</Text>
            <Text style={styles.statValue}>{totalDeliveries}</Text>
          </View>
          <View style={[styles.statBox, styles.statBoxRight]}>
            <Text style={styles.statLabel}>Total Earnings</Text>
            <Text style={styles.statValue}>${totalEarnings}</Text>
          </View>
        </View>
      )}

      {/* Drivers List */}
      {isMenuOpen && !loading && !error && (
        <ScrollView style={styles.driversList} showsVerticalScrollIndicator={false}>
          {drivers.map((driver) => (
            <View key={driver.id} style={styles.driverCard}>
              {/* Driver Header */}
              <TouchableOpacity
                style={styles.driverHeader}
                onPress={() => toggleDriver(driver.id)}
                activeOpacity={0.7}
              >
                <View style={styles.driverInfo}>
                  <View style={styles.driverAvatar}>
                    <Text style={styles.avatarText}>{driver.name.charAt(0)}</Text>
                  </View>
                  <View style={styles.driverDetails}>
                    <Text style={styles.driverName}>{driver.name}</Text>
                    <Text style={styles.vehicleNumber}>{driver.vehicleNumber}</Text>
                  </View>
                </View>
                <View style={styles.driverStats}>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemLabel}>Deliveries</Text>
                    <Text style={styles.statItemValue}>{driver.totalDeliveries}</Text>
                  </View>
                  <View style={styles.statItem}>
                    <Text style={styles.statItemLabel}>Earnings</Text>
                    <Text style={styles.statItemValue}>${driver.totalEarnings}</Text>
                  </View>
                  <MaterialIcons
                    name={expandedDriverId === driver.id ? 'expand-less' : 'expand-more'}
                    size={20}
                    color={COLORS.text.secondary}
                  />
                </View>
              </TouchableOpacity>

              {/* Orders List */}
              {expandedDriverId === driver.id && (
                <View style={styles.ordersList}>
                  {driver.orders.map((order) => (
                    <View key={order.id} style={styles.orderItem}>
                      <View style={styles.orderHeader}>
                        <Text style={styles.orderId}>{order.orderId}</Text>
                        <Text style={styles.orderAmount}>${order.amount}</Text>
                      </View>
                      <Text style={styles.orderCustomer}>{order.customer}</Text>
                      <Text style={styles.orderTime}>{order.deliveredAt}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: SPACING.lg,
  },
  menuHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: COLORS.surface.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.background.secondary,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.medium,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statBoxRight: {
    borderLeftWidth: 1,
    borderLeftColor: COLORS.border.medium,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginBottom: SPACING.xs,
  },
  statValue: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    color: COLORS.primary.main,
  },
  driversList: {
    maxHeight: 500,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  driverCard: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: 8,
    marginBottom: SPACING.md,
    overflow: 'hidden',
  },
  driverHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border.dark,
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  driverAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  avatarText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    color: COLORS.background.primary,
  },
  driverDetails: {
    flex: 1,
  },
  driverName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
  },
  vehicleNumber: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
    marginTop: SPACING.xs,
  },
  driverStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: SPACING.md,
  },
  statItem: {
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  statItemLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
  statItemValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
    marginTop: SPACING.xs,
  },
  ordersList: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.surface.primary,
  },
  orderItem: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.sm,
    backgroundColor: COLORS.background.secondary,
    borderRadius: 6,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.primary.main,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: SPACING.xs,
  },
  orderId: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold as any,
    color: COLORS.text.primary,
  },
  orderAmount: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.bold as any,
    color: COLORS.primary.main,
  },
  orderCustomer: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.secondary,
    marginBottom: SPACING.xs,
  },
  orderTime: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.text.tertiary,
  },
});

export default DriversDeliveryMenu;
