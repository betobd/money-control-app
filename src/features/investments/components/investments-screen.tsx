import { useRouter } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { formatMoney, formatMoneyNumber } from '@/features/currency/currency';
import { useBaseCurrency } from '@/features/settings/use-base-currency';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatEstimatedReturn, investmentTypeLabels } from '../investment-format';
import { investmentTypes, type InvestmentAllocationSlice, type InvestmentType } from '../investment.types';
import { useInvestments } from '../use-investments';
import { InvestmentCard } from './investment-card';
import { EmptyState } from '@/components/empty-state';
import { ScreenHeader } from '@/components/screen-header';

function allocationTypeLabel(key: string): string {
  return (investmentTypes as readonly string[]).includes(key)
    ? investmentTypeLabels[key as InvestmentType]
    : key;
}

export function InvestmentsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const router = useRouter();
  const { portfolio, loading, error, reload } = useInvestments();
  const baseCurrency = useBaseCurrency();

  const gainBase = portfolio.estimatedGainLossBaseMinor;
  const gainColor =
    gainBase === null || gainBase === 0
      ? theme.mutedText
      : gainBase > 0
        ? theme.income
        : theme.expense;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader
        action={{ kind: 'add', accessibilityLabel: 'Add investment', onPress: () => router.push('/investment-form') }}
        leading="back"
        title="Investments"
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {loading ? (
          <View accessibilityLabel="Loading investments" style={styles.center}>
            <ActivityIndicator color={theme.primaryAction} size="large" />
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.stateTitle, { color: theme.primaryText }]}>Unable to load investments</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{error}</Text>
            <Button label="Retry" onPress={() => void reload()} variant="primary" />
          </View>
        ) : (
          <>
            <Card style={styles.summary} variant="raised">
              <Overline color={theme.secondaryText}>Total investment value</Overline>
              {portfolio.incomplete || portfolio.totalCurrentValueBaseMinor === null ? (
                <Text style={[styles.amount, { color: theme.warning }]}>Estimated — incomplete</Text>
              ) : (
                <View style={styles.amountRow}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={1}
                    style={[styles.amount, { color: theme.primaryAction }]}>
                    {formatMoneyNumber(portfolio.totalCurrentValueBaseMinor, baseCurrency)}
                  </Text>
                  <Text style={[styles.amountCurrency, { color: theme.mutedText }]}>{baseCurrency}</Text>
                </View>
              )}
              <Text style={[styles.caption, { color: theme.mutedText }]}>
                {portfolio.incomplete
                  ? `Investments in other currencies are excluded because no exchange rate to ${baseCurrency} is available.`
                  : `Consolidated in ${baseCurrency} using the latest saved reference rate where needed.`}
              </Text>

              <View style={styles.summaryRows}>
                <SummaryRow
                  label="Net contributions"
                  value={portfolio.netContributionsBaseMinor === null ? 'Estimated — incomplete' : formatMoney(portfolio.netContributionsBaseMinor, baseCurrency)}
                />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>Estimated gain/loss</Text>
                  <Text style={[styles.summaryValue, { color: gainColor }]}>
                    {gainBase === null
                      ? 'Estimated — incomplete'
                      : `${gainBase > 0 ? '+' : ''}${formatMoney(gainBase, baseCurrency)} · ${formatEstimatedReturn(portfolio.estimatedReturn)}`}
                  </Text>
                </View>
                <SummaryRow label="Investment accounts" value={String(portfolio.investmentAccountCount)} />
                <SummaryRow
                  label="Locked or restricted"
                  value={portfolio.lockedOrRestrictedValueBaseMinor === null ? 'Estimated — incomplete' : formatMoney(portfolio.lockedOrRestrictedValueBaseMinor, baseCurrency)}
                />
              </View>

              {!portfolio.incomplete && portfolio.allocationByType.length > 0 ? (
                <AllocationBlock
                  title="Allocation by type"
                  slices={portfolio.allocationByType}
                  labelFor={allocationTypeLabel}
                />
              ) : null}
              {!portfolio.incomplete && portfolio.allocationByCurrency.length > 0 ? (
                <AllocationBlock
                  title="Allocation by currency"
                  slices={portfolio.allocationByCurrency}
                  labelFor={(key) => key}
                />
              ) : null}
            </Card>

            {portfolio.accounts.length === 0 ? (
              <EmptyState
                action={{ label: 'Add investment', onPress: () => router.push('/investment-form'), accessibilityLabel: 'Add your first investment' }}
                body="Track brokerage accounts, deposits, funds, and pensions. Add one to start following its value and estimated return."
                icon={{ ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }}
                title="No investments yet"
              />
            ) : (
              <View style={styles.list}>
                {portfolio.accounts.map((view) => (
                  <InvestmentCard
                    key={view.account.id}
                    view={view}
                    onPress={() => router.push({ pathname: '/investments/[id]', params: { id: view.account.id } })}
                  />
                ))}
              </View>
            )}

          </>
        )}
      </ScrollView>

    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.summaryRow}>
      <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.summaryValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function AllocationBlock({
  title,
  slices,
  labelFor,
}: {
  title: string;
  slices: InvestmentAllocationSlice[];
  labelFor: (key: string) => string;
}) {
  const theme = useAppTheme();
  const baseCurrency = useBaseCurrency();
  return (
    <View style={styles.allocation}>
      <Overline color={theme.mutedText}>{title}</Overline>
      {slices.map((slice) => (
        <View key={slice.key} style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>{labelFor(slice.key)}</Text>
          <Text style={[styles.summaryValue, { color: theme.primaryText }]}>{formatMoney(slice.valueBaseMinor, baseCurrency)}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.md },
  center: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xxl },
  summary: { gap: spacing.sm },
  amountRow: { alignItems: 'baseline', flexDirection: 'row', maxWidth: '100%' },
  amount: { ...typography.moneyHero, flexShrink: 1 },
  amountCurrency: { ...typography.caption, marginLeft: spacing.xs },
  caption: { ...typography.caption },
  summaryRows: { gap: spacing.sm, marginTop: spacing.xs },
  summaryRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  summaryLabel: { ...typography.caption, flexShrink: 1 },
  summaryValue: { ...typography.moneyRow, flexShrink: 1, textAlign: 'right' },
  allocation: { gap: spacing.sm, marginTop: spacing.sm },
  list: { gap: spacing.sm + spacing.xs },
  stateCard: { borderRadius: borderRadii.card, gap: spacing.md, padding: spacing.lg },
  stateTitle: { ...typography.sectionTitle },
  body: { ...typography.body },
  action: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.lg },
  actionText: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
});
