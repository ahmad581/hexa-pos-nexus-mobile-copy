import React from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView } from 'react-native';
import { Category } from '../../types/menu';

export default function CategoryChips({ categories, selected, onSelect }: { categories: Category[]; selected: string | null; onSelect: (v: string) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.container} contentContainerStyle={{ paddingHorizontal: 16 }}>
      {categories.map((c) => (
        <Pressable key={c.value} onPress={() => onSelect(c.value)} style={[styles.chip, selected === c.value && styles.active]}>
          <Text style={[styles.text, selected === c.value && styles.textActive]}>{c.label}{c.soldOut ? ' ⚠️' : ''}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { paddingVertical: 8 },
  chip: { backgroundColor: '#1f2937', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, marginRight: 8 },
  active: { borderWidth: 1, borderColor: '#10B981' },
  text: { color: '#fff' },
  textActive: { color: '#10B981', fontWeight: '700' },
});
