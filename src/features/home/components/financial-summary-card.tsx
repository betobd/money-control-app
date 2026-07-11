import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { MoneyText } from '@/features/home/components/money-text';
import { useAppTheme } from '@/hooks/use-app-theme';

type FinancialSummaryCardProps = {
  income: string;
  expenses: string;
  netBalance: string;
};

export function FinancialSummaryCard({ income, expenses, netBalance }: FinancialSummaryCardProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.columns}>
        <SummaryColumn direction="down" label="Income" value={income} />
        <View style={[styles.verticalDivider, { backgroundColor: theme.border }]} />
        <SummaryColumn direction="up" label="Expenses" value={expenses} />
      </View>
      <View style={[styles.divider, { backgroundColor: theme.border }]} />
      <View style={styles.netRow}>
        <View style={styles.netLabelRow}>
          <SymbolView
            name={{ ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
            size={18}
            tintColor={theme.transfer}
          />
          <Text style={[styles.netLabel, { color: theme.primaryText }]}>Monthly net balance</Text>
        </View>
        <MoneyText style={styles.netValue} tone="income">
          {netBalance}
        </MoneyText>
      </View>
    </View>
  );
}

function SummaryColumn({
  direction,
  label,
  value,
}: {
  direction: 'up' | 'down';
  label: string;
  value: string;
}) {
  const theme = useAppTheme();
  const tone = direction === 'down' ? 'income' : 'expense';
  const color = tone === 'income' ? theme.income : theme.expense;

  return (
    <View style={styles.column}>
      <View style={styles.labelRow}>
        <SymbolView
          name={
            direction === 'down'
              ? { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }
              : { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }
          }
          size={18}
          tintColor={color}
        />
        <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      </View>
      <MoneyText style={styles.summaryValue} tone={tone}>
        {value}
      </MoneyText>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    padding: spacing.md,
  },
  columns: {
    alignItems: 'stretch',
    flexDirection: 'row',
  },
  column: {
    flex: 1,
    gap: spacing.sm,
    minWidth: 0,
  },
  labelRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
  },
  label: {
    ...typography.label,
  },
  summaryValue: {
    fontSize: 18,
  },
  verticalDivider: {
    marginHorizontal: spacing.sm,
    width: borderWidths.thin,
  },
  divider: {
    height: borderWidths.thin,
    marginVertical: spacing.md,
  },
  netRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  netLabelRow: {
    alignItems: 'center',
    flex: 1,
    flexDirection: 'row',
    gap: spacing.sm,
    minWidth: 0,
  },
  netLabel: {
    ...typography.label,
    flexShrink: 1,
  },
  netValue: {
    flexShrink: 1,
    textAlign: 'right',
  },
});
