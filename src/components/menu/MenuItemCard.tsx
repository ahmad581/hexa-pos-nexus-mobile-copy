import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import useCurrency from '../../hooks/useCurrency';

export default function MenuItemCard({ item, onPress, onLongPress }: { item: any; onPress: () => void; onLongPress?: () => void }) {
  const { formatCurrency } = useCurrency();
  return (
    <Pressable onPress={onPress} onLongPress={onLongPress} style={styles.card}>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name}</Text>
        {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
      </View>
      <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
        <Text style={styles.price}>{formatCurrency(Number(item.price || 0))}</Text>
      </View>
      {item.soldOut && <View style={styles.overlay}><Text style={styles.overlayText}>SOLD OUT</Text></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1f2937', padding: 12, borderRadius: 12, marginBottom: 12, position: 'relative', flexDirection: 'row', alignItems: 'center' },
  name: { color: '#fff', fontWeight: '700' },
  desc: { color: '#9CA3AF', marginTop: 4 },
  price: { color: '#fff', fontWeight: '700' },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overlayText: { color: '#fff', fontWeight: '800' },
});
