import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

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
    backgroundColor: '#1a73e8',
  },
  button_secondary: {
    backgroundColor: '#34a853',
  },
  button_danger: {
    backgroundColor: '#ea4335',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
