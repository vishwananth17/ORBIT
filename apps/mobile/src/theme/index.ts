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
  background: '#0B0F17',
  surface: '#111827',
  surfaceSecondary: '#1F2937',
  surfaceHover: '#283548',
  border: '#2A3447',
  borderSubtle: '#1A2234',
  textPrimary: '#F8FAFC',
  textSecondary: '#94A3B8',
  textTertiary: '#64748B',
  accent: '#10B981',         // Clean emerald
  accentSubtle: '#064E3B',
  accentText: '#FFFFFF',
  destructive: '#EF4444',
  destructiveSubtle: '#451A1A',
  warning: '#F59E0B',
  cardShadow: 'rgba(0, 0, 0, 0.4)',
  userBubble: '#1E293B',
  assistantBubble: '#111827',
  inputBackground: '#131C2E',
};

export const lightTheme: ThemeColors = {
  background: '#F8FAFC',
  surface: '#FFFFFF',
  surfaceSecondary: '#F1F5F9',
  surfaceHover: '#E2E8F0',
  border: '#E2E8F0',
  borderSubtle: '#F1F5F9',
  textPrimary: '#0F172A',
  textSecondary: '#64748B',
  textTertiary: '#94A3B8',
  accent: '#059669',         // Slightly deeper emerald for light contrast
  accentSubtle: '#D1FAE5',
  accentText: '#FFFFFF',
  destructive: '#DC2626',
  destructiveSubtle: '#FEE2E2',
  warning: '#D97706',
  cardShadow: 'rgba(0, 0, 0, 0.06)',
  userBubble: '#E2E8F0',
  assistantBubble: '#FFFFFF',
  inputBackground: '#FFFFFF',
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
