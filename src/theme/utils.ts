/**
 * Theme Utilities
 * Helper functions and hooks for using the theme across the application
 */

import { THEME } from './index';

/**
 * Hook to get current theme colors
 * Can be extended to support light/dark mode switching
 */
export function useThemeColors() {
  // TODO: Implement light/dark mode toggle if needed
  return THEME.colors;
}

/**
 * Hook to get spacing values
 */
export function useSpacing() {
  return THEME.spacing;
}

/**
 * Hook to get typography styles
 */
export function useTypography() {
  return THEME.typography;
}

/**
 * Get responsive font size based on screen width
 */
export function getResponsiveFontSize(baseSize: number, multiplier: number = 1): number {
  // For mobile-first design, this can be extended for tablet support
  return baseSize * multiplier;
}

/**
 * Merge theme styles with component-specific overrides
 */
export function mergeStyles<T extends Record<string, any>>(
  themeStyle: T,
  overrides?: Partial<T>
): T {
  return { ...themeStyle, ...overrides };
}

export default THEME;

