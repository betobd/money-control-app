import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import { calendarDaysBetween } from '@/features/credit-cards/credit-card-cycle.service';
import { bogotaToday, formatTransactionDate } from '@/features/transactions/transaction-date';
import type { TransactionListItem } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { CreditCardStatementView, CreditCardUtilizationStatus } from '../credit-card.types';
import { useCreditCard } from '../use-credit-card';

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
        <Action label="Retry" onPress={() => void reload()} primary />
      </View>
    );
  }

  const { account, utilization, latestStatement, cycle } = details;
  const utilizationPercent = utilization.utilizationBasisPoints === null
    ? '—'
    : `${(utilization.utilizationBasisPoints / 100).toFixed(utilization.utilizationBasisPoints % 100 === 0 ? 0 : 1)}%`;
  const dueDays = latestStatement ? calendarDaysBetween(today, latestStatement.dueDate) : null;
  const closingDays = cycle ? calendarDaysBetween(today, cycle.nextClosingDate) : null;
  const statementActionLabel = latestStatement ? 'Update statement' : 'Add latest statement';

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable accessibilityLabel="Back from credit card" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, { color: theme.primaryText }]}>{account.name}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {!details.setupComplete ? (
          <View style={[styles.notice, { backgroundColor: theme.elevatedSurface, borderColor: theme.warning }]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Complete card setup</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>Add a positive credit limit, closing day, and payment due day to calculate cycles and reminders.</Text>
            <Action label="Complete setup" onPress={() => router.push({ pathname: '/account-form', params: { id: account.id } })} primary />
          </View>
        ) : null}

        <Section title="Current card position">
          <View style={[styles.hero, { backgroundColor: theme.elevatedSurface, borderColor: theme.border }]}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Current debt</Text>
            <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.amount, { color: utilization.currentDebt > 0 ? theme.expense : theme.primaryText }]}>{formatCop(utilization.currentDebt)}</Text>
            <Text style={[styles.caption, { color: theme.mutedText }]}>The total amount currently owed based on transactions recorded in Money Control.</Text>
            <View style={styles.metricRow}>
              <Metric label="Credit limit" value={account.creditLimit === null ? 'Unavailable' : formatCop(account.creditLimit)} />
              <Metric label="Available credit" value={utilization.availableCredit === null ? 'Unavailable' : formatCop(utilization.availableCredit)} />
            </View>
            <View accessibilityLabel={`Utilization ${utilizationPercent}, ${utilizationLabels[utilization.status]}`} style={styles.progressSection}>
              <View style={styles.metricRow}>
                <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>Utilization {utilizationPercent}</Text>
                <Text style={[styles.bodyStrong, { color: utilization.status === 'over-limit' ? theme.destructive : theme.secondaryText }]}>{utilizationLabels[utilization.status]}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.disabledSurface }]}>
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
          </View>
        </Section>

        <Section title="Latest statement">
          {latestStatement ? (
            <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.metricRow}>
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{statementLabels[latestStatement.status]}</Text>
                <Text style={[styles.caption, { color: latestStatement.status === 'overdue' ? theme.destructive : theme.secondaryText }]}>{dueText(dueDays)}</Text>
              </View>
              <MetricRow label="Statement balance" value={formatCop(latestStatement.statementBalance)} />
              <Text style={[styles.caption, { color: theme.mutedText }]}>The amount billed on the latest statement from your bank.</Text>
              <MetricRow label="Minimum payment" value={formatCop(latestStatement.minimumPayment)} />
              <MetricRow label="Minimum remaining" value={formatCop(latestStatement.minimumRemaining)} />
              <Text style={[styles.caption, { color: theme.mutedText }]}>The minimum shown by your bank. Money Control does not calculate it.</Text>
              <MetricRow label="Remaining statement" value={formatCop(latestStatement.remainingStatement)} />
              <MetricRow label="Amount paid" value={formatCop(latestStatement.amountPaid)} />
              <MetricRow label="Closing date" value={formatTransactionDate(latestStatement.closingDate)} />
              <MetricRow label="Due date" value={formatTransactionDate(latestStatement.dueDate)} />
              {latestStatement.amountPaidAfterDueDate > 0 ? <Text style={[styles.caption, { color: theme.warning }]}>Includes {formatCop(latestStatement.amountPaidAfterDueDate)} paid after the due date.</Text> : null}
              <Text style={[styles.caption, { color: theme.mutedText }]}>Statement payment attribution is estimated from card payments recorded after the statement closing date. The bank remains the authoritative source.</Text>
            </View>
          ) : (
            <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>No bank statement has been recorded yet.</Text>
              <Text style={[styles.body, { color: theme.secondaryText }]}>Current debt comes from Money Control transactions and is not treated as statement balance.</Text>
              {!account.isArchived ? <Action label="Add latest statement" onPress={() => router.push({ pathname: '/update-credit-card-statement', params: { id: account.id } })} primary /> : null}
            </View>
          )}
        </Section>

        {!account.isArchived ? (
          <Section title="Actions">
            <View style={styles.actions}>
              <Action label="Pay credit card" onPress={() => router.push({ pathname: '/pay-credit-card', params: { id: account.id } })} primary />
              <Action label={statementActionLabel} onPress={() => router.push({ pathname: '/update-credit-card-statement', params: { id: account.id } })} />
              <Action label="Edit card" onPress={() => router.push({ pathname: '/account-form', params: { id: account.id } })} />
            </View>
          </Section>
        ) : null}

        {details.statements.length > 0 ? (
          <Section title="Statement history">
            {details.statements.map((statement) => (
              <View key={statement.id} style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <View style={styles.metricRow}>
                  <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{formatTransactionDate(statement.periodStart)} – {formatTransactionDate(statement.periodEnd)}</Text>
                  <Text style={[styles.caption, { color: statement.status === 'overdue' ? theme.destructive : theme.secondaryText }]}>{statementLabels[statement.status]}{statement.status === 'paid' && !statement.paidOnTime ? ' · late' : ''}</Text>
                </View>
                <MetricRow label="Statement balance" value={formatCop(statement.statementBalance)} />
                <MetricRow label="Minimum payment" value={formatCop(statement.minimumPayment)} />
                <MetricRow label="Amount paid" value={formatCop(statement.amountPaid)} />
                <MetricRow label="Remaining statement" value={formatCop(statement.remainingStatement)} />
                <MetricRow label="Due date" value={formatTransactionDate(statement.dueDate)} />
              </View>
            ))}
          </Section>
        ) : null}

        <TransactionSection title="Recent card purchases" items={details.recentPurchases} empty="No recent card purchases." />
        <TransactionSection title="Recent card payments" items={details.recentPayments} empty="No recent card payments." />
      </ScrollView>
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = useAppTheme();
  return <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>{children}</View>;
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return <View style={styles.metric}><Text style={[styles.caption, { color: theme.secondaryText }]}>{label}</Text><Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{value}</Text></View>;
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return <View style={styles.metricRow}><Text style={[styles.body, { color: theme.secondaryText }]}>{label}</Text><Text style={[styles.bodyStrong, styles.metricValue, { color: theme.primaryText }]}>{value}</Text></View>;
}

