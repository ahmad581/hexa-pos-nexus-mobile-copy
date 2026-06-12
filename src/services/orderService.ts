import { supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

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

export type AppRole =
  | 'supermanager' | 'manager' | 'drivermanager'
  | 'driver' | 'cashier' | 'employee' | string;

export type Driver = { id: string; name: string; phone: string | null };

export type DeliveryStatus = 'pending' | 'in_delivery' | 'delivered';

// Map mobile-facing statuses to the actual values in the `orders` table.
const STATUS_MAP: Record<DeliveryStatus, string> = {
  pending: 'pending',
  in_delivery: 'ready',
  delivered: 'completed',
};

export async function fetchCurrentBranchId(): Promise<string | null> {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('branch_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (profileError || !profile) return null;
  return profile.branch_id || null;
}

/**
 * Subscribes to realtime changes on `orders` for a given branch.
 * Calls `onChange` on every INSERT/UPDATE/DELETE. Returns an unsubscribe fn.
 *
 * Usage in a screen:
 *   useEffect(() => {
 *     const unsub = subscribeDeliveryOrders(loadOrders, 'pending');
 *     return () => { unsub(); };
 *   }, [loadOrders]);
 */
export function subscribeDeliveryOrders(
  onChange: () => void,
  scope: 'pending' | 'in_delivery' | 'delivered' | 'all' = 'all',
): () => void {
  let channel: RealtimeChannel | null = null;
  let cancelled = false;

  (async () => {
    const branchId = await fetchCurrentBranchId();
    if (!branchId || cancelled) return;

    channel = supabase
      .channel(`delivery-orders-${scope}-${branchId}-${Date.now()}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders',
          filter: `branch_id=eq.${branchId}`,
        },
        () => onChange(),
      )
      .subscribe();
  })();

  return () => {
    cancelled = true;
    if (channel) supabase.removeChannel(channel);
  };
}

export const fetchDrivers = async (branchId: string): Promise<Driver[]> => {
  if (!branchId) return [];

  const { data, error } = await supabase
    .from('employees')
    .select('id, first_name, last_name, phone, role, branch_id')
    .eq('branch_id', branchId)
    .eq('role', 'Driver')
    .eq('is_active', true);

  if (error) throw error;

  return (data ?? []).map((e: any) => ({
    id: e.id,
    name: `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim() || 'Driver',
    phone: e.phone ?? null,
  }));
};

export const fetchDeliveryOrders = async (
  status: DeliveryStatus,
  branchId: string,
) => {
  if (!branchId) return [];

  const dbStatus = STATUS_MAP[status] ?? status;

  const { data, error } = await supabase
    .from('orders')
    .select(`
      id,
      order_number,
      order_seq,
      customer_name,
      customer_phone,
      customer_address,
      delivery_address,
      delivery_city,
      delivery_notes,
      total_amount,
      status,
      driver_id,
      branch_id,
      created_at,
      delivered_at,
      completed_at
    `)
    .eq('branch_id', branchId)
    .eq('status', dbStatus)
    .not('delivery_place_id', 'is', null)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
};

export async function updateDeliveryOrderStatus(
  orderId: string,
  next: DeliveryStatus,
  opts?: { driverId?: string | null }
) {
  const patch: Record<string, any> = { status: STATUS_MAP[next] };
  if (next === 'delivered') {
    patch.delivered_at = new Date().toISOString();
    patch.driver_id = opts?.driverId ?? null;
  }
  if (next === 'in_delivery' && opts && 'driverId' in opts) {
    patch.driver_id = opts.driverId;
  }
  if (next === 'pending' && opts && 'driverId' in opts) {
    patch.driver_id = opts.driverId;
  }
  const { error } = await supabase.from('orders').update(patch).eq('id', orderId);
  if (error) throw error;
}

export async function assignDriverToOrder(
  orderId: string,
  driverId: string | null,
): Promise<void> {
  const patch: Record<string, any> = {
    driver_id: driverId,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('orders')
    .update(patch)
    .eq('id', orderId);

  if (error) throw new Error(error.message);
}

export const fetchCurrentUserRole = async (): Promise<AppRole | null> => {
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user?.email) return null;

  // Primary: employees.role (now backfilled + kept in sync by DB trigger)
  const { data: emp } = await supabase
    .from('employees')
    .select('role')
    .eq('email', user.email)
    .maybeSingle();
  if (emp?.role) return emp.role as AppRole;

  // Fallback: profiles.primary_role
  const { data: profile } = await supabase
    .from('profiles')
    .select('primary_role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profile?.primary_role) return profile.primary_role as AppRole;

  // Last-resort fallback: highest-priority active user_roles row
  const { data: roles } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .eq('is_active', true);
  if (roles && roles.length > 0) {
    const priority: Record<string, number> = {
      SystemMaster: 0, SuperManager: 1, Manager: 2, DriverManager: 3,
      HrManager: 4, HallManager: 5, CallCenterEmp: 6, Cashier: 7,
      Driver: 8, Employee: 9,
    };
    return [...roles].sort(
      (a: any, b: any) => (priority[a.role] ?? 99) - (priority[b.role] ?? 99),
    )[0].role as AppRole;
  }

  return null;
};

export const canManageDeliveries = (role: AppRole | null) => {
  if (!role) return false;
  const r = String(role).toLowerCase();
  
  return r === 'supermanager' || r === 'manager' || r === 'drivermanager';
};
