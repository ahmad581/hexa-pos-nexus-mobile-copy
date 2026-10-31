import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { COLORS } from '../../theme';

export default function StatusPill({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{children}</Text>
      {onClose && <Pressable onPress={onClose}><Text style={styles.close}>✖️</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: COLORS.primary.light, padding: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  text: { color: COLORS.text.primary },
  close: { color: COLORS.text.primary, marginLeft: 8 }
});
