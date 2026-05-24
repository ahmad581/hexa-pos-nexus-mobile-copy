// src/screens/HistoryScreen.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { supabase } from '../lib/supabase';
import { COLORS, TYPOGRAPHY, SPACING } from '../theme';

export default function HistoryScreen({ employeeId }: { employeeId: string }) {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!employeeId) return;
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    supabase.from('employee_work_sessions')
      .select('*')
      .eq('employee_id', employeeId)
      .gte('check_in_time', since)
      .order('check_in_time', { ascending: false })
      .then(({ data }) => {
        setSessions(data || []);
        setLoading(false);
      });
  }, [employeeId]);

  if (loading) return <Text>Loading...</Text>;

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.header}>Last 7 Days</Text>
      {sessions.length === 0 && <Text>No sessions found.</Text>}
      {sessions.map(s => (
        <View key={s.id} style={styles.sessionCard}>
          <Text style={styles.sessionText}>Check-in: {new Date(s.check_in_time).toLocaleString()}</Text>
          <Text style={styles.sessionText}>Check-out: {s.check_out_time ? new Date(s.check_out_time).toLocaleString() : '—'}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background.primary, padding: SPACING.lg },
  header: { fontSize: TYPOGRAPHY.fontSize.lg, color: COLORS.text.primary, marginBottom: SPACING.md },
  sessionCard: { backgroundColor: COLORS.surface.secondary, borderRadius: 8, padding: SPACING.md, marginBottom: SPACING.md },
  sessionText: { color: COLORS.text.primary, fontSize: TYPOGRAPHY.fontSize.md },
});
