import { supabase } from '../lib/supabase';

type CurrentOrderItem = { id: string; name?: string; price: number; quantity: number; notes?: string };

export async function submitOrderMobile(opts: {
  selectedBranch: { id: string; name?: string } | null;
  selectedTable: string | null | { id?: string; table_number?: string };
  orderType: 'dine-in' | 'takeout' | 'delivery';
  customerInfo?: { name?: string; phone?: string; address?: string; deliveryPlaceId?: string; deliveryFee?: number } | null;
  orderNotes?: string;
  currentOrder: CurrentOrderItem[];
  editingOrderId?: string | null;
}): Promise<boolean> {
  try {
    if (!opts.selectedBranch) {
      console.error('submitOrderMobile: missing branch');
      return false;
    }

    const itemsSubtotal = (opts.currentOrder || []).reduce((s, it) => s + (Number(it.price || 0) * (it.quantity || 1)), 0);
    const deliveryFee = opts.orderType === 'delivery' ? (opts.customerInfo?.deliveryFee || 0) : 0;
    const total = itemsSubtotal + deliveryFee;

    let tableId: string | null = null;
    // Resolve table id if dine-in and selectedTable provided
    if (opts.orderType === 'dine-in' && opts.selectedTable) {
      if (typeof opts.selectedTable === 'object') {
        tableId = (opts.selectedTable as any).id || null;
        // if object provided but no id, try lookup by table_number property
        if (!tableId && (opts.selectedTable as any).table_number) {
          const tn = (opts.selectedTable as any).table_number;
          const { data: tables, error: tErr } = await supabase.from('tables').select('id').eq('branch_id', opts.selectedBranch.id).eq('table_number', Number(tn)).limit(1);
          if (tErr) {
            console.error('submitOrderMobile: table lookup error', tErr);
          } else if (tables && tables[0]) {
            tableId = tables[0].id;
          }
        }
      } else if (/^[0-9]+$/.test(String(opts.selectedTable))) {
        // lookup by branch_id + table_number
        const { data: tables, error: tErr } = await supabase.from('tables').select('id').eq('branch_id', opts.selectedBranch.id).eq('table_number', Number(opts.selectedTable)).limit(1);
        if (tErr) {
          console.error('submitOrderMobile: table lookup error', tErr);
        } else if (tables && tables[0]) {
          tableId = tables[0].id;
        }
      }
    }

    if (opts.editingOrderId) {
      // replace items for existing order
      const editingId = opts.editingOrderId;
      const { error: delErr } = await supabase.from('order_items').delete().eq('order_id', editingId);
      if (delErr) {
        console.error('submitOrderMobile: failed to delete existing order_items', delErr);
        return false;
      }

      if ((opts.currentOrder || []).length) {
        const itemsPayload = opts.currentOrder.map((it) => ({ order_id: editingId, menu_item_id: it.id, quantity: it.quantity || 1, unit_price: it.price, special_instructions: it.notes || null }));
        const { error: insertItemsErr } = await supabase.from('order_items').insert(itemsPayload);
        if (insertItemsErr) {
          console.error('submitOrderMobile: failed to insert order_items', insertItemsErr);
          return false;
        }
      }

      const { error: updErr } = await supabase.from('orders').update({ total_amount: total, notes: opts.orderNotes || null, updated_at: new Date().toISOString() }).eq('id', editingId);
      if (updErr) {
        console.error('submitOrderMobile: failed to update order', updErr);
        return false;
      }

      if (tableId) {
        await supabase.from('tables').update({ status: 'occupied' }).eq('id', tableId);
      }

      return true;
    }

    // New order
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
    const payload: any = {
      branch_id: opts.selectedBranch.id,
      order_number: orderNumber,
      table_id: tableId || null,
      customer_name: opts.customerInfo?.name || null,
      customer_phone: opts.customerInfo?.phone || null,
      customer_address: opts.orderType === 'delivery' ? opts.customerInfo?.address || null : null,
      delivery_place_id: opts.orderType === 'delivery' ? opts.customerInfo?.deliveryPlaceId || null : null,
      delivery_fee: opts.orderType === 'delivery' ? (opts.customerInfo?.deliveryFee || 0) : 0,
      notes: opts.orderNotes || null,
      total_amount: total,
      status: 'pending',
      payment_status: 'pending',
      created_at: new Date().toISOString(),
    };

    const { data: insertedOrders, error: insErr } = await supabase.from('orders').insert([payload]).select().limit(1).single();
    if (insErr) {
      console.error('submitOrderMobile: failed to insert order', insErr);
      return false;
    }

    const orderId = (insertedOrders && insertedOrders.id) || (insertedOrders && insertedOrders[0] && insertedOrders[0].id) || null;
    if (!orderId) {
      console.error('submitOrderMobile: no order id returned');
      return false;
    }

    if ((opts.currentOrder || []).length) {
      const itemsPayload = opts.currentOrder.map((it) => ({
        order_id: orderId,
        menu_item_id: it.id,
        product_name: it.name,
        quantity: it.quantity || 1,
        unit_price: it.price,
        total_price: it.price * it.quantity,
        special_instructions: it.notes || null,
    }));
      const { error: insertItemsErr } = await supabase.from('order_items').insert(itemsPayload);
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
