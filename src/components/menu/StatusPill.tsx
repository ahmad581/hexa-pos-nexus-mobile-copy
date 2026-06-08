import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';

export default function StatusPill({ children, onClose }: { children: React.ReactNode; onClose?: () => void }) {
  return (
    <View style={styles.pill}>
      <Text style={styles.text}>{children}</Text>
      {onClose && <Pressable onPress={onClose}><Text style={styles.close}>✖️</Text></Pressable>}
    </View>
  );
}

const styles = StyleSheet.create({
  pill: { backgroundColor: '#064E3B', padding: 8, borderRadius: 999, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 },
  text: { color: '#D1FAE5' },
  close: { color: '#D1FAE5', marginLeft: 8 }
});
