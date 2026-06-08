// Constants for the application
import THEME from '../theme';

export const API_BASE_URL = 'https://api.hexapos.example.com';

// Re-export theme fragments for backward compatibility
export const COLORS = THEME.colors as any;
export const SPACING = THEME.spacing as any;
export const FONT_SIZES = THEME.typography.fontSize as any;

