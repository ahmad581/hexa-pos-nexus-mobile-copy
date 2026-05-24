import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList } from 'react-native';
import { THEME } from '../theme';

export default function MainScreen() {
  const [shiftActive, setShiftActive] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const statusText = shiftActive ? 'On shift' : 'Off shift';
  const buttonLabel = shiftActive ? 'Check Out' : 'Check In';
  const buttonVariant = shiftActive ? 'danger' : 'secondary';

  const handleToggleShift = () => {
    const timestamp = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    setShiftActive((current) => {
      const nextState = !current;
      const event = `${nextState ? 'Checked in' : 'Checked out'} at ${timestamp}`;
      setHistory((prev) => [event, ...prev]);
      return nextState;
    });
  };

  const lastEvent = useMemo(() => history[0] ?? 'No shift activity yet', [history]);

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Shift Control</Text>
      <View style={styles.card}>
        <Text style={styles.label}>Status</Text>
        <Text style={styles.status}>{statusText}</Text>
        <Text style={styles.subtext}>{lastEvent}</Text>

        <TouchableOpacity
          style={[styles.actionButton, styles[`actionButton_${buttonVariant}`]]}
          onPress={handleToggleShift}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>{buttonLabel}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.historyContainer}>
        <Text style={styles.sectionTitle}>Recent shift activity</Text>
        <FlatList
          data={history.map((entry, index) => ({ id: String(index), entry }))}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.historyItem}>
              <Text style={styles.historyText}>{item.entry}</Text>
            </View>
          )}
          ListEmptyComponent={<Text style={styles.emptyText}>No shift records yet.</Text>}
          contentContainerStyle={history.length === 0 ? styles.emptyContainer : undefined}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: THEME.colors.background.secondary,
    padding: THEME.spacing.lg,
  },
  heading: {
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.xl,
    fontWeight: THEME.typography.fontWeight.bold,
    marginBottom: THEME.spacing.lg,
  },
  card: {
    backgroundColor: THEME.colors.surface.primary,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.xl,
    ...THEME.shadows.shadowLg,
    marginBottom: THEME.spacing.lg,
  },
  label: {
    color: THEME.colors.text.secondary,
    marginBottom: THEME.spacing.sm,
    fontSize: THEME.typography.fontSize.sm,
  },
  status: {
    color: THEME.colors.primary.main,
    fontSize: THEME.typography.fontSize.xxxl,
    fontWeight: THEME.typography.fontWeight.extrabold,
  },
  subtext: {
    color: THEME.colors.text.secondary,
    marginVertical: THEME.spacing.sm,
    fontSize: THEME.typography.fontSize.md,
  },
  actionButton: {
    marginTop: THEME.spacing.lg,
    paddingVertical: THEME.spacing.lg,
    borderRadius: THEME.radius.md,
    alignItems: 'center',
  },
  actionButton_secondary: {
    backgroundColor: THEME.colors.surface.secondary,
  },
  actionButton_danger: {
    backgroundColor: THEME.colors.error,
  },
  buttonText: {
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.md,
    fontWeight: THEME.typography.fontWeight.semibold,
  },
  historyContainer: {
    flex: 1,
    backgroundColor: THEME.colors.surface.primary,
    borderRadius: THEME.radius.xl,
    padding: THEME.spacing.lg,
    ...THEME.shadows.shadowMd,
  },
  sectionTitle: {
    color: THEME.colors.text.primary,
    fontSize: THEME.typography.fontSize.lg,
    fontWeight: THEME.typography.fontWeight.semibold,
    marginBottom: THEME.spacing.sm,
  },
  historyItem: {
    backgroundColor: THEME.colors.background.primary,
    padding: THEME.spacing.md,
    borderRadius: THEME.radius.md,
    marginBottom: THEME.spacing.sm,
  },
  historyText: {
    color: THEME.colors.text.secondary,
    fontSize: THEME.typography.fontSize.md,
  },
  emptyText: {
    color: THEME.colors.text.tertiary,
    fontSize: THEME.typography.fontSize.md,
    textAlign: 'center',
    marginTop: THEME.spacing.xl,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
  },
});
