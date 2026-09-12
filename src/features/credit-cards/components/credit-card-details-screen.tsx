import { router } from 'expo-router';
import { type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionTileRow } from '@/components/action-tile';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { formatMoneyWithSymbol } from '@/features/currency/currency';
import { calendarDaysBetween } from '@/features/credit-cards/credit-card-cycle.service';
import { bogotaToday, formatTransactionDate } from '@/features/transactions/transaction-date';
import type { TransactionListItem } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { CreditCardStatementView, CreditCardUtilizationStatus } from '../credit-card.types';
import { useCreditCard } from '../use-credit-card';
import { ScreenHeader } from '@/components/screen-header';

const utilizationLabels: Record<CreditCardUtilizationStatus | 'unavailable', string> = {
  low: 'Low',
  moderate: 'Moderate',
  high: 'High',
  'very-high': 'Very high',
  'over-limit': 'Over limit',
  unavailable: 'Unavailable',
};

const statementLabels: Record<CreditCardStatementView['status'], string> = {
  upcoming: 'Upcoming',
  'balance-due': 'Balance due',
  'partially-paid': 'Partially paid',
  'minimum-covered': 'Minimum payment covered',
  paid: 'Paid',
  overdue: 'Overdue',
  'no-balance-due': 'Zero-balance statement',
};

