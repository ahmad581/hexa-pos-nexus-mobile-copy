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

  const addItemToOrder = (item: any, quantity = 1) => {
    const amount = Number(quantity);
    if (!Number.isFinite(amount) || amount <= 0) return;

    setCurrentOrder((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) return prev.map((p) => (p.id === item.id ? { ...p, quantity: (p.quantity || 1) + amount } : p));
      return [...prev, { ...item, quantity: amount }];
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
    if (!orderId) {
      setCurrentOrder([]);
      return;
    }

    const { data, error } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });
    if (error) throw error;

    setCurrentOrder((data || []).map((item: any) => ({
      id: item.id,
      name: item.product_name || '',
      price: Number(item.unit_price) || 0,
      quantity: Number(item.quantity) || 1,
      notes: item.special_instructions || null,
    })));
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
