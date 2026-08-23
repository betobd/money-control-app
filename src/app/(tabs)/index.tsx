import { SymbolView } from 'expo-symbols';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { shiftCalendarMonth } from '@/components/calendar';
import { Card } from '@/components/card';
import { PressableScale } from '@/components/pressable-scale';
import { Overline } from '@/components/overline';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { BudgetProgressCard } from '@/features/home/components/budget-progress-card';
import { FinancialSummaryCard } from '@/features/home/components/financial-summary-card';
import { SectionHeader } from '@/features/home/components/section-header';
import { TransactionListItem } from '@/features/home/components/transaction-list-item';
import { useHomeDashboard } from '@/features/home/use-home-dashboard';
import { formatCop } from '@/features/accounts/account-format';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import {
  signedTransactionAmount,
  transactionAccountLabel,
  transactionIcon,
  transactionTitle,
  transactionTypeLabel,
} from '@/features/transactions/transaction-presentation';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

function MonthPill({
  label,
  longLabel,
  onPrevious,
  onNext,
}: {
  label: string;
  longLabel: string;
  onPrevious: () => void;
  onNext: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel={`Selected month, ${longLabel}`}
      style={[styles.monthPill, { backgroundColor: theme.elevatedSurface }]}>
      <Pressable
        accessibilityHint="Shows the previous month's summary and budgets"
        accessibilityLabel="Previous month"
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onPrevious}
        style={styles.monthArrow}>
        <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={16} tintColor={theme.secondaryText} />
      </Pressable>
      <Text accessibilityLiveRegion="polite" style={[styles.monthLabel, { color: theme.primaryText }]}>{label}</Text>
      <Pressable
        accessibilityHint="Shows the next month's summary and budgets"
        accessibilityLabel="Next month"
        accessibilityRole="button"
        hitSlop={spacing.sm}
        onPress={onNext}
        style={styles.monthArrow}>
        <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={theme.secondaryText} />
      </Pressable>
    </View>
  );
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dashboard = useHomeDashboard();
  const pullToRefresh = usePullToRefresh(dashboard.reload);
  const monthDate = new Date(`${dashboard.month}-01T00:00:00Z`);
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(monthDate).toUpperCase();
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate);
  const shiftMonth = (delta: number) => dashboard.setMonth((current) => shiftCalendarMonth(current, delta));
  const monthPill = (
    <MonthPill
      label={monthShort}
      longLabel={monthLong}
      onNext={() => shiftMonth(1)}
      onPrevious={() => shiftMonth(-1)}
    />
  );

  const net = dashboard.summary.net;
  const netUp = net >= 0;
  const netColor = netUp ? theme.income : theme.expense;
  const netLabel = `${netUp ? '+' : '-'}${formatCop(Math.abs(net))}`;

  const investments = dashboard.investments;
  const investmentGain = investments.estimatedGainLossCopMinor;
  const investmentGainColor = investmentGain === null || investmentGain === 0 ? theme.mutedText : investmentGain > 0 ? theme.income : theme.expense;
  const latestValuationDate = investments.accounts.reduce<string | undefined>((latest, view) => {
    const date = view.latestValuation?.valuationDate;
    return date && date > (latest ?? '') ? date : latest;
  }, undefined);

  if (!dashboard.hasLoaded && dashboard.loading) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <PrimaryScreenHeader accessory={monthPill} title="Money Control" />
        <View accessibilityLabel="Loading your dashboard" style={styles.stateArea}>
          <ActivityIndicator color={theme.primaryAction} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!dashboard.hasLoaded && dashboard.error) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <PrimaryScreenHeader accessory={monthPill} title="Money Control" />
        <View accessibilityLiveRegion="assertive" style={styles.stateArea}>
          <Text style={[styles.stateText, { color: theme.secondaryText }]}>{dashboard.error}</Text>
          <Button label="Try again" onPress={() => void dashboard.reload()} variant="primary" />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.content} {...pullToRefresh}>
      <PrimaryScreenHeader accessory={monthPill} title="Money Control" />

      {dashboard.error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.inlineError, { color: theme.warning }]}>
          {dashboard.error}
        </Text>
      ) : null}

      <Card
        accessibilityLabel={
          dashboard.netWorth.totalCopMinor === null
            ? 'Estimated net worth is incomplete because no USD/COP exchange rate is available'
            : `${dashboard.netWorth.includesForeign ? 'Estimated net worth' : 'Total balance'} ${formatCop(dashboard.netWorth.totalCopMinor)} Colombian pesos`
        }
        style={styles.hero}
        variant="hero">
        <Overline color={theme.mutedText}>
          {dashboard.netWorth.includesForeign ? 'Estimated net worth · COP' : 'Total balance · COP'}
        </Overline>
        {dashboard.netWorth.totalCopMinor === null ? (
          <Text numberOfLines={1} style={[styles.heroBalance, { color: theme.warning }]}>Estimated — incomplete</Text>
        ) : (
          <Text numberOfLines={1} style={[styles.heroBalance, { color: theme.primaryText }]}>
            {formatCop(dashboard.netWorth.totalCopMinor)}
          </Text>
        )}
        <View style={styles.trendRow}>
          <SymbolView
            name={netUp ? { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' } : { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }}
            size={16}
            tintColor={netColor}
          />
          <Text style={[styles.trendValue, { color: netColor }]}>{netLabel}</Text>
          <Text style={[styles.trendMeta, { color: theme.mutedText }]}>net in {monthLong}</Text>
        </View>
      </Card>

      <FinancialSummaryCard
        expenses={`${dashboard.summary.netExpenses < 0 ? '+' : '-'}${formatCop(Math.abs(dashboard.summary.netExpenses))}`}
        income={`+${formatCop(dashboard.summary.income)}`}
        refunds={dashboard.summary.refunds > 0 ? `+${formatCop(dashboard.summary.refunds)}` : undefined}
        netBalance={`${net < 0 ? '-' : '+'}${formatCop(Math.abs(net))}`}
      />

      {investments.investmentAccountCount > 0 ? (
        <PressableScale
          accessibilityHint="Open the investments screen"
          accessibilityLabel={`Investments, current value ${investments.totalCurrentValueCopMinor === null ? 'estimated, incomplete' : `${formatCop(investments.totalCurrentValueCopMinor)} Colombian pesos`}`}
          accessibilityRole="button"
          activeScale={0.985}
          onPress={() => router.push('/investments')}>
          <Card variant="raised">
            <View style={styles.investmentHeader}>
              <Overline color={theme.mutedText}>Investments · COP</Overline>
              <View style={styles.viewAll}>
                <Text style={[styles.viewAllText, { color: theme.primaryAction }]}>View investments</Text>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={theme.primaryAction} />
              </View>
            </View>
            {investments.totalCurrentValueCopMinor === null ? (
              <Text numberOfLines={1} style={[styles.investmentValue, { color: theme.warning }]}>Estimated — incomplete</Text>
            ) : (
              <Text numberOfLines={1} style={[styles.investmentValue, { color: theme.primaryText }]}>
                {formatCop(investments.totalCurrentValueCopMinor)}
              </Text>
            )}
            <Text style={[styles.investmentMeta, { color: investmentGainColor }]}>
              {investmentGain === null
                ? 'Estimated gain/loss unavailable'
                : `${investmentGain > 0 ? '+' : investmentGain < 0 ? '-' : ''}${formatCop(Math.abs(investmentGain))} estimated gain/loss`}
              {latestValuationDate ? ` · as of ${formatTransactionDate(latestValuationDate)}` : ''}
            </Text>
          </Card>
        </PressableScale>
      ) : null}

      <BudgetProgressCard budgets={dashboard.budgets} summary={dashboard.budget} />

      <SectionHeader
        action={
          <Link asChild href="/transactions">
            <Pressable accessibilityLabel="View all transactions" style={styles.viewAll}>
              <Text style={[styles.viewAllText, { color: theme.primaryAction }]}>View all</Text>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={theme.primaryAction} />
            </Pressable>
          </Link>
        }
        title="Recent transactions"
      />

      <View style={styles.transactions}>
        {dashboard.recent.map((transaction) => (
          <TransactionListItem
            key={transaction.id}
            amount={signedTransactionAmount(transaction)}
            icon={transactionIcon(transaction)}
            onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } })}
            subtitle={`${formatTransactionDate(transaction.transactionDate)} · ${transactionTypeLabel(transaction)}${transaction.type === 'transfer' ? ` · ${transactionAccountLabel(transaction)}` : ''}`}
            title={transactionTitle(transaction)}
            tone={transaction.type}
          />
        ))}
        {!dashboard.loading && !dashboard.error && dashboard.recent.length === 0 ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>No recent transactions.</Text>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.md - spacing.xs,
  },
  monthPill: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    height: 32,
    paddingHorizontal: spacing.xs,
  },
  monthArrow: {
    alignItems: 'center',
    height: 32,
    justifyContent: 'center',
    width: 26,
  },
  monthLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 12,
    lineHeight: 16,
    minWidth: 62,
    textAlign: 'center',
  },
  hero: {
    gap: spacing.xs + 2,
  },
  heroBalance: {
    ...typography.moneyHero,
  },
  trendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs + 2,
  },
  trendValue: {
    fontFamily: fonts.sans.semibold,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  trendMeta: {
    fontFamily: fonts.sans.medium,
    fontSize: 13,
    fontWeight: '500',
    lineHeight: 18,
  },
  investmentHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  investmentValue: {
    ...typography.moneyHero,
    marginTop: spacing.xs,
  },
  investmentMeta: {
    ...typography.caption,
    marginTop: spacing.xs,
  },
  viewAll: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 2,
    minHeight: 32,
  },
  viewAllText: {
    ...typography.label,
  },
  transactions: {
    gap: spacing.sm - 2,
  },
  empty: {
    ...typography.caption,
    paddingVertical: spacing.lg,
    textAlign: 'center',
  },
  stateArea: {
    alignItems: 'center',
    gap: spacing.md,
    justifyContent: 'center',
    paddingVertical: spacing.xxl,
  },
  stateText: {
    ...typography.body,
    textAlign: 'center',
  },
  retryButton: {
    borderRadius: borderRadii.full,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  retryLabel: {
    ...typography.label,
  },
  inlineError: {
    ...typography.caption,
  },
});
