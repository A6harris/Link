import { StyleSheet } from 'react-native';


export const colors = {
  // Backgrounds (warm near-white)
  background: '#FAF8F3',
  backgroundSunken: '#F1EDE2',
  backgroundGradientStart: '#FCFAF6',
  backgroundGradientEnd: '#F6F2EA',

  // Surfaces
  surface: '#FFFFFF',
  surfaceMuted: '#F8F9FC',
  surfaceAlt: '#F2F2F7',
  surfaceBorder: '#E8E8F0',
  surfaceOverlay: 'rgba(255, 255, 255, 0.85)',
  placeholder: '#E9ECF2',

  // Primary gradient colors (purple-only)
  gradientStart: '#9B59B6',
  gradientMid: '#8E44AD',
  gradientEnd: '#7B2D8E',

  // Accent colors (lavender, no pink)
  primary: '#7B2D8E',
  primaryLight: '#A855F7',
  primaryPastel: '#D8B4FE',
  primarySoft: '#F3E8FF',
  accent: '#8E44AD',
  accentSoft: '#EFE3F7',
  
  // Semantic colors
  success: '#00BFA6',
  successSoft: '#E0F7F4',
  warning: '#FF9500',
  warningSoft: '#FFF4E5',
  danger: '#FF3B30',
  dangerSoft: '#FFEBEE',
  
  // Text colors
  black: '#000000',
  textPrimary: '#1A1A2E',
  textSecondary: '#64648C',
  textMuted: '#9999B3',
  textLight: '#FFFFFF',
  textGradientStart: '#9B59B6',
  textGradientEnd: '#7B2D8E',
  
  // Special
  overlay: 'rgba(26, 26, 46, 0.45)',
  overlayLight: 'rgba(26, 26, 46, 0.25)',
  overlayDark: 'rgba(0, 0, 0, 0.6)',
  
  // Sparkle colors
  sparkleViolet: '#9B59B6',
  sparkleMagenta: '#E91E63',
  sparkleTeal: '#00BFA6',
  sparkleGold: '#F59E0B',
} as const;

// Gradient definitions for use with expo-linear-gradient
export const gradients = {
  primary: ['#9B59B6', '#8E44AD', '#7B2D8E'] as const,
  primarySubtle: ['#D8B4FE', '#C9A8F0', '#B794E8'] as const,
  accent: ['#8E44AD', '#7B2D8E', '#6A2580'] as const,
  warm: ['#F59E0B', '#F97316', '#EF4444'] as const,
  cool: ['#06B6D4', '#0EA5E9', '#3B82F6'] as const,
  success: ['#00BFA6', '#26C6A0', '#4DD0B0'] as const,
  surface: ['#FFFFFF', '#F8F9FC'] as const,
  overlay: ['transparent', 'rgba(0,0,0,0.7)'] as const,
  overlayTop: ['rgba(0,0,0,0.5)', 'transparent'] as const,
  storyRing: ['#9B59B6', '#8E44AD', '#7B2D8E'] as const,
  storyRingUrgent: ['#FF3B30', '#FF5A5F', '#FF6B6B'] as const,
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 48,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  pill: 999,
  circle: 9999,
} as const;

// Plus Jakarta Sans variants. Google Fonts loads each weight as its own family,
// so we map weight -> family explicitly rather than relying on fontWeight alone.
export const fontFamily = {
  regular: 'PlusJakartaSans_400Regular',
  medium: 'PlusJakartaSans_500Medium',
  semibold: 'PlusJakartaSans_600SemiBold',
  bold: 'PlusJakartaSans_700Bold',
  extrabold: 'PlusJakartaSans_800ExtraBold',
} as const;

// Typography with distinctive font pairing
export const typography = {
  // Display & Headlines
  displayLarge: {
    fontSize: 36,
    fontWeight: '800' as const,
    fontFamily: fontFamily.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  displayMedium: {
    fontSize: 32,
    fontWeight: '800' as const,
    fontFamily: fontFamily.extrabold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  screenTitle: {
    fontSize: 28,
    fontWeight: '700' as const,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
    letterSpacing: -0.3,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
    letterSpacing: 0,
  },
  heading: {
    fontSize: 22,
    fontWeight: '700' as const,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },

  // Body text
  bodyLarge: {
    fontSize: 17,
    fontWeight: '400' as const,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 24,
  },
  body: {
    fontSize: 15,
    fontWeight: '400' as const,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  bodySmall: {
    fontSize: 14,
    fontWeight: '400' as const,
    fontFamily: fontFamily.regular,
    color: colors.textSecondary,
    lineHeight: 20,
  },

  // UI elements
  caption: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
  captionSmall: {
    fontSize: 11,
    fontWeight: '500' as const,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 14,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semibold,
    color: colors.textPrimary,
  },
  labelUppercase: {
    fontSize: 12,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semibold,
    color: colors.textSecondary,
    letterSpacing: 1.2,
    textTransform: 'uppercase' as const,
  },

  // Buttons
  buttonLarge: {
    fontSize: 17,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semibold,
    color: colors.textLight,
  },
  buttonPrimary: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semibold,
    color: colors.textLight,
  },
  buttonSecondary: {
    fontSize: 16,
    fontWeight: '600' as const,
    fontFamily: fontFamily.semibold,
    color: colors.primary,
  },

  // Stats & numbers
  statNumber: {
    fontSize: 24,
    fontWeight: '700' as const,
    fontFamily: fontFamily.bold,
    color: colors.textPrimary,
  },
  statLabel: {
    fontSize: 12,
    fontWeight: '500' as const,
    fontFamily: fontFamily.medium,
    color: colors.textMuted,
  },
} as const;

export const layout = {
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  surfaceScreen: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
  },
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
  },
  rowBetween: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
  center: {
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
} as const;

export const shadow = {
  sm: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 2,
  },
  card: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
  },
  cardHover: {
    shadowColor: '#9B59B6',
    shadowOpacity: 0.15,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  float: {
    shadowColor: '#1A1A2E',
    shadowOpacity: 0.12,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  glow: {
    shadowColor: '#9B59B6',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
} as const;

export const components = {
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceMuted,
  },
  chipActive: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + spacing.xxs,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.surfaceBorder,
  },
  floatingButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  storyRing: {
    borderWidth: 2.5,
    borderRadius: radius.circle,
  },
  glassCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: radius.xxl,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
} as const;

// Animation presets
export const animations = {
  spring: {
    damping: 15,
    stiffness: 150,
    mass: 1,
  },
  springBouncy: {
    damping: 10,
    stiffness: 180,
    mass: 0.8,
  },
  springGentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  timing: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

// Avatar sizes
export const avatarSizes = {
  xs: 32,
  sm: 40,
  md: 48,
  lg: 60,
  xl: 80,
  xxl: 120,
  story: 72,
  hero: 100,
} as const;
