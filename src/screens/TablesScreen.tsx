import React, { useMemo, useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  StyleSheet,
  Pressable,
  Platform,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import MaterialIcon from '../lib/Icon';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../hooks/useAuth';
import { useBranch } from '../hooks/useBranch';
import { useRole } from '../hooks/useRole';
import { useTranslation } from '../hooks/useTranslation';
import { useOrder } from '../hooks';
import { useRealtimeSubscription } from '../hooks/useRealtimeSubscription';

import AddUnitSheet from '../components/tables/AddUnitSheet';
import EditTableSheet from '../components/tables/EditTableSheet';
import TableOrderDetailsSheet from '../components/tables/TableOrderDetailsSheet';
import MoveTableSheet from '../components/tables/MoveTableSheet';
import ReserveTableSheet from '../components/tables/ReserveTableSheet';

export default function TablesScreen() {
  const { width } = useWindowDimensions();
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const { user } = useAuth() as any;
  const branch = useBranch() as any;
  const { isHallManager } = useRole() as any;
  const order = useOrder() as any;

  const branchId = branch?.id || null;

  const { data: tables = [], isLoading: loadingTables } = useQuery(
    ['tables', branchId],
    async () => {
      const { data, error } = await supabase
        .from('tables')
        .select('id,table_number,status,capacity,reserved_for,reserved_at,reservation_notes,branch_id')
        .eq('branch_id', branchId)
        .order('table_number', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    { enabled: !!branchId }
  );

  const { data: activeOrders = [] } = useQuery(
    ['table-orders', branchId],
    async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('id,table_id,status')
        .eq('branch_id', branchId)
        .in('status', ['pending', 'preparing', 'ready']);
      if (error) throw error;
      return data || [];
    },
    { enabled: !!branchId }
  );

  // Live updates — replaces the old 10s poll. Streams from Supabase Realtime,
  // scoped to the current branch, and invalidates the corresponding queries.
  useRealtimeSubscription(
    'orders',
    ['table-orders', branchId],
    branchId ? `branch_id=eq.${branchId}` : undefined,
    !!branchId,
  );
  useRealtimeSubscription(
    'tables',
    ['tables', branchId],
    branchId ? `branch_id=eq.${branchId}` : undefined,
    !!branchId,
  );

  const tablesWithOrders = useMemo(() => {
    const set = new Set((activeOrders || []).map((o: any) => o.table_id));
    return set;
  }, [activeOrders]);

  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showOrderDetails, setShowOrderDetails] = useState(false);
  const [showMove, setShowMove] = useState(false);
  const [showReserve, setShowReserve] = useState(false);

  const numColumns = width >= 768 ? 4 : 1;
  const visibleTables = tables.filter((table: any) => table?.id != null);

  if (!branchId) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>{t('tables.noBranch', 'No branch selected')}</Text>
        </View>
      </SafeAreaView>
    );
  }

  function hasOrders(tableId: string) {
    return tablesWithOrders.has(tableId);
  }

  const handlePrimary = async (table: any) => {
    try {
      order.setOrderType('dine-in');
      order.setSelectedTable(table);
      if (branchId && order.loadOrderForEditingById) {
        await order.loadOrderForEditingById(String(table.table_number));
      }
    } catch (e) {
      // ignore
    }

    try {
      (navigation as any).navigate('Menu', {
        tableId: table.id,
        tableNumber: table.table_number,
        origin: '/tables',
      });
    } catch (e) {
      try { (navigation as any).navigate('Pending'); } catch (e) {}
    }
  };

  const renderTableCard = (item: any) => {
    const reserved = item.status === 'reserved' && item.reserved_for;
    const statusColor = (() => {
      switch (item.status) {
        case 'available': return '#10B981';
        case 'occupied':  return '#EF4444';
        case 'reserved':  return '#F59E0B';
        case 'cleaning':  return '#3B82F6';
        default:          return '#9CA3AF';
      }
    })();

    return (
      <View style={[styles.gridCell, { width: `${100 / numColumns}%` }]}>
        <View style={styles.card}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.headerLeft}>
              <Text style={styles.tableTitle}>{`${t('tables.tableNumber','Table')} ${item.table_number}`}</Text>
              {reserved ? (
                <Text style={styles.reservedTextSmall}>{`${t('tables.reservedFor','Reserved for')} ${item.reserved_for}`}</Text>
              ) : null}
            </View>

            <View style={styles.headerRight}>
              <View style={[styles.badge, { backgroundColor: statusColor }]}>
                <Text style={styles.badgeText}>{t(`tables.${item.status}`, item.status)}</Text>
              </View>
              {!isHallManager?.() && (
                <Pressable onPress={() => { setSelectedTable(item); setShowEdit(true); }} style={styles.iconButton}>
                  <MaterialIcon name="edit" size={18} color="#fff" />
                </Pressable>
              )}
            </View>
          </View>

          {reserved && (
            <Text style={styles.reservedText}>{`${new Date(item.reserved_at).toLocaleString()}`}</Text>
          )}

          <View style={styles.actions}>
            <Pressable style={styles.primary} onPress={() => handlePrimary(item)}>
              <Text style={styles.primaryText}>{hasOrders(item.id) ? t('tables.takeOrder','Take Order') : t('tables.addOrder','Add Order')}</Text>
            </Pressable>

            <Pressable style={[styles.outline, !hasOrders(item.id) && styles.disabled]} onPress={() => { setSelectedTable(item); setShowOrderDetails(true); }} disabled={!hasOrders(item.id)}>
              <Text style={[styles.outlineText, !hasOrders(item.id) && styles.outlineTextDisabled]}>{t('tables.orderDetails','Order Details')}</Text>
            </Pressable>

            <View style={styles.rowTwo}>
              <Pressable style={[styles.smallBtn, !hasOrders(item.id) && styles.disabled]} onPress={() => { setSelectedTable(item); setShowMove(true); }} disabled={!hasOrders(item.id)}>
                <Text style={[styles.smallBtnText, !hasOrders(item.id) && styles.smallBtnTextDisabled]}>{t('tables.move','Move')}</Text>
              </Pressable>
              <Pressable style={[styles.smallBtn, !(item.status === 'available' || item.status === 'reserved') && styles.disabled]} onPress={() => { setSelectedTable(item); setShowReserve(true); }} disabled={!(item.status === 'available' || item.status === 'reserved')}>
                <Text style={[styles.smallBtnText, !(item.status === 'available' || item.status === 'reserved') && styles.smallBtnTextDisabled]}>{item.status === 'reserved' ? t('tables.editReservation','Edit Reservation') : t('tables.reserve','Reserve')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {!isHallManager?.() && (
        <View style={styles.headerBar}>
          <Pressable style={styles.addButton} onPress={() => setShowAdd(true)}>
            <MaterialIcon name="add" size={16} color="#fff" />
            <Text style={styles.addButtonText}>{t('tables.addTable','Add Table')}</Text>
          </Pressable>
        </View>
      )}
      <FlatList
        data={visibleTables}
        keyExtractor={(table) => table.id}
        renderItem={({ item }) => renderTableCard(item)}
        numColumns={numColumns}
        key={`tables-${numColumns}`}
        columnWrapperStyle={numColumns > 1 ? styles.tableRow : undefined}
        contentContainerStyle={{ padding: 16 }}
      />

      {!isHallManager?.() && (
        <>
          <AddUnitSheet visible={showAdd} onClose={() => setShowAdd(false)} branchId={branchId} onAdded={() => queryClient.invalidateQueries({ queryKey: ['tables'] })} />
          <Pressable style={styles.fab} onPress={() => setShowAdd(true)}>
            <MaterialIcon name="add" size={20} color="#fff" />
          </Pressable>
        </>
      )}

      <EditTableSheet visible={showEdit} onClose={() => setShowEdit(false)} table={selectedTable} onSaved={() => queryClient.invalidateQueries({ queryKey: ['tables', branchId] })} />
      <TableOrderDetailsSheet visible={showOrderDetails} onClose={() => setShowOrderDetails(false)} table={selectedTable} />
      <MoveTableSheet visible={showMove} onClose={() => setShowMove(false)} table={selectedTable} branchId={branchId} onMoved={() => queryClient.invalidateQueries({ queryKey: ['table-orders', branchId] })} />
      <ReserveTableSheet visible={showReserve} onClose={() => setShowReserve(false)} table={selectedTable} branchId={branchId} onReserved={() => queryClient.invalidateQueries({ queryKey: ['tables', branchId] })} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyText: { color: '#9CA3AF' },
  tableRow: { justifyContent: 'flex-start' },
  gridCell: { paddingHorizontal: 6 },
  card: { width: '100%', backgroundColor: '#0f1724', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#374151', minHeight: 140 },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerLeft: { flex: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center' },
  tableTitle: { color: '#fff', fontSize: 18, fontWeight: '600' },
  badge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 999, marginLeft: 8 },
  badgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  iconButton: { marginLeft: 8, padding: 6 },
  reservedText: { color: '#F59E0B', marginTop: 8, fontSize: 13 },
  reservedTextSmall: { color: '#F59E0B', marginTop: 4, fontSize: 12 },
  actions: { marginTop: 12 },
  primary: { backgroundColor: '#10B981', paddingVertical: 12, borderRadius: 8, alignItems: 'center', marginTop: 12 },
  primaryText: { color: '#fff', fontWeight: '700' },
  outline: { backgroundColor: '#111827', borderColor: '#374151', borderWidth: 1, paddingVertical: 12, borderRadius: 8, marginTop: 8, alignItems: 'center' },
  outlineText: { color: '#fff' },
  disabled: { opacity: 0.5 },
  outlineTextDisabled: { color: '#9CA3AF' },
  rowTwo: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  smallBtn: { flex: 1, borderRadius: 8, paddingVertical: 10, alignItems: 'center', marginHorizontal: 4, backgroundColor: '#111827', borderWidth: 1, borderColor: '#374151' },
  smallBtnText: { color: '#fff', fontWeight: '600' },
  smallBtnTextDisabled: { color: '#9CA3AF' },
  fab: { position: 'absolute', right: 20, bottom: 28, backgroundColor: '#10B981', width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 6, elevation: 6 },
  headerBar: { paddingHorizontal: 16, paddingVertical: 12, backgroundColor: 'transparent' },
  addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#10B981', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, alignSelf: 'flex-start' },
  addButtonText: { color: '#fff', marginLeft: 8, fontWeight: '700' },
});
