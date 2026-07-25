import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type NetWorthSummaryProps = {
  amount: string;
  currency: string;
};

export function NetWorthSummary({ amount, currency }: NetWorthSummaryProps) {
  const theme = useAppTheme();

  return (
    <Card
      accessibilityLabel={`Total net worth, ${amount} ${currency}. Assets minus current debt.`}
      style={styles.card}
      variant="raised">
      <Overline>Total net worth</Overline>
      <View style={styles.amountRow}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[styles.amount, { color: theme.primaryAction }]}>
          {amount}
        </Text>
        <Text style={[styles.currency, { color: theme.mutedText }]}>{currency}</Text>
      </View>
      <Text style={[styles.note, { color: theme.mutedText }]}>Assets minus current debt</Text>
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
