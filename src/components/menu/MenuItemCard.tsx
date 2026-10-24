import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import useCurrency from '../../hooks/useCurrency';

export default function MenuItemCard({
  item,
  onPress,
  onLongPress,
  layout = 'list',
}: {
  item: any;
  onPress: () => void;
  onLongPress?: () => void;
  layout?: 'grid' | 'list';
}) {
  const { formatCurrency } = useCurrency();
  return (
    <Pressable
      onPress={onPress}
      onLongPress={onLongPress}
      style={[styles.card, layout === 'grid' && styles.gridCard]}
    >
      {layout === 'grid' ? (
        <>
          <View style={styles.gridCardContent}>
            <Text style={[styles.name, styles.gridName]} numberOfLines={1}>{item.name}</Text>
          </View>
          <Text style={[styles.price, styles.gridPrice]}>{formatCurrency(Number(item.price || 0))}</Text>
        </>
      ) : (
        <>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{item.name}</Text>
            {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
          </View>
          <View style={{ marginLeft: 12, alignItems: 'flex-end' }}>
            <Text style={styles.price}>{formatCurrency(Number(item.price || 0))}</Text>
          </View>
        </>
      )}
      {item.soldOut && <View style={styles.overlay}><Text style={styles.overlayText}>SOLD OUT</Text></View>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: '#1f2937', padding: 14, borderRadius: 12, marginBottom: 4, position: 'relative', flexDirection: 'row', alignItems: 'center', minHeight: 76 },
  gridCard: { flex: 0, width: 160, height: 40, minHeight: 40, marginBottom: 0, alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#1F2937', borderWidth: 1, borderColor: '#374151', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 5 },
  gridCardContent: { flex: 1, minWidth: 0 },
  gridName: { color: '#F9FAFB', fontSize: 12 },
  name: { color: '#fff', fontWeight: '700' },
  desc: { color: '#9CA3AF', marginTop: 5, fontSize: 13 },
  price: { color: '#fff', fontWeight: '700' },
  gridPrice: { alignSelf: 'center', marginLeft: 6, color: '#10B981', fontSize: 11 },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  overlayText: { color: '#fff', fontWeight: '800' },
});
