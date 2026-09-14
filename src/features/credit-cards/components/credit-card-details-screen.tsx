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
import { useMessages } from '@/i18n/use-messages';
import type { Messages } from '@/i18n/messages';
import type { CreditCardStatementView, CreditCardUtilizationStatus } from '../credit-card.types';
import { useCreditCard } from '../use-credit-card';
import { ScreenHeader } from '@/components/screen-header';

function utilizationLabel(t: Messages, status: CreditCardUtilizationStatus | 'unavailable'): string {
  const labels: Record<CreditCardUtilizationStatus | 'unavailable', string> = {
    low: t.creditCards.utilization.low,
    moderate: t.creditCards.utilization.moderate,
    high: t.creditCards.utilization.high,
    'very-high': t.creditCards.utilization.veryHigh,
    'over-limit': t.creditCards.utilization.overLimit,
    unavailable: t.creditCards.unavailable,
  };
  return labels[status];
}

function statementLabel(t: Messages, status: CreditCardStatementView['status']): string {
  const labels: Record<CreditCardStatementView['status'], string> = {
    upcoming: t.creditCards.statementStatus.upcoming,
    'balance-due': t.creditCards.statementStatus.balanceDue,
    'partially-paid': t.creditCards.statementStatus.partiallyPaid,
    'minimum-covered': t.creditCards.statementStatus.minimumCovered,
    paid: t.creditCards.statementStatus.paid,
    overdue: t.creditCards.statementStatus.overdue,
    'no-balance-due': t.creditCards.statementStatus.noBalanceDue,
  };
  return labels[status];
}

