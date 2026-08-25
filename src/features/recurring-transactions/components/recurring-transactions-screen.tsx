import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DialogHost, useDialog } from '@/components/dialog';
import { spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { formatMoneyWithSymbol } from '@/features/currency/currency';
import { categoryPathLabel } from '@/features/transactions/transaction-presentation';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { TransactionValidationError } from '@/features/transactions/transaction.service';
import { useAppTheme } from '@/hooks/use-app-theme';
import { recurringTransactionService } from '../recurring-transactions';
import { useRecurringTransactions } from '../use-recurring-transactions';
import type {
  RecurringOccurrenceListItem,
  RecurringRuleListItem,
} from '../recurring-transaction.types';

export function RecurringTransactionsScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { error, hasLoaded, history, limited, loading, pending, reload: load, rules } = useRecurringTransactions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const busy = busyId !== null;
  const activeRules = rules.filter((rule) => rule.isActive && !rule.endedAt);
  const pausedRules = rules.filter((rule) => !rule.isActive && !rule.endedAt);
  const endedRules = rules.filter((rule) => Boolean(rule.endedAt));

  async function confirm(occurrence: RecurringOccurrenceListItem) {
    if (busy) return;
    setBusyId(occurrence.id);
    try {
      await recurringTransactionService.confirmOccurrence(occurrence.id);
      await load();
    } catch (cause) {
      const validationMessage = cause instanceof TransactionValidationError
        ? Object.values(cause.fields).filter(Boolean).join('\n')
        : undefined;
      dialog.notice({
        title: 'Unable to confirm',
        message: validationMessage || toUserMessage(cause, 'Review the occurrence and try again.'),
      });
    } finally {
      setBusyId(null);
    }
  }

  function skip(occurrence: RecurringOccurrenceListItem) {
    if (busy) return;
    dialog.confirm({
      title: 'Skip this occurrence?',
      message: 'It will remain in recurring history and will not affect balances or reports.',
      confirmLabel: 'Skip',
      tone: 'destructive',
      onConfirm: () => {
        if (busy) return;
        setBusyId(occurrence.id);
        void recurringTransactionService.skipOccurrence(occurrence.id)
          .then(load)
          .catch((cause) => dialog.notice({ title: 'Unable to skip', message: toUserMessage(cause, 'Try again.') }))
          .finally(() => setBusyId(null));
      },
    });
  }

  async function toggleRule(rule: RecurringRuleListItem) {
    if (busy) return;
    setBusyId(rule.id);
    try {
      if (rule.isActive) await recurringTransactionService.pauseRule(rule.id);
      else await recurringTransactionService.resumeRule(rule.id);
      await load();
    } catch (cause) {
      dialog.notice({ title: 'Unable to update rule', message: toUserMessage(cause, 'Try again.') });
    } finally {
      setBusyId(null);
    }
  }

  function endRule(rule: RecurringRuleListItem) {
    if (busy) return;
    dialog.confirm({
      title: 'End recurring transaction?',
      message: 'No future occurrences will be generated. Existing history and pending items are preserved.',
      confirmLabel: 'End',
      tone: 'destructive',
      onConfirm: () => {
        if (busy) return;
        setBusyId(rule.id);
        void recurringTransactionService.endRule(rule.id)
              .then(load)
          .catch((cause) => dialog.notice({ title: 'Unable to end rule', message: toUserMessage(cause, 'Try again.') }))
          .finally(() => setBusyId(null));
      },
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close recurring transactions"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          Recurring
        </Text>
        <Pressable
          accessibilityLabel="Create recurring transaction"
          accessibilityRole="button"
          onPress={() => router.push('/recurring-form')}
          style={styles.headerButton}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={25} tintColor={theme.primaryAction} />
        </Pressable>
      </View>

      {loading && !hasLoaded ? (
        <View style={styles.center}><ActivityIndicator color={theme.primaryAction} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
          {loading ? (
            <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.secondaryText }]}>Updating…</Text>
          ) : null}
          {error ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{error}</Text>
          ) : null}
          {limited ? (
            <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.warning }]}>
              A large backlog was limited for this load. Reopen this screen to continue safely.
            </Text>
          ) : null}

          <SectionHeading count={pending.length} title="Due for review" />
          {pending.length === 0 ? (
            <EmptyCard text="No recurring transactions are due today." />
          ) : pending.map((occurrence) => (
            <OccurrenceCard
              key={occurrence.id}
              busy={busy}
              confirming={busyId === occurrence.id}
              occurrence={occurrence}
              onConfirm={() => void confirm(occurrence)}
              onEdit={() => router.push({ pathname: '/recurring-occurrence', params: { id: occurrence.id } })}
              onSkip={() => skip(occurrence)}
            />
          ))}

          <SectionHeading count={activeRules.length} title="Upcoming" />
          {activeRules.length === 0 ? (
            <EmptyCard text="No active recurring schedules." />
          ) : activeRules.slice(0, 5).map((rule) => (
            <Card
              accessible
              accessibilityLabel={`Upcoming ${rule.type}, ${formatMoneyWithSymbol(rule.amount, rule.currency)}, ${formatTransactionDate(rule.nextOccurrenceDate)}, ${ruleDetail(rule)}`}
              key={`upcoming-${rule.id}`}
              style={styles.historyRow}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>{occurrenceLabel(rule)}</Text>
                <Text numberOfLines={1} style={[styles.meta, { color: theme.secondaryText }]}>{ruleDetail(rule)}</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.amount, { color: typeColor(rule.type, theme) }]}>{formatMoneyWithSymbol(rule.amount, rule.currency)}</Text>
                <Text style={[styles.meta, { color: theme.secondaryText }]}>{formatTransactionDate(rule.nextOccurrenceDate)}</Text>
              </View>
            </Card>
          ))}

          <View style={styles.sectionTop}>
            <SectionHeading count={activeRules.length} title="Active rules" />
            <Pressable accessibilityRole="button" onPress={() => router.push('/recurring-form')} style={styles.textButton}>
              <Text style={[styles.textButtonLabel, { color: theme.primaryAction }]}>Create</Text>
            </Pressable>
          </View>
          {activeRules.length === 0 ? (
            <EmptyCard text="Create a rule for expenses, income, or transfers you expect regularly." />
          ) : activeRules.map((rule) => (
            <RuleCard
              key={rule.id}
              busy={busy}
              onEdit={() => router.push({ pathname: '/recurring-form', params: { id: rule.id } })}
              onEnd={() => endRule(rule)}
              onToggle={() => void toggleRule(rule)}
              rule={rule}
            />
          ))}

          {pausedRules.length ? (
            <>
              <SectionHeading count={pausedRules.length} title="Paused rules" />
              {pausedRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  busy={busy}
                  onEdit={() => router.push({ pathname: '/recurring-form', params: { id: rule.id } })}
                  onEnd={() => endRule(rule)}
                  onToggle={() => void toggleRule(rule)}
                  rule={rule}
                />
              ))}
            </>
          ) : null}

          {endedRules.length ? (
            <>
              <SectionHeading count={endedRules.length} title="Ended rules" />
              {endedRules.map((rule) => (
                <RuleCard
                  key={rule.id}
                  onEdit={() => undefined}
                  onEnd={() => undefined}
                  onToggle={() => undefined}
                  rule={rule}
                />
              ))}
            </>
          ) : null}

          <SectionHeading count={history.length} title="Recent history" />
          {history.length === 0 ? (
            <EmptyCard text="Confirmed and skipped occurrences will appear here." />
          ) : history.map((occurrence) => (
            <Card
              accessible
              accessibilityLabel={`${occurrence.status}, ${occurrenceLabel(occurrence)}, ${formatMoneyWithSymbol(occurrence.amount, occurrence.currency)}, ${formatTransactionDate(occurrence.scheduledDate)}`}
              key={occurrence.id}
              style={styles.historyRow}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>
                  {occurrenceLabel(occurrence)}
                </Text>
                <Text style={[styles.meta, { color: theme.secondaryText }]}>
                  {formatTransactionDate(occurrence.scheduledDate)}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.amount, { color: theme.primaryText }]}>{formatMoneyWithSymbol(occurrence.amount, occurrence.currency)}</Text>
                <Text style={[styles.status, { color: occurrence.status === 'posted' ? theme.income : theme.mutedText }]}>
                  {occurrence.status === 'posted' ? 'Posted' : 'Skipped'}
                </Text>
              </View>
            </Card>
          ))}
        </ScrollView>
      )}
      <DialogHost dialog={dialog} />
    </View>
  );
}

