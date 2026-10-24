import { supabase } from '../lib/supabase';

type CurrentOrderItem = { id: string; name?: string; price: number; quantity: number; notes?: string };

export async function submitOrderMobile(opts: {
  selectedBranch: { id: string; name?: string } | null;
  selectedTable: string | null | { id?: string; table_number?: string };
  orderType: 'dine-in' | 'takeout' | 'delivery';
  customerInfo?: { name?: string; phone?: string; address?: string; deliveryPlaceId?: string; deliveryFee?: number };
  orderNotes?: string;
  currentOrder: CurrentOrderItem[];
  editingOrderId?: string | null;
}): Promise<boolean> {
  try {
    const { selectedBranch, selectedTable, orderType, customerInfo, orderNotes, currentOrder, editingOrderId } = opts;

    if (!selectedBranch?.id || !currentOrder || currentOrder.length === 0) {
      console.warn('submitOrderMobile: missing branch or empty order');
      return false;
    }

    const itemsSubtotal = currentOrder.reduce((s, i) => s + (Number(i.price) || 0) * (Number(i.quantity) || 0), 0);
    const deliveryFee = orderType === 'delivery' ? Number(customerInfo?.deliveryFee) || 0 : 0;
    const total = itemsSubtotal + deliveryFee;

    // Resolve table_id
    let tableId: string | null = null;
    if (orderType === 'dine-in' && selectedTable) {
      if (typeof selectedTable === 'object' && selectedTable !== null) {
        if ((selectedTable as any).id) {
          tableId = (selectedTable as any).id;
        } else if ((selectedTable as any).table_number) {
          const { data } = await supabase
            .from('tables')
            .select('id')
            .eq('branch_id', selectedBranch.id)
            .eq('table_number', (selectedTable as any).table_number)
            .maybeSingle();
          tableId = data?.id ?? null;
        }
      } else {
        const { data } = await supabase
          .from('tables')
          .select('id')
          .eq('branch_id', selectedBranch.id)
          .eq('table_number', selectedTable as string)
          .maybeSingle();
        tableId = data?.id ?? null;
      }
    }

    // Editing existing order
    if (editingOrderId) {
      await supabase.from('order_items').delete().eq('order_id', editingOrderId);
      const items = currentOrder.map(i => ({
        order_id: editingOrderId,
        product_name: i.name || '',
        unit_price: i.price,
        quantity: i.quantity,
        total_price: (Number(i.price) || 0) * (Number(i.quantity) || 0),
        special_instructions: i.notes || null,
      }));
      const { error: itemsErr } = await supabase.from('order_items').insert(items);
      if (itemsErr) {
        console.error('submitOrderMobile: failed to update order_items', itemsErr);
        return false;
      }
      await supabase
        .from('orders')
        .update({
          total_amount: total,
          notes: orderNotes || null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingOrderId);
      return true;
    }

    // New order
    const payload: any = {
      branch_id: selectedBranch.id,
      order_number: `ORD-${Date.now().toString(36).toUpperCase()}`,
      table_id: tableId,
      customer_name: customerInfo?.name || null,
      customer_phone: customerInfo?.phone || null,
      customer_address: orderType === 'delivery' ? customerInfo?.address || null : null,
      delivery_place_id: orderType === 'delivery' ? customerInfo?.deliveryPlaceId || null : null,
      delivery_fee: deliveryFee,
      notes: orderNotes || null,
      total_amount: total,
      status: 'pending',
      payment_status: 'pending',
    };
    const { data: orderData, error: orderError } = await supabase
      .from('orders')
      .insert(payload)
      .select()
      .single();

    if (orderError || !orderData) {
      console.error('submitOrderMobile: failed to insert order', orderError);
      return false;
    }

    const items = currentOrder.map(i => ({
      order_id: orderData.id,
      product_name: i.name || '',
      unit_price: i.price,
      quantity: i.quantity,
      total_price: (Number(i.price) || 0) * (Number(i.quantity) || 0),
      special_instructions: i.notes || null,
    }));

    if (items.length > 0) {
      const { error: insertItemsErr } = await supabase.from('order_items').insert(items);
      if (insertItemsErr) {
        console.error('submitOrderMobile: failed to insert order_items', insertItemsErr);
        return false;
      }
    }

    if (tableId) {
      await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId);
    }

    return true;
  } catch (e) {
    console.error('submitOrderMobile: unexpected error', e);
    return false;
  }
}

export default submitOrderMobile;
