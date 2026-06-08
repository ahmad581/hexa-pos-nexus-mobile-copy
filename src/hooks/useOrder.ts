import { useState } from 'react';
import { supabase } from '../lib/supabase';

type OrderItem = any;

export function useOrder() {
  const [currentOrder, setCurrentOrder] = useState<OrderItem[]>([]);
  const [customerInfo, setCustomerInfo] = useState<any>(null);
  const [orderType, setOrderType] = useState<string>('dine-in');
  const [selectedTable, setSelectedTable] = useState<any>(null);
  const [orderNotes, setOrderNotes] = useState<string | null>(null);
  const [originRoute, setOriginRouteState] = useState<string | null>(null);

  const addItemToOrder = (item: any) => {
    setCurrentOrder((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, quantity: (p.quantity || 1) + 1 } : p));
      return [...prev, { ...item, quantity: 1 }];
    });
  };

  const updateItemQuantity = (id: string, qty: number) => {
    setCurrentOrder((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: qty } : p)));
  };

  const updateItemNotes = (id: string, notes: string | null) => {
    setCurrentOrder((prev) => prev.map((p) => (p.id === id ? { ...p, notes } : p)));
  };

  const removeItemFromOrder = (id: string) => {
    setCurrentOrder((prev) => prev.filter((p) => p.id !== id));
  };

  const clearCurrentOrder = () => {
    setCurrentOrder([]);
    setOrderNotes(null);
  };

  const loadOrderForEditingById = async (orderId: string) => {
    try {
      if (!orderId) return;
      // detect UUID-like id vs numeric table number
      const uuidLike = /^[0-9a-fA-F\-]{36}$/.test(orderId);
      const numeric = /^[0-9]+$/.test(orderId);

      if (uuidLike) {
        const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId);
        if (data) {
          // map DB column special_instructions -> notes for UI
          const mapped = (data as any[]).map((r) => ({ ...r, notes: r.special_instructions || null }));
          setCurrentOrder(mapped || []);
        }
        return;
      }

      if (numeric) {
        // assume table number was provided; find table id then load the active order for that table
        const { data: tables } = await supabase.from('tables').select('id').eq('table_number', Number(orderId)).limit(1);
        const table = (tables && tables[0]) || null;
        if (table && table.id) {
          const { data: orders } = await supabase.from('orders').select('id').eq('table_id', table.id).in('status', ['pending', 'preparing', 'ready']).order('created_at', { ascending: false }).limit(1);
          const order = (orders && orders[0]) || null;
            if (order && order.id) {
            const { data } = await supabase.from('order_items').select('*').eq('order_id', order.id);
            if (data) {
              const mapped = (data as any[]).map((r) => ({ ...r, notes: r.special_instructions || null }));
              setCurrentOrder(mapped || []);
            }
            return;
          }
        }
        // no active order found for table
        setCurrentOrder([]);
        return;
      }

      // fallback: try to query by order_id anyway
      const { data } = await supabase.from('order_items').select('*').eq('order_id', orderId);
      if (data) setCurrentOrder((data as any) || []);
    } catch (e) {
      // ignore
    }
  };

  const setOriginRoute = (route: string | null) => setOriginRouteState(route);

  return {
    addItemToOrder,
    currentOrder,
    setCustomerInfo,
    customerInfo,
    setOrderType,
    orderType,
    selectedTable,
    setSelectedTable,
    clearCurrentOrder,
    updateItemQuantity,
    removeItemFromOrder,
    loadOrderForEditingById,
    setOriginRoute,
    originRoute,
    orderNotes,
    setOrderNotes,
    updateItemNotes,
  };
}

export default useOrder;
