export const colors = {
  light: {
    appBackground: '#F4F7FC',
    surface: '#FFFFFF',
    elevatedSurface: '#E8EEF8',
    primaryText: '#13213A',
    secondaryText: '#40506B',
    mutedText: '#647187',
    border: '#CCD5E5',
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
    disabledSurface: '#E2E7EF',
    disabledText: '#727E91',
    progressTrack: '#D8DFEB',
    progressFill: '#246BFD',
  },
  dark: {
    appBackground: '#081225',
    surface: '#101C33',
    elevatedSurface: '#1A2741',
    primaryText: '#E4EBFA',
    secondaryText: '#BBC6DB',
    mutedText: '#95A2BB',
    border: '#35435F',
    primaryAction: '#79A9FF',
    onPrimaryAction: '#07182E',
    selectedNavigationBackground: '#A9C8FF',
    selectedNavigationForeground: '#06152C',
    navigationInactive: '#AAB6CC',
    income: '#45DDB0',
    expense: '#FFA39B',
    transfer: '#9CB7FF',
    warning: '#F1C66D',
    destructive: '#FF6673',
    disabledSurface: '#202C44',
    disabledText: '#8290AA',
    progressTrack: '#35415C',
    progressFill: '#A9C8FF',
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  display: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 42,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    lineHeight: 40,
  },
  body: {
    fontSize: 16,
    fontWeight: '400',
    lineHeight: 24,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 24,
  },
  money: {
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 26,
  },
  caption: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
} as const;

export const borderRadii = {
  sm: 8,
  md: 12,
  lg: 20,
  full: 999,
} as const;

export const borderWidths = {
  thin: 1,
} as const;
