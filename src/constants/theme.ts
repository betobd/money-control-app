export const colors = {
  light: {
    background: '#F5F7FB',
    surface: '#FFFFFF',
    surfaceRaised: '#FFFFFF',
    border: '#DCE3EF',
    text: '#17202A',
    textMuted: '#667085',
    primary: '#246BFD',
    primaryStrong: '#0E3F91',
    primarySoft: '#DCE9FF',
    onPrimary: '#FFFFFF',
    income: '#00A878',
    expense: '#E46962',
  },
  dark: {
    background: '#081225',
    surface: '#111D35',
    surfaceRaised: '#18243D',
    border: '#273550',
    text: '#DCE5FA',
    textMuted: '#9DAAC4',
    primary: '#4B8DFF',
    primaryStrong: '#0A3B79',
    primarySoft: '#A9C8FF',
    onPrimary: '#06152C',
    income: '#34D8A0',
    expense: '#FF9A91',
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
} as const;

export const borderRadii = {
  sm: 8,
  md: 12,
  lg: 20,
} as const;
