import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';

import ProfileScreen from '../screens/ProfileScreen';
import PendingOrdersScreen from '../screens/PendingOrdersScreen';
import OrdersInDeliveryScreen from '../screens/OrdersInDeliveryScreen';
import DeliveredOrdersScreen from '../screens/DeliveredOrdersScreen';
import TablesScreen from '../screens/TablesScreen';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';

export type TabParamList = {
  Profile: undefined;
  Pending: undefined;
  InDelivery: undefined;
  Delivered: undefined;
  Tables: undefined;
};

const Tab = createBottomTabNavigator<TabParamList>();

const iconMap: Record<string, string> = {
  Profile: '👤',
  Pending: '⏳',
  InDelivery: '🚚',
  Delivered: '✅',
  Tables: '🍽️',
};

function TabBarIcon({ color, route }: { color: string; route: any }) {
  return <Text style={[styles.icon, { color }]}>{iconMap[route.name] ?? '•'}</Text>;
}

export default function MainTabNavigator() {
  const { data: profile } = useQuery(['profile'], async () => {
    const { data: userData } = await supabase.auth.getUser();
    const user = (userData as any)?.user;
    if (!user) return null;
    const { data, error } = await supabase.from('profiles').select('primary_role').eq('user_id', user.id).single();
    if (error) return null;
    return data;
  });

  const role = (profile?.primary_role || '')?.toLowerCase();

  const isManager = useMemo(() => role === 'manager' || role === 'super_manager' || role === 'systemmaster', [role]);
  const isSuperManager = useMemo(() => role === 'super_manager', [role]);
  const isHallManager = useMemo(() => role.includes('hall'), [role]);
  const isDriver = useMemo(() => role.includes('driver'), [role]);

  // Decide which tabs to show based on role
  const tabs = useMemo(() => {
    if (isSuperManager || isManager) return ['Profile', 'Pending', 'InDelivery', 'Delivered', 'Tables'];
    if (isHallManager) return ['Profile', 'Tables'];
    if (isDriver) return ['Profile', 'Pending', 'InDelivery', 'Delivered'];
    return ['Profile'];
  }, [isManager, isSuperManager, isHallManager, isDriver]);

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
      {tabs.includes('Profile') && <Tab.Screen name="Profile" component={ProfileScreen} options={{ title: '' }} />}
      {tabs.includes('Pending') && <Tab.Screen name="Pending" component={PendingOrdersScreen} options={{ title: '' }} />}
      {tabs.includes('InDelivery') && <Tab.Screen name="InDelivery" component={OrdersInDeliveryScreen} options={{ title: '' }} />}
      {tabs.includes('Delivered') && <Tab.Screen name="Delivered" component={DeliveredOrdersScreen} options={{ title: '' }} />}
      {tabs.includes('Tables') && <Tab.Screen name="Tables" component={TablesScreen} options={{ title: '' }} />}
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
