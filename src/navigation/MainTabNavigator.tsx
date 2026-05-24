import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';

import ProfileScreen from '../screens/ProfileScreen';
import PendingOrdersScreen from '../screens/PendingOrdersScreen';
import OrdersInDeliveryScreen from '../screens/OrdersInDeliveryScreen';
import DeliveredOrdersScreen from '../screens/DeliveredOrdersScreen';

export type TabParamList = {
  Profile: undefined;
  Pending: undefined;
  InDelivery: undefined;
  Delivered: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const iconMap: Record<string, string> = {
  Profile: '👤',
  Pending: '⏳',
  InDelivery: '🚚',
  Delivered: '✅',
};

function TabBarIcon({ color, route }: { color: string; route: any }) {
  return <Text style={[styles.icon, { color }]}>{iconMap[route.name] ?? '•'}</Text>;
}

export default function MainTabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={({ route }: { route: any }) => ({
        headerShown: false,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: THEME.colors.primary.main,
        tabBarInactiveTintColor: THEME.colors.text.tertiary,
        tabBarIcon: ({ color }: { color: string }) => (
          <TabBarIcon color={color} route={route} />
        ),
      })}
    >
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: 'Profile' }} />
      <Tab.Screen name="Pending" component={PendingOrdersScreen} options={{ title: 'Pending' }} />
      <Tab.Screen name="InDelivery" component={OrdersInDeliveryScreen} options={{ title: 'In Delivery' }} />
      <Tab.Screen name="Delivered" component={DeliveredOrdersScreen} options={{ title: 'Delivered' }} />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 70,
    paddingBottom: 10,
    paddingTop: 10,
    backgroundColor: THEME.colors.surface.primary,
    borderTopColor: THEME.colors.border.dark,
  },
  tabLabel: {
    fontSize: THEME.typography.fontSize.sm,
    marginTop: 2,
  },
  icon: {
    fontSize: 22,
  },
});
