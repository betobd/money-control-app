import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { formatMoneyNumber } from '@/features/currency/currency';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatEstimatedReturn, investmentTypeLabels } from '../investment-format';
import { investmentTypes, type InvestmentAllocationSlice, type InvestmentType } from '../investment.types';
import { useInvestments } from '../use-investments';
import { InvestmentCard } from './investment-card';

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

  const gainCop = portfolio.estimatedGainLossCopMinor;
  const gainColor =
    gainCop === null || gainCop === 0
      ? theme.mutedText
      : gainCop > 0
        ? theme.income
        : theme.expense;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, { color: theme.primaryText }]}>Investments</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {loading ? (
          <View accessibilityLabel="Loading investments" style={styles.center}>
            <ActivityIndicator color={theme.primaryAction} size="large" />
          </View>
        ) : error ? (
          <View style={[styles.stateCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.stateTitle, { color: theme.primaryText }]}>Unable to load investments</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{error}</Text>
            <Action label="Retry" onPress={() => void reload()} primary />
          </View>
        ) : (
          <>
            <Card style={styles.summary} variant="raised">
              <Overline color={theme.secondaryText}>Total investment value</Overline>
              {portfolio.incomplete || portfolio.totalCurrentValueCopMinor === null ? (
                <Text style={[styles.amount, { color: theme.warning }]}>Estimated — incomplete</Text>
              ) : (
                <View style={styles.amountRow}>
                  <Text
                    adjustsFontSizeToFit
                    minimumFontScale={0.65}
                    numberOfLines={1}
                    style={[styles.amount, { color: theme.primaryAction }]}>
                    {formatMoneyNumber(portfolio.totalCurrentValueCopMinor, 'COP')}
                  </Text>
                  <Text style={[styles.amountCurrency, { color: theme.mutedText }]}>COP</Text>
                </View>
              )}
              <Text style={[styles.caption, { color: theme.mutedText }]}>
                {portfolio.incomplete
                  ? 'USD investments are excluded because no USD/COP exchange rate is available.'
                  : 'Consolidated in COP using the latest saved reference rate where needed.'}
              </Text>

              <View style={styles.summaryRows}>
                <SummaryRow
                  label="Net contributions"
                  value={portfolio.netContributionsCopMinor === null ? 'Estimated — incomplete' : `COP ${formatMoneyNumber(portfolio.netContributionsCopMinor, 'COP')}`}
                />
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>Estimated gain/loss</Text>
                  <Text style={[styles.summaryValue, { color: gainColor }]}>
                    {gainCop === null
                      ? 'Estimated — incomplete'
                      : `${gainCop > 0 ? '+' : ''}COP ${formatMoneyNumber(gainCop, 'COP')} · ${formatEstimatedReturn(portfolio.estimatedReturn)}`}
                  </Text>
                </View>
                <SummaryRow label="Investment accounts" value={String(portfolio.investmentAccountCount)} />
                <SummaryRow
                  label="Locked or restricted"
                  value={portfolio.lockedOrRestrictedValueCopMinor === null ? 'Estimated — incomplete' : `COP ${formatMoneyNumber(portfolio.lockedOrRestrictedValueCopMinor, 'COP')}`}
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
              <View style={[styles.stateCard, { backgroundColor: theme.surface }]}>
                <Text style={[styles.stateTitle, { color: theme.primaryText }]}>No investments yet</Text>
                <Text style={[styles.body, { color: theme.secondaryText }]}>
                  Track brokerage accounts, deposits, funds, and pensions. Add one to start following its value and estimated return.
                </Text>
              </View>
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

            <Action
              label="Add investment"
              onPress={() => router.push('/investment-form')}
              primary
            />
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
  return (
    <View style={styles.allocation}>
      <Overline color={theme.mutedText}>{title}</Overline>
      {slices.map((slice) => (
        <View key={slice.key} style={styles.summaryRow}>
          <Text style={[styles.summaryLabel, { color: theme.secondaryText }]}>{labelFor(slice.key)}</Text>
          <Text style={[styles.summaryValue, { color: theme.primaryText }]}>COP {formatMoneyNumber(slice.valueCopMinor, 'COP')}</Text>
        </View>
      ))}
    </View>
  );
}

function Action({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.action, { backgroundColor: primary ? theme.primaryAction : theme.elevatedSurface }]}>
      <Text style={[styles.actionText, { color: primary ? theme.onPrimaryAction : theme.primaryText }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
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
