import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import MaterialIcon from '../lib/Icon';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

type Props = { orderId: string | null; visible: boolean; onClose: () => void };

type OrderRow = {
  id: string; order_number: string | null; order_seq: number | null;
  customer_name: string | null; customer_phone: string | null;
  delivery_address: string | null; delivery_city: string | null; delivery_notes: string | null;
  status: string | null; total_amount: number | null; delivery_fee: number | null;
  payment_status: string | null; payment_method: string | null;
  created_at: string | null; delivered_at: string | null;
  driver_id: string | null;
};
type OrderItem = {
  id: string; product_name: string; quantity: number;
  unit_price: number; total_price: number; special_instructions: string | null;
};

const OrderDetailsModal = ({ orderId, visible, onClose }: Props) => {
  const [order, setOrder] = useState<OrderRow | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [driverName, setDriverName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!visible || !orderId) return;
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null); setOrder(null); setItems([]); setDriverName(null);
      try {
        const { data: o, error: oErr } = await supabase
          .from('orders').select('*').eq('id', orderId).maybeSingle();
        if (oErr) throw oErr;
        if (cancelled) return;
        setOrder(o as OrderRow);

        const { data: it, error: iErr } = await supabase
          .from('order_items').select('*').eq('order_id', orderId).order('created_at', { ascending: true });
        if (iErr) throw iErr;
        if (cancelled) return;
        setItems((it ?? []) as OrderItem[]);

        if (o?.driver_id) {
          const { data: emp } = await supabase
            .from('employees').select('first_name, last_name').eq('id', o.driver_id).maybeSingle();
          if (!cancelled && emp) setDriverName(`${emp.first_name ?? ''} ${emp.last_name ?? ''}`.trim() || 'Driver');
        }
      } catch (e: any) {
        if (!cancelled) setError(e.message || 'Failed to load order');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [orderId, visible]);

  const number = order?.order_seq ?? (order?.order_seq ? `#${order.order_seq}` : order?.id?.slice(0, 8));
  const subtotal = items.reduce((s, i) => s + Number(i.total_price ?? 0), 0);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet} onPress={() => {}}>
          <View style={styles.handle} />
          <View style={styles.headerRow}>
            <Text style={styles.title}>Order details</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <MaterialIcon name="close" size={22} color={COLORS.text.secondary} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary.main} style={{ paddingVertical: SPACING.xl }} />
          ) : error ? (
            <Text style={styles.error}>{error}</Text>
          ) : !order ? (
            <Text style={styles.muted}>No data</Text>
          ) : (
            <ScrollView style={{ maxHeight: 520 }} contentContainerStyle={{ paddingBottom: SPACING.lg }}>
              <Text style={styles.orderNumber}>{number}</Text>

              <Section label="Customer">
                <Row k="Name" v={order.customer_name || '—'} />
                <Row k="Phone" v={order.customer_phone || '—'} />
              </Section>

              <Section label="Delivery">
                <Row k="Address" v={[order.delivery_address, order.delivery_city].filter(Boolean).join(', ') || '—'} />
                {order.delivery_notes ? <Row k="Notes" v={order.delivery_notes} /> : null}
                <Row k="Driver" v={driverName || (order.driver_id ? 'Assigned' : 'Unassigned')} />
              </Section>

              <Section label={`Items (${items.length})`}>
                {items.length === 0 ? (
                  <Text style={styles.muted}>No items</Text>
                ) : items.map(it => (
                  <View key={it.id} style={styles.itemRow}>
                    <Text style={styles.itemName}>{it.product_name}</Text>
                    <Text style={styles.itemTotal}>${Number(it.total_price ?? 0).toFixed(2)}</Text>
                  </View>
                ))}
              </Section>

              <Section label="Payment">
                <Row k="Subtotal" v={`$${subtotal.toFixed(2)}`} />
                {order.delivery_fee != null && <Row k="Delivery fee" v={`$${Number(order.delivery_fee).toFixed(2)}`} />}
                <Row k="Total" v={`$${Number(order.total_amount ?? 0).toFixed(2)}`} bold />
                {order.payment_method ? <Row k="Method" v={order.payment_method} /> : null}
              </Section>

              <Section label="Timestamps">
                {order.created_at ? <Row k="Created" v={new Date(order.created_at).toLocaleString()} /> : null}
                {order.delivered_at ? <Row k="Delivered" v={new Date(order.delivered_at).toLocaleString()} /> : null}
              </Section>
            </ScrollView>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <View style={styles.section}>
    <Text style={styles.sectionLabel}>{label}</Text>
    {children}
  </View>
);
const Row = ({ k, v, bold }: { k: string; v: string; bold?: boolean }) => (
  <View style={styles.kv}>
    <Text style={styles.kvKey}>{k}</Text>
    <Text style={[styles.kvVal, bold && { fontWeight: TYPOGRAPHY.fontWeight.bold as any, color: COLORS.text.primary }]}>{v}</Text>
  </View>
);

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: COLORS.surface.primary, borderTopLeftRadius: 16, borderTopRightRadius: 16, padding: SPACING.lg, maxHeight: '85%' },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: COLORS.border.medium, marginBottom: SPACING.md },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.md },
  title: { fontSize: TYPOGRAPHY.fontSize.lg, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.primary },
  orderNumber: { fontSize: TYPOGRAPHY.fontSize.xl, fontWeight: TYPOGRAPHY.fontWeight.bold as any, color: COLORS.text.primary },
  statusBadge: { alignSelf: 'flex-start', marginTop: 4, fontSize: TYPOGRAPHY.fontSize.xs, color: COLORS.text.secondary, textTransform: 'uppercase' },
  section: { marginTop: SPACING.lg },
  sectionLabel: { fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, color: COLORS.text.secondary, marginBottom: SPACING.sm },
  kv: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  kvKey: { color: COLORS.text.tertiary, fontSize: TYPOGRAPHY.fontSize.sm },
  kvVal: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.fontSize.sm, flexShrink: 1, textAlign: 'right', marginLeft: SPACING.md },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: SPACING.sm, borderBottomWidth: 1, borderBottomColor: COLORS.border.medium },
  itemName: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold as any },
  itemMeta: { color: COLORS.text.tertiary, fontSize: TYPOGRAPHY.fontSize.xs, marginTop: 2 },
  itemNote: { color: COLORS.text.tertiary, fontSize: TYPOGRAPHY.fontSize.xs, fontStyle: 'italic', marginTop: 2 },
  itemTotal: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.fontSize.sm, fontWeight: TYPOGRAPHY.fontWeight.semibold as any, marginLeft: SPACING.md },
  error: { color: COLORS.error, textAlign: 'center', paddingVertical: SPACING.xl },
  muted: { color: COLORS.text.secondary, fontSize: TYPOGRAPHY.fontSize.sm, paddingVertical: SPACING.md },
});

export default OrderDetailsModal;
