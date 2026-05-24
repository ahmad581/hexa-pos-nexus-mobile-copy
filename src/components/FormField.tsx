import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import { THEME } from '../theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  error?: string;
}

/**
 * FormField Component
 * Reusable form input field with label and optional error message
 */
export function FormField({ label, error, style, ...props }: FormFieldProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        {...props}
        style={[
          styles.input,
          error && styles.inputError,
          style,
        ]}
        placeholderTextColor={THEME.colors.text.tertiary}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: THEME.spacing.xxl,
  },
  label: {
    fontSize: THEME.typography.fontSize.sm,
    fontWeight: '500' as any,
    color: THEME.colors.text.secondary,
    marginBottom: THEME.spacing.sm,
    letterSpacing: 0.3,
  },
  input: {
    backgroundColor: THEME.colors.surface.secondary,
    borderRadius: THEME.radius.sm,
    paddingHorizontal: THEME.spacing.lg,
    paddingVertical: THEME.spacing.md,
    fontSize: THEME.typography.fontSize.md,
    color: THEME.colors.text.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  inputError: {
    borderColor: THEME.colors.error,
  },
  errorText: {
    color: THEME.colors.error,
    fontSize: THEME.typography.fontSize.xs,
    marginTop: THEME.spacing.xs,
  },
});
