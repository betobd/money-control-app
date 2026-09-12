export const colors = {
  light: {
    appBackground: '#F4F7FC',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    elevatedSurface: '#E8EEF8',
    heroGradientStart: '#EAF1FE',
    heroGradientEnd: '#DCE8FB',
    navigationSurface: '#FFFFFF',
    primaryText: '#13213A',
    secondaryText: '#40506B',
    mutedText: '#647187',
    border: '#CCD5E5',
    hairline: 'rgba(19,33,58,0.10)',
    primaryAction: '#135BC7',
    onPrimaryAction: '#FFFFFF',
    selectedNavigationBackground: '#D6E5FF',
    selectedNavigationForeground: '#123B72',
    navigationInactive: '#53627A',
    income: '#007A58',
    expense: '#B84A44',
    transfer: '#3559B7',
    warning: '#8A5900',
    destructive: '#B42331',
    tintPrimary: 'rgba(19,91,199,0.10)',
    tintIncome: 'rgba(0,122,88,0.10)',
    tintExpense: 'rgba(184,74,68,0.10)',
    tintTransfer: 'rgba(53,89,183,0.10)',
    tintWarning: 'rgba(138,89,0,0.12)',
    tintDestructive: 'rgba(180,35,49,0.10)',
    disabledSurface: '#E2E7EF',
    disabledText: '#727E91',
    progressTrack: '#D8DFEB',
    progressFill: '#246BFD',
    overlay: 'rgba(19,33,58,0.40)',
    heroHighlight: 'rgba(255,255,255,0.55)',
  },
  dark: {
    appBackground: '#060E1E',
    surface: '#0E1A30',
    surfaceRaised: '#111D33',
    elevatedSurface: '#111D33',
    heroGradientStart: '#12213C',
    heroGradientEnd: '#0E1A30',
    navigationSurface: '#0B1424',
    primaryText: '#E4EBFA',
    secondaryText: '#BBC6DB',
    mutedText: '#8595B3',
    border: '#35435F',
    hairline: 'rgba(149,162,187,0.14)',
    primaryAction: '#79A9FF',
    onPrimaryAction: '#07182E',
    selectedNavigationBackground: '#A9C8FF',
    selectedNavigationForeground: '#06152C',
    navigationInactive: '#8595B3',
    income: '#45DDB0',
    expense: '#FFA39B',
    transfer: '#9CB7FF',
    warning: '#F1C66D',
    destructive: '#FF6673',
    tintPrimary: 'rgba(121,169,255,0.14)',
    tintIncome: 'rgba(69,221,176,0.14)',
    tintExpense: 'rgba(255,163,155,0.14)',
    tintTransfer: 'rgba(156,183,255,0.14)',
    tintWarning: 'rgba(241,198,109,0.16)',
    tintDestructive: 'rgba(255,102,115,0.14)',
    disabledSurface: '#202C44',
    disabledText: '#8290AA',
    progressTrack: '#1C2942',
    progressFill: '#A9C8FF',
    overlay: 'rgba(4,8,17,0.60)',
    heroHighlight: 'rgba(255,255,255,0.05)',
  },
} as const;

/**
 * Named swatches available for per-budget coloring. Each swatch carries a light
 * and dark variant so budgets stay legible in both themes. Store the key (not a
 * raw hex) on the budget row and resolve it through resolveBudgetColor.
 */
export const budgetSwatches = {
  blue: { light: '#135BC7', dark: '#79A9FF' },
  teal: { light: '#0E8C8C', dark: '#4FD1C5' },
  green: { light: '#0B7A4B', dark: '#45DDB0' },
  amber: { light: '#A87400', dark: '#F1C66D' },
  coral: { light: '#C85248', dark: '#FF9A8F' },
  pink: { light: '#C43D7A', dark: '#FF8FBF' },
  purple: { light: '#6D4AC0', dark: '#B79BFF' },
  indigo: { light: '#3559B7', dark: '#9CB7FF' },
} as const;

export type BudgetColorKey = keyof typeof budgetSwatches;

export const budgetColorKeys = Object.keys(budgetSwatches) as BudgetColorKey[];

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Static font family names registered in src/app/_layout.tsx via useFonts.
 * Weight is encoded by the family name (Android/iOS do not synthesize weights
 * for JS-loaded static fonts), so styles select a weight by choosing the family.
 */
export const fonts = {
  sans: {
    regular: 'Manrope_400Regular',
    medium: 'Manrope_500Medium',
    semibold: 'Manrope_600SemiBold',
    bold: 'Manrope_700Bold',
    extrabold: 'Manrope_800ExtraBold',
  },
  mono: {
    regular: 'JetBrainsMono_400Regular',
    medium: 'JetBrainsMono_500Medium',
    semibold: 'JetBrainsMono_600SemiBold',
    bold: 'JetBrainsMono_700Bold',
  },
} as const;

export const typography = {
  display: {
    fontFamily: fonts.sans.extrabold,
    fontSize: 34,
    fontWeight: '800',
    lineHeight: 42,
  },
  title: {
    fontFamily: fonts.sans.bold,
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  heading: {
    fontFamily: fonts.sans.extrabold,
    fontSize: 18,
    fontWeight: '800',
    lineHeight: 22,
  },
  body: {
    fontFamily: fonts.sans.regular,
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fonts.sans.bold,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 24,
  },
  label: {
    fontFamily: fonts.sans.semibold,
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  labelStrong: {
    fontFamily: fonts.sans.bold,
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  sectionTitle: {
    fontFamily: fonts.sans.bold,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  money: {
    fontFamily: fonts.mono.bold,
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  caption: {
    fontFamily: fonts.sans.medium,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  /*
   * Emphasis variants. Each names the bold *file*, never just a heavier weight:
   * `{ ...typography.caption, fontWeight: '700' }` keeps Manrope Medium and asks
   * Android for a weight that file does not contain, so it draws faux-bold glyphs
   * wider than the layout measured. A label sized to its text then wraps and its
   * last word is clipped — which is how "+ Add subcategory" rendered as "+ Add".
   * The lint rule in eslint.config.js rejects the unpaired form.
   */
  captionStrong: {
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  overline: {
    fontFamily: fonts.mono.semibold,
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 1,
    lineHeight: 13,
    textTransform: 'uppercase',
  },
  moneyHero: {
    fontFamily: fonts.mono.bold,
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.6,
    lineHeight: 38,
  },
  moneyRow: {
    fontFamily: fonts.mono.bold,
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 18,
  },
} as const;

export const borderRadii = {
  xs: 6,
  sm: 8,
  md: 12,
  card: 16,
  lg: 20,
  hero: 20,
  full: 999,
} as const;

export const borderWidths = {
  thin: 1,
} as const;
