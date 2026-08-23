import type { ReactNode } from 'react';
import { RefreshControl, ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type ScreenContainerProps = {
  children: ReactNode;
  contentStyle?: ViewStyle;
  /**
   * Enables pull-to-refresh. Screens that derive their data from SQLite pass
   * their `reload` here so the user can force a re-read without leaving and
   * re-entering the tab.
   */
  onRefresh?: () => void;
  /** Drives the spinner while `onRefresh` is in flight. */
  refreshing?: boolean;
};

export function ScreenContainer({ children, contentStyle, onRefresh, refreshing = false }: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <ScrollView
      alwaysBounceVertical={false}
      contentContainerStyle={[
        styles.content,
        {
          paddingBottom: spacing.xxl,
          paddingTop: insets.top + spacing.md,
        },
        contentStyle,
      ]}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            colors={[theme.primaryAction]}
            onRefresh={onRefresh}
            progressBackgroundColor={theme.surface}
            refreshing={refreshing}
            tintColor={theme.primaryAction}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.appBackground }}>
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.md,
  },
});