function SectionHeading({ count, title }: { count: number; title: string }) {
  const theme = useAppTheme();
  return <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{title} · {count}</Text>;
}

function EmptyCard({ text }: { text: string }) {
  const theme = useAppTheme();
  return (
    <Card>
      <Text style={[styles.meta, { color: theme.secondaryText }]}>{text}</Text>
    </Card>
  );
}

function OccurrenceCard({
  occurrence,
  busy,
  confirming,
  onConfirm,
  onEdit,
  onSkip,
}: {
  occurrence: RecurringOccurrenceListItem;
  busy: boolean;
  confirming: boolean;
  onConfirm: () => void;
  onEdit: () => void;
  onSkip: () => void;
}) {
  const theme = useAppTheme();
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>{occurrenceLabel(occurrence)}</Text>
          <Text style={[styles.meta, { color: theme.secondaryText }]}>
            Due {formatTransactionDate(occurrence.scheduledDate)}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: theme.secondaryText }]}>
            {ruleDetail(occurrence)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: typeColor(occurrence.type, theme) }]}>{formatMoneyWithSymbol(occurrence.amount, occurrence.currency)}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          accessibilityLabel={`Confirm ${occurrenceLabel(occurrence)}`}
          busy={confirming}
          disabled={busy}
          label="Confirm"
          onPress={onConfirm}
          size="sm"
          variant="primary"
        />
        <Button
          accessibilityLabel={`Edit ${occurrenceLabel(occurrence)} occurrence`}
          disabled={busy}
          label="Edit"
          onPress={onEdit}
          size="sm"
        />
        <Button
          accessibilityLabel={`Skip ${occurrenceLabel(occurrence)} occurrence`}
          disabled={busy}
          label="Skip"
          onPress={onSkip}
          size="sm"
          variant="destructive"
        />
      </View>
    </Card>
  );
}

