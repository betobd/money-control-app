import { StyleSheet, View } from 'react-native';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, spacing } from '@/constants/theme';
import { MoneyText } from '@/features/home/components/money-text';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type FinancialSummaryCardProps = {
  income: string;
  expenses: string;
  refunds?: string;
  netBalance: string;
};

/** Three-up Income / Expenses / Net strip (1b design). */
export function FinancialSummaryCard({ income, expenses, refunds, netBalance }: FinancialSummaryCardProps) {
  const theme = useAppTheme();
  const t = useMessages();

  return (
    <View style={styles.strip}>
      <Card padding={spacing.sm + spacing.xs} style={styles.tile}>
        <Overline>{t.home.income}</Overline>
        <MoneyText style={styles.value} tone="income">
          {income}
        </MoneyText>
      </Card>
      {refunds ? (
        <Card padding={spacing.sm + spacing.xs} style={styles.tile}>
          <Overline>{t.home.refunds}</Overline>
          <MoneyText style={styles.value} tone="refund">
            {refunds}
          </MoneyText>
        </Card>
      ) : null}
      <Card padding={spacing.sm + spacing.xs} style={styles.tile}>
        <Overline>{t.home.netExpenses}</Overline>
        <MoneyText style={styles.value} tone="expense">
          {expenses}
        </MoneyText>
      </Card>
      <Card padding={spacing.sm + spacing.xs} style={StyleSheet.flatten([styles.tile, { backgroundColor: theme.tintPrimary }])}>
        <Overline color={theme.transfer}>{t.home.netResult}</Overline>
        <MoneyText style={styles.value}>{netBalance}</MoneyText>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  strip: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  tile: {
    borderRadius: borderRadii.md,
    flexGrow: 1,
    flexBasis: '30%',
    gap: spacing.xs - 1,
    minWidth: 0,
  },
  value: {
    fontSize: 14,
    lineHeight: 19,
  },
});
