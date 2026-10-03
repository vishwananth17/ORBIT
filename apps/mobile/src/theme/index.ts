// ============================================================================
// Orbit Mobile - Minimal Design System & Color Tokens
// ============================================================================

export type ThemeMode = 'dark' | 'light' | 'system';

export interface ThemeColors {
  background: string;
  surface: string;
  surfaceSecondary: string;
  surfaceHover: string;
  border: string;
  borderSubtle: string;
  textPrimary: string;
  textSecondary: string;
  textTertiary: string;
  accent: string;
  accentSubtle: string;
  accentText: string;
  destructive: string;
  destructiveSubtle: string;
  warning: string;
  cardShadow: string;
  userBubble: string;
  assistantBubble: string;
  inputBackground: string;
}

export const darkTheme: ThemeColors = {
  background: '#000000',
  surface: '#0D0D0D',
  surfaceSecondary: '#1A1A1A',
  surfaceHover: '#262626',
  border: '#2A2A2A',
  borderSubtle: '#1A1A1A',
  textPrimary: '#FFFFFF',
  textSecondary: '#A3A3A3',
  textTertiary: '#737373',
  accent: '#FFFFFF',
  accentSubtle: '#1F1F1F',
  accentText: '#000000',
  destructive: '#F87171',
  destructiveSubtle: '#2A1515',
  warning: '#D4D4D4',
  cardShadow: 'rgba(0, 0, 0, 0.5)',
  userBubble: '#2F2F2F',
  assistantBubble: 'transparent',
  inputBackground: '#1A1A1A',
};

export const lightTheme: ThemeColors = {
  background: '#FFFFFF',
  surface: '#F9F9F9',
  surfaceSecondary: '#F0F0F0',
  surfaceHover: '#E5E5E5',
  border: '#E5E5E5',
  borderSubtle: '#F0F0F0',
  textPrimary: '#0D0D0D',
  textSecondary: '#5E5E5E',
  textTertiary: '#8E8E8E',
  accent: '#0D0D0D',
  accentSubtle: '#F0F0F0',
  accentText: '#FFFFFF',
  destructive: '#DC2626',
  destructiveSubtle: '#FEE2E2',
  warning: '#525252',
  cardShadow: 'rgba(0, 0, 0, 0.06)',
  userBubble: '#F0F0F0',
  assistantBubble: 'transparent',
  inputBackground: '#F4F4F4',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 22,
  full: 9999,
};

export const typography = {
  display: { fontSize: 28, fontWeight: '700' as const, letterSpacing: -0.6 },
  heading: { fontSize: 20, fontWeight: '600' as const, letterSpacing: -0.3 },
  subheading: { fontSize: 16, fontWeight: '600' as const },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodyBold: { fontSize: 15, fontWeight: '600' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const },
  label: { fontSize: 13, fontWeight: '500' as const },
};