export function CreditCardDetailsScreen({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const { details, loading, error, reload } = useCreditCard(accountId);
  const today = bogotaToday();

  if (loading && details === undefined) {
    return <View accessibilityLabel={t.creditCards.details.loading} style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} size="large" /></View>;
  }
  if (error || !details) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground, padding: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.creditCards.errors.loadCardTitle}</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>{error ?? t.creditCards.errors.notACard}</Text>
        <Button label={t.common.retry} onPress={() => void reload()} variant="primary" />
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
  const statementActionLabel = latestStatement ? t.creditCards.details.updateStatement : t.creditCards.details.addLatestStatement;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" leadingAccessibilityLabel={t.creditCards.details.back} title={account.name} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {!details.setupComplete ? (
          <View style={[styles.notice, { backgroundColor: theme.tintWarning }]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{t.creditCards.details.setupTitle}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{t.creditCards.details.setupBody}</Text>
            <Button label={t.creditCards.details.setupAction} onPress={() => router.push({ pathname: '/account-form', params: { id: account.id } })} variant="primary" />
          </View>
        ) : null}

        <Section title={t.creditCards.details.currentPosition}>
          <Card variant="hero" padding={spacing.lg} style={styles.hero}>
            <Overline color={theme.secondaryText}>{t.creditCards.details.currentDebt}</Overline>
            <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.amount, { color: utilization.currentDebt > 0 ? theme.expense : theme.primaryText }]}>{money(utilization.currentDebt)}</Text>
            <Text style={[styles.caption, { color: theme.mutedText }]}>{t.creditCards.details.currentDebtHelp}</Text>
            <View style={styles.metricRow}>
              <Metric label={t.creditCards.details.creditLimit} value={account.creditLimit === null ? t.creditCards.unavailable : money(account.creditLimit)} />
              <Metric label={t.creditCards.details.availableCredit} value={utilization.availableCredit === null ? t.creditCards.unavailable : money(utilization.availableCredit)} />
            </View>
            <View accessibilityLabel={t.creditCards.details.utilizationAccessibility(utilizationPercent, utilizationLabel(t, utilization.status))} style={styles.progressSection}>
              <View style={styles.metricRow}>
                <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{t.creditCards.details.utilization(utilizationPercent)}</Text>
                <Text style={[styles.bodyStrong, { color: utilization.status === 'over-limit' ? theme.destructive : theme.secondaryText }]}>{utilizationLabel(t, utilization.status)}</Text>
              </View>
              <View style={[styles.progressTrack, { backgroundColor: theme.progressTrack }]}>
                <View style={[styles.progressFill, { backgroundColor: utilization.status === 'over-limit' ? theme.destructive : theme.primaryAction, width: utilization.visualProgressWidth }]} />
              </View>
              <Text style={[styles.caption, { color: theme.mutedText }]}>{t.creditCards.details.utilizationHelp}</Text>
            </View>
            {cycle ? (
              <View style={styles.cycleRow}>
                <MetricRow label={t.creditCards.details.nextClosingDate} value={formatTransactionDate(cycle.nextClosingDate)} />
                <Text style={[styles.caption, { color: theme.mutedText }]}>{closingText(t, closingDays)}</Text>
              </View>
            ) : null}
          </Card>
        </Section>

        <Section title={t.creditCards.details.latestStatement}>
          {latestStatement ? (
            <View style={[styles.card, { backgroundColor: theme.surface }]}>
              <View style={styles.metricRow}>
                <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{statementLabel(t, latestStatement.status)}</Text>
                <Text style={[styles.caption, { color: latestStatement.status === 'overdue' ? theme.destructive : theme.secondaryText }]}>{dueText(t, dueDays)}</Text>
              </View>
              <MetricRow label={t.creditCards.details.statementBalance} value={money(latestStatement.statementBalance)} />
              <Text style={[styles.caption, { color: theme.mutedText }]}>{t.creditCards.details.statementBalanceHelp}</Text>
              <MetricRow label={t.creditCards.details.minimumPayment} value={money(latestStatement.minimumPayment)} />
              <MetricRow label={t.creditCards.details.minimumRemaining} value={money(latestStatement.minimumRemaining)} />
              <Text style={[styles.caption, { color: theme.mutedText }]}>{t.creditCards.details.minimumHelp}</Text>
              <MetricRow label={t.creditCards.details.remainingStatement} value={money(latestStatement.remainingStatement)} />
              <MetricRow label={t.creditCards.details.amountPaid} value={money(latestStatement.amountPaid)} />
              <MetricRow label={t.creditCards.details.closingDate} value={formatTransactionDate(latestStatement.closingDate)} />
              <MetricRow label={t.creditCards.details.dueDate} value={formatTransactionDate(latestStatement.dueDate)} />
              {latestStatement.amountPaidAfterDueDate > 0 ? <Text style={[styles.caption, { color: theme.warning }]}>{t.creditCards.details.paidAfterDue(money(latestStatement.amountPaidAfterDueDate))}</Text> : null}
              <Text style={[styles.caption, { color: theme.mutedText }]}>{t.creditCards.details.attributionHelp}</Text>
            </View>
          ) : (
            <View style={[styles.empty, { backgroundColor: theme.surface }]}>
              <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{t.creditCards.details.noStatementTitle}</Text>
              <Text style={[styles.body, { color: theme.secondaryText }]}>{t.creditCards.details.noStatementBody}</Text>
              {!account.isArchived ? <Button fullWidth icon={statementIcon} label={t.creditCards.details.addLatestStatement} onPress={() => router.push({ pathname: '/update-credit-card-statement', params: { id: account.id } })} size="lg" variant="primary" /> : null}
            </View>
          )}
        </Section>

        {!account.isArchived ? (
          <Section title={t.creditCards.details.actions}>
            <ActionTileRow
              actions={[
                { label: t.creditCards.details.payCard, accessibilityLabel: t.creditCards.details.payCardAccessibility, icon: { ios: 'dollarsign.circle.fill', android: 'payments', web: 'payments' }, onPress: () => router.push({ pathname: '/pay-credit-card', params: { id: account.id } }), tone: 'primary' },
                { label: t.creditCards.details.statement, accessibilityLabel: statementActionLabel, icon: statementIcon, onPress: () => router.push({ pathname: '/update-credit-card-statement', params: { id: account.id } }) },
                { label: t.creditCards.details.editCard, icon: { ios: 'pencil', android: 'edit', web: 'edit' }, onPress: () => router.push({ pathname: '/account-form', params: { id: account.id } }) },
              ]}
            />
          </Section>
        ) : null}

        {details.statements.length > 0 ? (
          <Section title={t.creditCards.details.statementHistory}>
            {details.statements.map((statement) => (
              <View key={statement.id} style={[styles.compactCard, { backgroundColor: theme.surface }]}>
                <View style={styles.metricRow}>
                  <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{formatTransactionDate(statement.periodStart)} – {formatTransactionDate(statement.periodEnd)}</Text>
                  <Text style={[styles.caption, { color: statement.status === 'overdue' ? theme.destructive : theme.secondaryText }]}>{statementLabel(t, statement.status)}{statement.status === 'paid' && !statement.paidOnTime ? t.creditCards.details.late : ''}</Text>
                </View>
                <MetricRow label={t.creditCards.details.statementBalance} value={money(statement.statementBalance)} />
                <MetricRow label={t.creditCards.details.minimumPayment} value={money(statement.minimumPayment)} />
                <MetricRow label={t.creditCards.details.amountPaid} value={money(statement.amountPaid)} />
                <MetricRow label={t.creditCards.details.remainingStatement} value={money(statement.remainingStatement)} />
                <MetricRow label={t.creditCards.details.dueDate} value={formatTransactionDate(statement.dueDate)} />
              </View>
            ))}
          </Section>
        ) : null}

        <TransactionSection title={t.creditCards.details.recentPurchases} items={details.recentPurchases} empty={t.creditCards.details.noRecentPurchases} />
        <TransactionSection title={t.creditCards.details.recentRefunds} items={details.recentRefunds} empty={t.creditCards.details.noRecentRefunds} />
        <TransactionSection title={t.creditCards.details.recentPayments} items={details.recentPayments} empty={t.creditCards.details.noRecentPayments} />
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
  const t = useMessages();
  return (
    <Section title={title}>
      {items.length
        ? items.map((item) => (
            <Pressable accessibilityRole="button" key={item.id} onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: item.id } })} style={[styles.compactCard, { backgroundColor: theme.surface }]}>
              <View style={styles.metricRow}>
                <Text numberOfLines={1} style={[styles.bodyStrong, { color: theme.primaryText }]}>
                  {item.type === 'transfer' ? item.accountName : item.type === 'refund' ? t.creditCards.details.refund : item.categoryName ?? t.creditCards.details.expense}
                </Text>
                <Text style={[styles.bodyStrong, styles.moneyText, { color: item.type === 'transfer' ? theme.income : item.type === 'refund' ? theme.primaryAction : theme.expense }]}>
                  {item.type === 'expense' ? '−' : '+'}{formatMoneyWithSymbol(item.amount, item.currency)}
                </Text>
              </View>
              <Text style={[styles.caption, { color: theme.secondaryText }]}>
                {formatTransactionDate(item.transactionDate)} · {item.type === 'transfer' ? t.creditCards.details.payment : item.type === 'refund' ? t.creditCards.details.merchantRefund : t.creditCards.details.charge}
              </Text>
            </Pressable>
          ))
        : <View style={[styles.empty, { backgroundColor: theme.surface }]}><Text style={[styles.body, { color: theme.secondaryText }]}>{empty}</Text></View>}
    </Section>
  );
}

function dueText(t: Messages, days: number | null): string {
  if (days === null) return '';
  if (days < 0) return t.creditCards.details.overdueDays(Math.abs(days));
  if (days === 0) return t.creditCards.details.dueToday;
  return t.creditCards.details.dueInDays(days);
}

function closingText(t: Messages, days: number | null): string {
  if (days === null) return '';
  if (days === 0) return t.creditCards.details.closesToday;
  return t.creditCards.details.closesInDays(days);
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
