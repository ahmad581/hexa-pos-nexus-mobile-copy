import { supabase } from './supabase';

export type SupabaseDeliveryOrder = {
  id: string;
  order_number: string | null;
  customer_name: string | null;
  total_amount: string | number | null;
  delivery_fee?: string | number | null;
  status: string | null;
  created_at: string | null;
  completed_at?: string | null;
  delivered_at?: string | null;
  driver_id?: string | null;
};

const ORDER_SELECT_FIELDS = `id, order_number, customer_name, total_amount, delivery_fee, status, created_at, completed_at, delivered_at, driver_id`;

export async function fetchCurrentBranchId(): Promise<string | null> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return null;
  }

  return profile.branch_id || null;
}

export async function fetchDeliveryOrders(
  screen: 'pending' | 'in_delivery' | 'delivered',
  branchId?: string | null
): Promise<SupabaseDeliveryOrder[]> {
  let query: any = supabase
    .from('orders')
    .select(ORDER_SELECT_FIELDS)
    .not('delivery_place_id', 'is', null);

  if (branchId) {
    query = query.eq('branch_id', branchId);
  }

  switch (screen) {
    case 'pending':
      query = query.in('status', ['pending', 'preparing', 'ready']).is('driver_id', null);
      break;
    case 'in_delivery':
      query = query
        .not('status', 'in', ['completed', 'delivered', 'cancelled'])
        .not('driver_id', 'is', null);
      break;
    case 'delivered':
      query = query.in('status', ['completed', 'delivered']);
      break;
  }

  query = query.order('created_at', { ascending: false });

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return (data || []) as SupabaseDeliveryOrder[];
}
