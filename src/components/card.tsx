import type { ReactNode } from 'react';
import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { borderRadii, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type CardVariant = 'surface' | 'raised' | 'hero';

type CardProps = ViewProps & {
  children?: ReactNode;
  variant?: CardVariant;
  padding?: number;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Filled tonal card (no border) — the base surface of the 1b design language.
 * `hero` adds a subtle inset top highlight to lift the primary balance card.
 */
export function Card({ children, variant = 'surface', padding = spacing.md, style, ...rest }: CardProps) {
  const theme = useAppTheme();
  const backgroundColor =
    variant === 'hero'
      ? theme.heroGradientStart
      : variant === 'raised'
        ? theme.surfaceRaised
        : theme.surface;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor, padding, borderRadius: variant === 'hero' ? borderRadii.hero : borderRadii.card },
        variant === 'hero' && { borderTopColor: theme.heroHighlight, borderTopWidth: 1 },
        style,
      ]}
      {...rest}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadii.card,
  },
});
