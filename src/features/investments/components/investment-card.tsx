import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { fonts, spacing, typography } from '@/constants/theme';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import { formatMoneyNumber, formatMoneyWithSymbol } from '@/features/currency/currency';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatEstimatedReturn, investmentLiquidityLabels, investmentTypeLabels } from '../investment-format';
import type { InvestmentAccountView } from '../investment.types';

type InvestmentCardProps = {
  view: InvestmentAccountView;
  onPress: () => void;
};

/** Portfolio row: one investment account with its current value and estimated return. */
export function InvestmentCard({ view, onPress }: InvestmentCardProps) {
  const theme = useAppTheme();
  const { account, metadata } = view;
  const currency = account.currency;
  const isForeign = currency !== 'COP';

  const gainColor =
    view.estimatedGainLossMinor > 0
      ? theme.income
      : view.estimatedGainLossMinor < 0
        ? theme.expense
        : theme.mutedText;
  const gainSign = view.estimatedGainLossMinor > 0 ? '+' : '';

  return (
    <PressableScale
      accessibilityHint="Open investment details"
      accessibilityLabel={`${account.name}, ${investmentTypeLabels[metadata.investmentType]}, current value ${formatMoneyWithSymbol(view.currentValueMinor, currency)}`}
      accessibilityRole="button"
      onPress={onPress}>
      <Card style={styles.card} variant="raised">
        <View style={styles.headerRow}>
          <AccountTypeIcon kind="investment" size={40} />
          <View style={styles.titleBlock}>
            <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>{account.name}</Text>
            <Text numberOfLines={1} style={[styles.subtitle, { color: theme.mutedText }]}>
              {investmentTypeLabels[metadata.investmentType]} · {currency}
            </Text>
          </View>
        </View>

        <View style={styles.valueBlock}>
          <Overline color={theme.secondaryText}>Current value</Overline>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            numberOfLines={1}
            style={[styles.value, { color: theme.primaryText }]}>
            {formatMoneyWithSymbol(view.currentValueMinor, currency)}
          </Text>
          {isForeign ? (
            <Text style={[styles.caption, { color: theme.mutedText }]}>
              {view.estimatedValueCopMinor === null
                ? 'Estimated COP — rate unavailable'
                : `≈ COP ${formatMoneyNumber(view.estimatedValueCopMinor, 'COP')}`}
            </Text>
          ) : null}
        </View>

        <MetricRow
          label="Net contributions"
          value={formatMoneyWithSymbol(view.netContributionsMinor, currency)}
        />
        <View style={styles.metricRow}>
          <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>Estimated gain/loss</Text>
          <Text style={[styles.metricValue, { color: gainColor }]}>
            {gainSign}{formatMoneyWithSymbol(view.estimatedGainLossMinor, currency)} · {formatEstimatedReturn(view.estimatedReturn)}
          </Text>
        </View>
        <MetricRow
          label="Latest valuation"
          value={view.latestValuation ? formatTransactionDate(view.latestValuation.valuationDate) : 'No valuation yet'}
        />
        <MetricRow label="Liquidity" value={investmentLiquidityLabels[metadata.liquidity]} />
        {metadata.maturityDate ? (
          <MetricRow label="Maturity" value={formatTransactionDate(metadata.maturityDate)} />
        ) : null}
      </Card>
    </PressableScale>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  headerRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  titleBlock: { flex: 1, gap: spacing.xs },
  name: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
  subtitle: { ...typography.caption },
  valueBlock: { gap: spacing.xs },
  value: { ...typography.moneyHero },
  caption: { ...typography.caption },
  metricRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  metricLabel: { ...typography.caption, flexShrink: 1 },
  metricValue: { ...typography.moneyRow, flexShrink: 1, textAlign: 'right' },
});
