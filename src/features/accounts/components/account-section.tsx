import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type AccountSectionSummary = {
  label: string;
  /** Formatted amount, or null when it cannot be estimated. */
  value: string | null;
  tone?: 'default' | 'debt' | 'credit';
};

type AccountSectionProps = {
  title: string;
  summary?: AccountSectionSummary;
  /** Shown when `summary.value` is null. */
  incompleteLabel: string;
  action?: { label: string; accessibilityLabel: string; onPress: () => void };
  children: ReactNode;
};

/** One group on the Accounts overview: title, the figure that matters for it, its cards. */
export function AccountSection({ title, summary, incompleteLabel, action, children }: AccountSectionProps) {
  const theme = useAppTheme();
  const valueColor = summary?.value === null
    ? theme.warning
    : summary?.tone === 'debt'
      ? theme.expense
      : summary?.tone === 'credit'
        ? theme.income
        : theme.primaryText;

  return (
    <View accessibilityLabel={title} style={styles.section}>
      <View style={styles.header}>
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
          {summary ? (
            <Text numberOfLines={1} style={[styles.summaryLabel, { color: theme.secondaryText }]}>
              {`${summary.label} `}
              <Text style={[styles.summaryValue, { color: valueColor }]}>{summary.value ?? incompleteLabel}</Text>
            </Text>
          ) : null}
        </View>
        {action ? (
          <Pressable
            accessibilityLabel={action.accessibilityLabel}
            accessibilityRole="button"
            onPress={action.onPress}
            style={[styles.action, { backgroundColor: theme.elevatedSurface }]}>
            <Text style={[styles.actionText, { color: theme.primaryAction }]}>{action.label}</Text>
          </Pressable>
        ) : null}
      </View>
      <View style={styles.cards}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.sm + spacing.xs },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  heading: { flex: 1, gap: 2 },
  title: { ...typography.sectionTitle, fontSize: 15, lineHeight: 20 },
  summaryLabel: { ...typography.caption },
  summaryValue: { ...typography.moneyRow },
  action: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 34, paddingHorizontal: spacing.sm + spacing.xs },
  actionText: { ...typography.label },
  cards: { gap: spacing.sm + spacing.xs },
});
