import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

/**
 * The bar pinned under a form that holds its primary command (Save, Apply).
 *
 * Rendered after the ScrollView, not inside it, so the command is reachable
 * without scrolling past every field. Eleven screens used to build this by hand
 * with slightly different paddings and borders.
 */
export function FixedFooter({ bottomInset, children }: { bottomInset: number; children: ReactNode }) {
  const theme = useAppTheme();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.appBackground,
          borderTopColor: theme.hairline,
          paddingBottom: Math.max(bottomInset, spacing.md),
        },
      ]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.sm, paddingHorizontal: spacing.md, paddingTop: spacing.md },
});
