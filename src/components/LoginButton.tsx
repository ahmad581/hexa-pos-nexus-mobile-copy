import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import { THEME } from '../theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger';

interface LoginButtonProps {
  onPress: () => void;
  isLoading?: boolean;
  disabled?: boolean;
  title?: string;
  variant?: ButtonVariant;
  showArrow?: boolean;
  style?: ViewStyle;
}

/**
 * LoginButton Component
 * Primary CTA button with optional loading state and arrow icon
 */
export function LoginButton({
  onPress,
  isLoading = false,
  disabled = false,
  title = 'Login',
  variant = 'primary',
  showArrow = false,
  style,
}: LoginButtonProps) {
  const buttonStyle = getButtonStyle(variant);

  return (
    <TouchableOpacity
      style={[
        styles.button,
        buttonStyle,
        (isLoading || disabled) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={isLoading || disabled}
      activeOpacity={0.8}
    >
      {isLoading ? (
        <ActivityIndicator color={THEME.colors.text.primary} size="small" />
      ) : (
        <>
          <Text style={styles.buttonText}>{title}</Text>
          {showArrow && <Text style={styles.buttonArrow}>→</Text>}
        </>
      )}
    </TouchableOpacity>
  );
}

function getButtonStyle(variant: ButtonVariant) {
  const baseStyle = {
    borderRadius: THEME.radius.sm,
    paddingVertical: THEME.spacing.lg,
    ...THEME.shadows.glowGreen,
  };

  switch (variant) {
    case 'secondary':
      return {
        ...baseStyle,
        backgroundColor: THEME.colors.surface.secondary,
        borderWidth: 1,
        borderColor: THEME.colors.border.light,
        ...THEME.shadows.shadowMd,
      };
    case 'danger':
      return {
        ...baseStyle,
        backgroundColor: THEME.colors.error,
        shadowColor: THEME.colors.error,
      };
    case 'primary':
    default:
      return {
        ...baseStyle,
        backgroundColor: THEME.colors.primary.main,
      };
  }
}

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: THEME.spacing.md,
  },
  disabled: {
    opacity: 0.7,
  },
  buttonText: {
    fontSize: THEME.typography.fontSize.md,
    fontWeight: '600' as any,
    color: THEME.colors.text.primary,
    marginRight: THEME.spacing.sm,
  },
  buttonArrow: {
    fontSize: THEME.typography.fontSize.xl,
    color: THEME.colors.text.primary,
  },
});
