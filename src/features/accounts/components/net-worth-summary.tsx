import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type NetWorthSummaryProps = {
  amount: string;
  currency: string;
  /** True when the estimate includes USD accounts converted at the current rate. */
  estimated?: boolean;
  /** True when USD accounts are excluded because no valid rate exists. */
  incomplete?: boolean;
};

export function NetWorthSummary({ amount, currency, estimated, incomplete }: NetWorthSummaryProps) {
  const theme = useAppTheme();
  const title = estimated || incomplete ? 'Estimated net worth' : 'Total net worth';
  const note = incomplete
    ? 'USD accounts are not included because no USD/COP exchange rate is available.'
    : estimated
      ? 'Includes USD accounts converted using the latest saved reference rate.'
      : 'Assets minus current debt';

  return (
    <Card
      accessibilityLabel={`${title}, ${incomplete ? 'estimated, incomplete' : amount + ' ' + currency}. ${note}`}
      style={styles.card}
      variant="raised">
      <Overline>{title}</Overline>
      <View style={styles.amountRow}>
        {incomplete ? (
          <Text style={[styles.amount, { color: theme.warning }]}>Estimated — incomplete</Text>
        ) : (
          <>
            <Text
              adjustsFontSizeToFit
              minimumFontScale={0.65}
              numberOfLines={1}
              style={[styles.amount, { color: theme.primaryAction }]}>
              {amount}
            </Text>
            <Text style={[styles.currency, { color: theme.mutedText }]}>{currency}</Text>
          </>
        )}
      </View>
      <Text style={[styles.note, { color: theme.mutedText }]}>{note}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.xs,
  },
  amountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    maxWidth: '100%',
  },
  amount: {
    ...typography.moneyHero,
    flexShrink: 1,
  },
  currency: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
  note: {
    ...typography.caption,
  },
});
