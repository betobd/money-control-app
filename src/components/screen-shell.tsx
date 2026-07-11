import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type ScreenShellProps = {
  title: string;
  description: string;
  children?: ReactNode;
};

export function ScreenShell({ title, description, children }: ScreenShellProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingTop: insets.top + spacing.lg,
        },
      ]}>
      <Text style={[styles.brand, { color: theme.primarySoft }]}>Money Control</Text>
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          {title}
        </Text>
        <Text style={[styles.description, { color: theme.textMuted }]}>{description}</Text>
      </View>
      <View style={[styles.placeholder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.placeholderText, { color: theme.textMuted }]}>Coming soon</Text>
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
    ...typography.body,
    fontWeight: '700',
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
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.lg,
    minHeight: 152,
    padding: spacing.lg,
  },
  placeholderText: {
    ...typography.body,
  },
});