function RuleCard({
  rule,
  busy = false,
  onEdit,
  onToggle,
  onEnd,
}: {
  rule: RecurringRuleListItem;
  busy?: boolean;
  onEdit: () => void;
  onToggle: () => void;
  onEnd: () => void;
}) {
  const theme = useAppTheme();
  const ended = Boolean(rule.endedAt);
  const status = ended ? 'Ended' : rule.isActive ? 'Active' : 'Paused';
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>{occurrenceLabel(rule)}</Text>
          <Text style={[styles.meta, { color: theme.secondaryText }]}>
            {frequencyLabel(rule.frequency, rule.interval)} · Next {formatTransactionDate(rule.nextOccurrenceDate)}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: theme.secondaryText }]}>
            {ruleDetail(rule)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: typeColor(rule.type, theme) }]}>{formatMoneyWithSymbol(rule.amount, rule.currency)}</Text>
          <Text accessibilityLabel={`Rule status ${status}`} style={[styles.status, { color: ended ? theme.mutedText : rule.isActive ? theme.income : theme.warning }]}>{status}</Text>
        </View>
      </View>
      {!ended ? (
        <View style={styles.actions}>
          <Button disabled={busy} label="Edit future" onPress={onEdit} size="sm" />
          <Button disabled={busy} label={rule.isActive ? 'Pause' : 'Resume'} onPress={onToggle} size="sm" />
          <Button disabled={busy} label="End" onPress={onEnd} size="sm" variant="destructive" />
        </View>
      ) : null}
    </Card>
  );
}

function occurrenceLabel(value: Pick<RecurringOccurrenceListItem, 'type' | 'note' | 'categoryName' | 'subcategoryName' | 'accountName' | 'destinationAccountName'>) {
  if (value.note) return value.note;
  if (value.type === 'transfer') return `${value.accountName} → ${value.destinationAccountName ?? 'Account'}`;
  return categoryPathLabel(value.categoryName, value.subcategoryName) ?? value.accountName;
}

function ruleDetail(value: Pick<RecurringOccurrenceListItem, 'type' | 'categoryName' | 'subcategoryName' | 'accountName' | 'destinationAccountName'>) {
  if (value.type === 'transfer') return `${value.accountName} → ${value.destinationAccountName ?? 'Account'}`;
  return `${value.accountName} · ${categoryPathLabel(value.categoryName, value.subcategoryName) ?? 'Category'}`;
}

function frequencyLabel(frequency: RecurringRuleListItem['frequency'], interval: number) {
  if (frequency === 'weekly' && interval === 2) return 'Every two weeks';
  if (interval === 1) return frequency[0].toUpperCase() + frequency.slice(1);
  return `Every ${interval} ${frequency}`;
}

function typeColor(type: RecurringRuleListItem['type'], theme: ReturnType<typeof useAppTheme>) {
  if (type === 'income') return theme.income;
  if (type === 'transfer') return theme.transfer;
  return theme.expense;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, fontSize: 22, textAlign: 'center' },
  content: { gap: spacing.md, padding: spacing.md },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.sm },
  sectionTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  textButton: { alignItems: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  textButtonLabel: { ...typography.caption, fontWeight: '700' },
  card: { gap: spacing.md },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  cardTitle: { ...typography.body, fontWeight: '700' },
  meta: { ...typography.caption },
  amount: { ...typography.moneyRow },
  status: { ...typography.label, fontWeight: '700', textTransform: 'uppercase' },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 68 },
  error: { ...typography.caption },
  notice: { ...typography.caption },
  flex: { flex: 1, minWidth: 0 },
});
