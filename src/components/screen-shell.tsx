import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type ScreenShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function ScreenShell({ title, description, children }: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.appBackground,
          paddingTop: insets.top + spacing.lg,
        },
      ]}>
      <Text style={[styles.brand, { color: theme.primaryAction }]}>{t.common.appName}</Text>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: theme.secondaryText }]}>{description}</Text>
      </View>
      <View style={[styles.placeholder, { backgroundColor: theme.surface }]}>
        <Text style={[styles.placeholderText, { color: theme.mutedText }]}>{t.common.comingSoon}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  brand: {
    ...typography.bodyStrong,
    textAlign: 'center',
  },
  heading: {
    gap: spacing.xs,
    marginTop: spacing.xxl,
  },
  title: {
    ...typography.title,
  },
  description: {
    ...typography.body,
  },
  placeholder: {
    alignItems: 'center',
    borderRadius: borderRadii.lg,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 152,
    padding: spacing.lg,
  },
  placeholderText: {
    ...typography.body,
  },
});
