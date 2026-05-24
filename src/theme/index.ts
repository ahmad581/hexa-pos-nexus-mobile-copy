/**
 * Application Theme
 * Centralized color, typography, and spacing configuration
 * Extracted from Hexa Business Kit design system
 */

// ============================================================================
// COLORS
// ============================================================================

export const COLORS = {
  // Primary Colors
  primary: {
    main: '#22c55e', // Green accent - used for CTAs and highlights
    dark: '#16a34a', // Darker green for pressed state
    light: '#4ade80', // Lighter green for hover state
  },

  // Background Colors
  background: {
    primary: '#1a1f2e', // Dark navy - main background
    secondary: '#0f1419', // Even darker for depth
  },

  // Surface Colors (Cards, modals, containers)
  surface: {
    primary: '#2d3a4f', // Card background
    secondary: '#3d4a5f', // Input fields and secondary surfaces
    tertiary: '#4a5a72', // Hover/pressed state for surfaces
  },

  // Text Colors
  text: {
    primary: '#ffffff', // Main text
    secondary: '#e0e3e8', // Secondary text (labels)
    tertiary: '#8b92a0', // Placeholder and hint text
    disabled: '#5a6370', // Disabled state text
  },

  // Semantic Colors
  success: '#22c55e',
  error: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',

  // Borders
  border: {
    light: '#4a5a72',
    medium: '#3d4a5f',
    dark: '#2d3a4f',
  },

  // Overlay
  overlay: 'rgba(0, 0, 0, 0.5)',
};

// ============================================================================
// TYPOGRAPHY
// ============================================================================

export const TYPOGRAPHY = {
  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    md: 16,
    lg: 18,
    xl: 20,
    xxl: 24,
    xxxl: 28,
    display: 32,
  },

  // Font Weights
  fontWeight: {
    light: '300' as any,
    regular: '400' as any,
    medium: '500' as any,
    semibold: '600' as any,
    bold: '700' as any,
    extrabold: '800' as any,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    normal: 1.5,
    relaxed: 1.75,
  },

  // Letter Spacing
  letterSpacing: {
    tight: -0.5,
    normal: 0,
    wide: 0.5,
    wider: 1,
  },

  // Text Styles (predefined combinations)
  styles: {
    // Display
    displayLarge: {
      fontSize: 32,
      fontWeight: '700' as any,
      lineHeight: 1.2,
    },
    displayMedium: {
      fontSize: 28,
      fontWeight: '700' as any,
      lineHeight: 1.2,
    },

    // Heading
    headingLarge: {
      fontSize: 24,
      fontWeight: '700' as any,
      lineHeight: 1.3,
    },
    headingMedium: {
      fontSize: 20,
      fontWeight: '600' as any,
      lineHeight: 1.3,
    },
    headingSmall: {
      fontSize: 18,
      fontWeight: '600' as any,
      lineHeight: 1.4,
    },

    // Body
    bodyLarge: {
      fontSize: 16,
      fontWeight: '400' as any,
      lineHeight: 1.5,
    },
    bodyMedium: {
      fontSize: 14,
      fontWeight: '400' as any,
      lineHeight: 1.5,
    },
    bodySmall: {
      fontSize: 12,
      fontWeight: '400' as any,
      lineHeight: 1.5,
    },

    // Label
    labelLarge: {
      fontSize: 14,
      fontWeight: '500' as any,
      lineHeight: 1.4,
    },
    labelMedium: {
      fontSize: 12,
      fontWeight: '500' as any,
      lineHeight: 1.4,
    },
    labelSmall: {
      fontSize: 11,
      fontWeight: '500' as any,
      lineHeight: 1.4,
    },

    // Button
    button: {
      fontSize: 16,
      fontWeight: '600' as any,
      lineHeight: 1.4,
    },
  },
};

// ============================================================================
// SPACING
// ============================================================================

export const SPACING = {
  // Padding & Margin scale
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
  jumbo: 48,

  // Common padding
  padding: {
    compact: 8,
    comfortable: 16,
    spacious: 24,
  },

  // Common margin
  margin: {
    compact: 8,
    comfortable: 16,
    spacious: 24,
  },

  // Gap between items
  gap: {
    compact: 4,
    comfortable: 8,
    spacious: 16,
    large: 24,
  },
};

// ============================================================================
// RADIUS (Border Radius)
// ============================================================================

export const RADIUS = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,

  // Common radius values
  tight: 4,
  comfortable: 8,
  spacious: 16,
};

// ============================================================================
// SHADOWS
// ============================================================================

export const SHADOWS = {
  // iOS Shadow
  shadowSm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  shadowMd: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  shadowLg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  shadowXl: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
  },

  // Android Elevation
  elevationSm: { elevation: 2 },
  elevationMd: { elevation: 4 },
  elevationLg: { elevation: 8 },
  elevationXl: { elevation: 12 },

  // Green Glow (for primary elements)
  glowGreen: {
    shadowColor: '#22c55e',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
};

// ============================================================================
// COMMON COMPONENT STYLES
// ============================================================================

export const COMPONENT_STYLES = {
  // Input field style
  input: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.text.primary,
    borderWidth: 1,
    borderColor: 'transparent',
  },

  // Card style
  card: {
    backgroundColor: COLORS.surface.primary,
    borderRadius: RADIUS.lg,
    padding: SPACING.xxl,
    ...SHADOWS.shadowLg,
  },

  // Button primary
  buttonPrimary: {
    backgroundColor: COLORS.primary.main,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    ...SHADOWS.glowGreen,
  },

  // Button secondary
  buttonSecondary: {
    backgroundColor: COLORS.surface.secondary,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border.light,
  },

  // Label text
  label: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.text.secondary,
    marginBottom: SPACING.sm,
  },
};

// ============================================================================
// BREAKPOINTS (for responsive design)
// ============================================================================

export const BREAKPOINTS = {
  sm: 320, // Small phones
  md: 480, // Default phones
  lg: 640, // Tablets in portrait
  xl: 768, // Tablets in landscape
  xxl: 1024, // Large tablets
};

// ============================================================================
// THEME OBJECT (all exports combined)
// ============================================================================

export const THEME = {
  colors: COLORS,
  typography: TYPOGRAPHY,
  spacing: SPACING,
  radius: RADIUS,
  shadows: SHADOWS,
  components: COMPONENT_STYLES,
  breakpoints: BREAKPOINTS,
};

export default THEME;