function Action({ label, onPress, primary = false }: { label: string; onPress: () => void; primary?: boolean }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="button" onPress={onPress} style={[styles.action, { backgroundColor: primary ? theme.primaryAction : theme.surface, borderColor: primary ? theme.primaryAction : theme.border }]}><Text style={[styles.bodyStrong, { color: primary ? theme.onPrimaryAction : theme.primaryText }]}>{label}</Text></Pressable>;
}

function TransactionSection({ title, items, empty }: { title: string; items: TransactionListItem[]; empty: string }) {
  const theme = useAppTheme();
  return (
    <Section title={title}>
      {items.length
        ? items.map((item) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })} style={[styles.compactCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.metricRow}>
                <Text numberOfLines={1} style={[styles.bodyStrong, { color: theme.primaryText }]}>{item.type === 'transfer' ? item.accountName : item.categoryName ?? 'Expense'}</Text>
                <Text style={[styles.bodyStrong, { color: item.type === 'transfer' ? theme.income : theme.expense }]}>{formatCop(item.amount)}</Text>
              </View>
              <Text style={[styles.caption, { color: theme.secondaryText }]}>{formatTransactionDate(item.transactionDate)}</Text>
            </Pressable>
          ))
        : <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.body, { color: theme.secondaryText }]}>{empty}</Text></View>}
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
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md },
  hero: { borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.lg },
  label: { ...typography.label, textTransform: 'uppercase' },
  amount: { ...typography.display, fontVariant: ['tabular-nums'] },
  metricRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  metricValue: { flexShrink: 1, textAlign: 'right' },
  metric: { flex: 1, gap: spacing.xs },
  progressSection: { gap: spacing.sm },
  progressTrack: { borderRadius: borderRadii.full, height: 10, overflow: 'hidden' },
  progressFill: { borderRadius: borderRadii.full, height: '100%' },
  cycleRow: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flex: 1, justifyContent: 'center', minHeight: 52, minWidth: 145, paddingHorizontal: spacing.md },
  notice: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.sectionTitle },
  card: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md },
  compactCard: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.xs, padding: spacing.md },
  empty: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.md },
  cardTitle: { ...typography.body, fontWeight: '700' },
  body: { ...typography.body },
  bodyStrong: { ...typography.body, fontWeight: '700' },
  caption: { ...typography.caption },
});
