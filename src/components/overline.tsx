import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type OverlineProps = {
  children: ReactNode;
  color?: string;
  style?: TextStyle | TextStyle[];
};

/** Mono uppercase eyebrow label used above amounts and section groups. */
export function Overline({ children, color, style }: OverlineProps) {
  const theme = useAppTheme();
  return (
    <Text numberOfLines={1} style={[styles.overline, { color: color ?? theme.mutedText }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  overline: {
    ...typography.overline,
  },
});
