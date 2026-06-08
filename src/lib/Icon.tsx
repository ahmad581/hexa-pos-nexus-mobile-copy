import React from 'react';
import { Text, Platform } from 'react-native';

type Props = {
  name: string;
  size?: number;
  color?: string;
};

const emojiMap: Record<string, string> = {
  logout: '🔒',
  login: '🔓',
  'pending-actions': '⏳',
  'local-shipping': '🚚',
  schedule: '🕒',
  'check-circle': '✅',
  'expand-more': '▾',
  'expand-less': '▴',
  'expand_more': '▾',
  'expand_less': '▴',
  'expand-less': '▴',
  'expand-more': '▾',
  'logout': '🔒',
  'login': '🔓',
};

let NativeMaterialIcons: any = null;
try {
  // Try require to avoid bundling on web
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const icons = require('@expo/vector-icons');
  NativeMaterialIcons = icons && icons.MaterialIcons;
} catch (e) {
  NativeMaterialIcons = null;
}

export default function MaterialIcon({ name, size = 16, color = '#000' }: Props) {
  const isWeb = Platform?.OS === 'web' || typeof window !== 'undefined';
  if (!isWeb && NativeMaterialIcons) {
    return <NativeMaterialIcons name={name} size={size} color={color} />;
  }

  const emoji = emojiMap[name] || '•';
  return <Text style={{ fontSize: size, color }}>{emoji}</Text>;
}
