import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../theme';

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
}

export function Button({ title, variant = 'primary' }: ButtonProps) {
  return (
    <View style={[styles.button, styles[`button_${variant}`]]}>
      <Text style={styles.buttonText}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button_primary: {
    backgroundColor: COLORS.primary.main,
  },
  button_secondary: {
    backgroundColor: COLORS.surface.secondary,
  },
  button_danger: {
    backgroundColor: COLORS.error,
  },
  buttonText: {
    color: COLORS.text.primary,
    fontSize: 16,
    fontWeight: '600',
  },
});
