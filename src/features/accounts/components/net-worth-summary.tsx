import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type NetWorthSummaryProps = {
  amount: string;
  currency: string;
};

export function NetWorthSummary({ amount, currency }: NetWorthSummaryProps) {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel={`Total net worth, ${amount} ${currency}. Includes assets minus debt.`}
      style={[styles.card, { backgroundColor: theme.elevatedSurface, borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>Total net worth</Text>
      <View style={styles.amountRow}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[styles.amount, { color: theme.primaryAction }]}>
          {amount}
        </Text>
        <Text style={[styles.currency, { color: theme.secondaryText }]}>{currency}</Text>
      </View>
      <Text style={[styles.note, { color: theme.mutedText }]}>Assets minus amounts owed</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.xs,
    padding: spacing.md,
  },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  amountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    maxWidth: '100%',
  },
  amount: {
    ...typography.display,
    flexShrink: 1,
    fontSize: 29,
    fontVariant: ['tabular-nums'],
    lineHeight: 36,
  },
  currency: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  note: {
    ...typography.caption,
  },
});
