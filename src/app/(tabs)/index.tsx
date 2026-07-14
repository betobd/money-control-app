import { SymbolView } from 'expo-symbols';
import { Link } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { BudgetProgressCard } from '@/features/home/components/budget-progress-card';
import { FinancialSummaryCard } from '@/features/home/components/financial-summary-card';
import { MoneyText } from '@/features/home/components/money-text';
import { SectionHeader } from '@/features/home/components/section-header';
import { TransactionListItem } from '@/features/home/components/transaction-list-item';
import { useHomeDashboard } from '@/features/home/use-home-dashboard';
import { formatCop } from '@/features/accounts/account-format';
import { signedTransactionAmount, transactionAccountLabel, transactionIcon, transactionTitle, transactionTypeLabel } from '@/features/transactions/transaction-presentation';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function HomeScreen() {
  const theme = useAppTheme();
  const dashboard = useHomeDashboard();
  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${dashboard.month}-01T00:00:00Z`));

  return (
    <ScreenContainer contentStyle={styles.content}>
      <PrimaryScreenHeader />

      <View accessibilityLabel={`Selected month, ${monthLabel}`} style={[styles.monthSelector, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
          size={20}
          tintColor={theme.secondaryText}
        />
        <Text style={[styles.month, { color: theme.primaryText }]}>{monthLabel}</Text>
        <SymbolView
          name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
          size={20}
          tintColor={theme.secondaryText}
        />
      </View>

      <View style={styles.balanceBlock}>
        <Text style={[styles.eyebrow, { color: theme.secondaryText }]}>Total balance</Text>
        <View style={styles.balanceRow}>
          <MoneyText style={styles.totalBalance}>{formatCop(dashboard.totalBalance)}</MoneyText>
          <Text style={[styles.currency, { color: theme.mutedText }]}>COP</Text>
        </View>
      </View>

      <FinancialSummaryCard
        expenses={`-${formatCop(dashboard.summary.expenses)}`}
        income={`+${formatCop(dashboard.summary.income)}`}
        netBalance={`${dashboard.summary.net < 0 ? '-' : '+'}${formatCop(Math.abs(dashboard.summary.net))}`}
      />

      <BudgetProgressCard summary={dashboard.budget} />

      <SectionHeader
        action={
          <Link href="/transactions" asChild>
            <Pressable
              accessibilityLabel="View all transactions"
              style={StyleSheet.flatten([
                styles.viewAll,
                { backgroundColor: theme.elevatedSurface },
              ])}>
              <Text style={[styles.viewAllText, { color: theme.primaryAction }]}>View All</Text>
            </Pressable>
          </Link>
        }
        title="Recent transactions"
      />

      <View style={[styles.transactions, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {dashboard.recent.map((transaction, index) => (
          <TransactionListItem
            key={transaction.id}
            amount={signedTransactionAmount(transaction)}
            icon={transactionIcon(transaction)}
            showDivider={index < dashboard.recent.length - 1}
            subtitle={`${transaction.transactionDate} · ${transactionTypeLabel(transaction)}${transaction.type === 'transfer' ? ` · ${transactionAccountLabel(transaction)}` : ''}`}
            title={transactionTitle(transaction)}
            tone={transaction.type}
          />
        ))}
        {!dashboard.loading && !dashboard.error && dashboard.recent.length === 0 ? <Text style={[styles.empty, { color: theme.secondaryText }]}>No recent transactions.</Text> : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  monthSelector: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  month: {
    ...typography.sectionTitle,
  },
  balanceBlock: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  eyebrow: {
    ...typography.body,
    fontWeight: '600',
  },
  balanceRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  totalBalance: {
    ...typography.display,
    flexShrink: 1,
  },
  currency: {
    ...typography.body,
    marginLeft: spacing.xs,
  },
  viewAll: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  viewAllText: {
    ...typography.label,
  },
  transactions: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    paddingHorizontal: spacing.md,
  },
  empty: { ...typography.caption, padding: spacing.lg, textAlign: 'center' },
});