export function CreditCardDetailsScreen({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { details, loading, error, reload } = useCreditCard(accountId);
  const today = bogotaToday();

  if (loading && details === undefined) {
    return <View accessibilityLabel="Loading credit card" style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} size="large" /></View>;
  }
  if (error || !details) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground, padding: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Unable to load card</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>{error ?? 'This account is not a credit card.'}</Text>
        <Button label="Retry" onPress={() => void reload()} variant="primary" />
      </View>
    );
  }

  const { account, utilization, latestStatement, cycle } = details;
  const cardCurrency = account.currency;
  const money = (value: number) => formatMoneyWithSymbol(value, cardCurrency);
  const utilizationPercent = utilization.utilizationBasisPoints === null
    ? '—'
    : `${(utilization.utilizationBasisPoints / 100).toFixed(utilization.utilizationBasisPoints % 100 === 0 ? 0 : 1)}%`;
  const dueDays = latestStatement ? calendarDaysBetween(today, latestStatement.dueDate) : null;
  const closingDays = cycle ? calendarDaysBetween(today, cycle.nextClosingDate) : null;
  const statementActionLabel = latestStatement ? 'Update statement' : 'Add latest statement';

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" leadingAccessibilityLabel="Back from credit card" title={account.name} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {!details.setupComplete ? (
          <View style={[styles.notice, { backgroundColor: theme.tintWarning }]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Complete card setup</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>Add a positive credit limit, closing day, and payment due day to calculate cycles and reminders.</Text>
            <Button label="Complete setup" onPress={() => router.push({ pathname: '/account-form', params: { id: account.id } })} variant="primary" />
          </View>
        ) : null}

        <Section title="Current card position">
          <Card variant="hero" padding={spacing.lg} style={styles.hero}>
            <Overline color={theme.secondaryText}>Current debt</Overline>
            <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.amount, { color: utilization.currentDebt > 0 ? theme.expense : theme.primaryText }]}>{money(utilization.currentDebt)}</Text>
            <Text style={[styles.caption, { color: theme.mutedText }]}>The total amount currently owed based on transactions recorded in Money Control.</Text>
            <View style={styles.metricRow}>
              <Metric label="Credit limit" value={account.creditLimit === null ? 'Unavailable' : money(account.creditLimit)} />
              <Metric label="Available credit" value={utilization.availableCredit === null ? 'Unavailable' : money(utilization.availableCredit)} />
            </View>
            <View accessibilityLabel={`Credit utilization ${utilizationPercent}, ${utilizationLabels[utilization.status]}`} style={styles.progressSection}>
              <View style={styles.metricRow}>
                <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>Credit utilization {utilizationPercent}</Text>
                <Text style={[styles.bodyStrong, { color: utilization.status === 'over-limit' ? theme.destructive : theme.secondaryText }]}>{utilizationLabels[utilization.status]}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
                <View style={[styles.progressFill, { backgroundColor: utilization.status === 'over-limit' ? theme.destructive : theme.primaryAction, width: utilization.visualProgressWidth }]} />
              </View>
              <Text style={[styles.caption, { color: theme.mutedText }]}>A spending guide, not a universal credit-score rule.</Text>
            </View>
            {cycle ? (
              <View style={styles.cycleRow}>
                <MetricRow label="Next closing date" value={formatTransactionDate(cycle.nextClosingDate)} />
                <Text style={[styles.caption, { color: theme.mutedText }]}>{closingText(closingDays)}</Text>
              </View>
            ) : null}
          </Card>
        </Section>

        <Section title="Latest statement">
          {latestStatement ? (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.metricRow}>
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{statementLabels[latestStatement.status]}</Text>
                <Text style={[styles.caption, { color: latestStatement.status === 'overdue' ? theme.destructive : theme.secondaryText }]}>{dueText(dueDays)}</Text>
              </View>
              <MetricRow label="Statement balance" value={money(latestStatement.statementBalance)} />
              <Text style={[styles.caption, { color: theme.mutedText }]}>The amount billed on the latest statement from your bank.</Text>
              <MetricRow label="Minimum payment" value={money(latestStatement.minimumPayment)} />
              <MetricRow label="Minimum remaining" value={money(latestStatement.minimumRemaining)} />
              <Text style={[styles.caption, { color: theme.mutedText }]}>The minimum shown by your bank. Money Control does not calculate it.</Text>
              <MetricRow label="Remaining statement" value={money(latestStatement.remainingStatement)} />
              <MetricRow label="Amount paid" value={money(latestStatement.amountPaid)} />
              <MetricRow label="Closing date" value={formatTransactionDate(latestStatement.closingDate)} />
              <MetricRow label="Due date" value={formatTransactionDate(latestStatement.dueDate)} />
              {latestStatement.amountPaidAfterDueDate > 0 ? <Text style={[styles.caption, { color: theme.warning }]}>Includes {money(latestStatement.amountPaidAfterDueDate)} paid after the due date.</Text> : null}
              <Text style={[styles.caption, { color: theme.mutedText }]}>Statement payment attribution is estimated from card payments recorded after the statement closing date. The bank remains the authoritative source.</Text>
            </View>
          ) : (
            <View style={[styles.empty, { backgroundColor: theme.surface }]}>
              <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>No bank statement has been recorded yet.</Text>
              <Text style={[styles.body, { color: theme.secondaryText }]}>Current debt comes from Money Control transactions and is not treated as statement balance.</Text>
              {!account.isArchived ? <Button fullWidth icon={statementIcon} label="Add latest statement" onPress={() => router.push({ pathname: '/update-credit-card-statement', params: { id: account.id } })} size="lg" variant="primary" /> : null}
            </View>
          )}
        </Section>

        {!account.isArchived ? (
          <Section title="Actions">
            <ActionTileRow
              actions={[
                { label: 'Pay card', accessibilityLabel: 'Pay credit card', icon: { ios: 'dollarsign.circle.fill', android: 'payments', web: 'payments' }, onPress: () => router.push({ pathname: '/pay-credit-card', params: { id: account.id } }), tone: 'primary' },
                { label: 'Statement', accessibilityLabel: statementActionLabel, icon: statementIcon, onPress: () => router.push({ pathname: '/update-credit-card-statement', params: { id: account.id } }) },
                { label: 'Edit card', icon: { ios: 'pencil', android: 'edit', web: 'edit' }, onPress: () => router.push({ pathname: '/account-form', params: { id: account.id } }) },
              ]}
            />
          </Section>
        ) : null}

        {details.statements.length > 0 ? (
          <Section title="Statement history">
            {details.statements.map((statement) => (
              <View key={statement.id} style={[styles.compactCard, { backgroundColor: theme.surface }]}>
                <View style={styles.metricRow}>
                  <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{formatTransactionDate(statement.periodStart)} – {formatTransactionDate(statement.periodEnd)}</Text>
                  <Text style={[styles.caption, { color: statement.status === 'overdue' ? theme.destructive : theme.secondaryText }]}>{statementLabels[statement.status]}{statement.status === 'paid' && !statement.paidOnTime ? ' · late' : ''}</Text>
                </View>
                <MetricRow label="Statement balance" value={money(statement.statementBalance)} />
                <MetricRow label="Minimum payment" value={money(statement.minimumPayment)} />
                <MetricRow label="Amount paid" value={money(statement.amountPaid)} />
                <MetricRow label="Remaining statement" value={money(statement.remainingStatement)} />
                <MetricRow label="Due date" value={formatTransactionDate(statement.dueDate)} />
              </View>
            ))}
          </Section>
        ) : null}

        <TransactionSection title="Recent card purchases" items={details.recentPurchases} empty="No recent card purchases." />
        <TransactionSection title="Recent merchant refunds" items={details.recentRefunds} empty="No recent merchant refunds." />
        <TransactionSection title="Recent card payments" items={details.recentPayments} empty="No recent card payments." />
      </ScrollView>
    </View>
  );
}

