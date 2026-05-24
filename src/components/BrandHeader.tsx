import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { THEME } from '../theme';

interface BrandHeaderProps {
  iconText?: string;
  brandName?: string;
}

/**
 * BrandHeader Component
 * Displays the application brand with icon and name
 */
export function BrandHeader({ iconText = 'H', brandName = 'Hexa Business Kit' }: BrandHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.brandIcon}>
        <Text style={styles.brandIconText}>{iconText}</Text>
      </View>
      <Text style={styles.brandName}>{brandName}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginBottom: THEME.spacing.huge,
  },
  brandIcon: {
    width: 56,
    height: 56,
    borderRadius: THEME.radius.md,
    backgroundColor: THEME.colors.primary.main,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: THEME.spacing.md,
    ...THEME.shadows.glowGreen,
  },
  brandIconText: {
    fontSize: THEME.typography.fontSize.display,
    fontWeight: '700' as any,
    color: THEME.colors.text.primary,
  },
  brandName: {
    fontSize: THEME.typography.fontSize.xxl,
    fontWeight: '600' as any,
    color: THEME.colors.text.primary,
    letterSpacing: 0.5,
  },
});
