import { useColorScheme } from 'react-native';

import { colors } from '@/constants/theme';

export function useAppTheme() {
  return useColorScheme() === 'dark' ? colors.dark : colors.light;
}