const statementIcon = { ios: 'doc.text.fill', android: 'receipt_long', web: 'receipt_long' } satisfies SymbolViewProps['name'];

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = useAppTheme();
  return <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>{children}</View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return <View style={styles.metric}><Text style={[styles.caption, { color: theme.secondaryText }]}>{label}</Text><Text style={[styles.bodyStrong, styles.moneyText, { color: theme.primaryText }]}>{value}</Text></View>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return <View style={styles.metricRow}><Text style={[styles.body, { color: theme.secondaryText }]}>{label}</Text><Text style={[styles.bodyStrong, styles.metricValue, { color: theme.primaryText }]}>{value}</Text></View>;
}

function TransactionSection({ title, items, empty }: { title: string; items: TransactionListItem[]; empty: string }) {
  const theme = useAppTheme();
  return (
    <Section title={title}>
      {items.length
        ? items.map((item) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })} style={[styles.compactCard, { backgroundColor: theme.surface }]}>
              <View style={styles.metricRow}>
                <Text numberOfLines={1} style={[styles.bodyStrong, { color: theme.primaryText }]}>
                  {item.type === 'transfer' ? item.accountName : item.type === 'refund' ? 'Refund' : item.categoryName ?? 'Expense'}
                </Text>
                <Text style={[styles.bodyStrong, styles.moneyText, { color: item.type === 'transfer' ? theme.income : item.type === 'refund' ? theme.primaryAction : theme.expense }]}>
                  {item.type === 'expense' ? '−' : '+'}{formatMoneyWithSymbol(item.amount, item.currency)}
                </Text>
              </View>
              <Text style={[styles.caption, { color: theme.secondaryText }]}>
                {formatTransactionDate(item.transactionDate)} · {item.type === 'transfer' ? 'Payment' : item.type === 'refund' ? 'Merchant refund' : 'Charge'}
              </Text>
            </Pressable>
          ))
        : <View style={[styles.empty, { backgroundColor: theme.surface }]}><Text style={[styles.body, { color: theme.secondaryText }]}>{empty}</Text></View>}
    </Section>
  );
}

function dueText(days: number | null): string {
  if (days === null) return '';
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
  if (days === 0) return 'Due today';
  return `Due in ${days} day${days === 1 ? '' : 's'}`;
}

function closingText(days: number | null): string {
  if (days === null) return '';
  if (days === 0) return 'Closes today.';
  return `Closes in ${days} day${days === 1 ? '' : 's'}.`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  content: { gap: spacing.lg, padding: spacing.md },
  hero: { gap: spacing.md },
  amount: { ...typography.moneyHero, fontVariant: ['tabular-nums'] },
  metricRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  metricValue: { flexShrink: 1, fontFamily: fonts.mono.bold, textAlign: 'right' },
  moneyText: { fontFamily: fonts.mono.bold },
  metric: { flex: 1, gap: spacing.xs },
  progressSection: { gap: spacing.sm },
  progressTrack: { borderRadius: borderRadii.full, height: 10, overflow: 'hidden' },
  progressFill: { borderRadius: borderRadii.full, height: '100%' },
  cycleRow: { gap: spacing.xs },
  notice: { borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.sectionTitle },
  card: { borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.md },
  compactCard: { borderRadius: borderRadii.card, gap: spacing.xs, padding: spacing.md },
  empty: { borderRadius: borderRadii.card, gap: spacing.md, padding: spacing.md },
  cardTitle: { ...typography.bodyStrong },
  body: { ...typography.body },
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
});
