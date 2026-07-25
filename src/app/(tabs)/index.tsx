import { SymbolView } from 'expo-symbols';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
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

function MonthPill({ label }: { label: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.monthPill, { backgroundColor: theme.elevatedSurface }]}>
      <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={16} tintColor={theme.mutedText} />
      <Text style={[styles.monthLabel, { color: theme.primaryText }]}>{label}</Text>
      <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={16} tintColor={theme.mutedText} />
    </View>
  );
}

export default function HomeScreen() {
  const theme = useAppTheme();
  const router = useRouter();
  const dashboard = useHomeDashboard();
  const monthDate = new Date(`${dashboard.month}-01T00:00:00Z`);
  const monthShort = new Intl.DateTimeFormat('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(monthDate).toUpperCase();
  const monthLong = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(monthDate);

  const net = dashboard.summary.net;
  const netUp = net >= 0;
  const netColor = netUp ? theme.income : theme.expense;
  const netLabel = `${netUp ? '+' : '-'}${formatCop(Math.abs(net))}`;

  if (!dashboard.hasLoaded && dashboard.loading) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <PrimaryScreenHeader accessory={<MonthPill label={monthShort} />} title="Money Control" />
        <View accessibilityLabel="Loading your dashboard" style={styles.stateArea}>
          <ActivityIndicator color={theme.primaryAction} size="large" />
        </View>
      </ScreenContainer>
    );
  }

  if (!dashboard.hasLoaded && dashboard.error) {
    return (
      <ScreenContainer contentStyle={styles.content}>
        <PrimaryScreenHeader accessory={<MonthPill label={monthShort} />} title="Money Control" />
        <View accessibilityLiveRegion="assertive" style={styles.stateArea}>
          <Text style={[styles.stateText, { color: theme.secondaryText }]}>{dashboard.error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void dashboard.reload()}
            style={[styles.retryButton, { backgroundColor: theme.primaryAction }]}>
            <Text style={[styles.retryLabel, { color: theme.onPrimaryAction }]}>Try again</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer contentStyle={styles.content}>
      <PrimaryScreenHeader accessory={<MonthPill label={monthShort} />} title="Money Control" />

      {dashboard.error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.inlineError, { color: theme.warning }]}>
          {dashboard.error}
        </Text>
      ) : null}

      <Card accessibilityLabel={`Total balance ${formatCop(dashboard.totalBalance)} Colombian pesos`} style={styles.hero} variant="hero">
        <Overline color={theme.mutedText}>Total balance · COP</Overline>
        <Text numberOfLines={1} style={[styles.heroBalance, { color: theme.primaryText }]}>
          {formatCop(dashboard.totalBalance)}
        </Text>
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

      <BudgetProgressCard summary={dashboard.budget} />

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
    gap: spacing.xs,
    height: 32,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  monthLabel: {
    fontFamily: fonts.mono.bold,
    fontSize: 12,
    lineHeight: 16,
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
