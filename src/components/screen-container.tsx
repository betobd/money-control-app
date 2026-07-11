import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type ScreenContainerProps = {
  children: ReactNode;
  contentStyle?: ViewStyle;
};

export function ScreenContainer({ children, contentStyle }: ScreenContainerProps) {
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
