import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { EmptyState } from '@/components/empty-state';
import { SegmentedControl } from '@/components/segmented-control';
import { DialogHost, useDialog } from '@/components/dialog';
import { spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { formatMoneyWithSymbol } from '@/features/currency/currency';
import { categoryPathLabel } from '@/features/transactions/transaction-presentation';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { TransactionValidationError } from '@/features/transactions/transaction.service';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import { recurringTransactionService } from '../recurring-transactions';
import { useRecurringTransactions } from '../use-recurring-transactions';
import type {
  RecurringOccurrenceListItem,
  RecurringRuleListItem,
} from '../recurring-transaction.types';
import { ScreenHeader } from '@/components/screen-header';

type RecurringTab = 'due' | 'rules' | 'history';

export function RecurringTransactionsScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const { error, hasLoaded, history, limited, loading, pending, reload: load, rules } = useRecurringTransactions();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tab, setTab] = useState<RecurringTab>('due');
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
        title: t.recurring.unableToConfirm,
        message: validationMessage || toUserMessage(cause, t.recurring.confirmFallback),
      });
    } finally {
      setBusyId(null);
    }
  }

  function skip(occurrence: RecurringOccurrenceListItem) {
    if (busy) return;
    dialog.confirm({
      title: t.recurring.skipTitle,
      message: t.recurring.skipMessage,
      confirmLabel: t.recurring.skip,
      tone: 'destructive',
      onConfirm: () => {
        if (busy) return;
        setBusyId(occurrence.id);
        void recurringTransactionService.skipOccurrence(occurrence.id)
          .then(load)
          .catch((cause) => dialog.notice({ title: t.recurring.unableToSkip, message: toUserMessage(cause, t.recurring.tryAgain) }))
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
      dialog.notice({ title: t.recurring.unableToUpdateRule, message: toUserMessage(cause, t.recurring.tryAgain) });
    } finally {
      setBusyId(null);
    }
  }

  function endRule(rule: RecurringRuleListItem) {
    if (busy) return;
    dialog.confirm({
      title: t.recurring.endTitle,
      message: t.recurring.endMessage,
      confirmLabel: t.recurring.end,
      tone: 'destructive',
      onConfirm: () => {
        if (busy) return;
        setBusyId(rule.id);
        void recurringTransactionService.endRule(rule.id)
              .then(load)
          .catch((cause) => dialog.notice({ title: t.recurring.unableToEndRule, message: toUserMessage(cause, t.recurring.tryAgain) }))
          .finally(() => setBusyId(null));
      },
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader
        action={{ kind: 'add', accessibilityLabel: t.recurring.createRecurring, onPress: () => router.push('/recurring-form') }}
        leading="close"
        leadingAccessibilityLabel={t.recurring.closeRecurring}
        title={t.recurring.title}
      />

      {loading && !hasLoaded ? (
        <View style={styles.center}><ActivityIndicator color={theme.primaryAction} /></View>
      ) : (
        <>
          {/* The switch stays outside the ScrollView so moving between sections
              never depends on where the current section happened to be scrolled. */}
          <View style={styles.tabs}>
            <SegmentedControl
              accessibilityLabel={t.recurring.sections}
              onChange={setTab}
              segments={[
                { value: 'due', label: t.recurring.tabDue, badge: pending.length },
                { value: 'rules', label: t.recurring.tabRules, badge: activeRules.length + pausedRules.length },
                { value: 'history', label: t.recurring.tabHistory, badge: history.length },
              ]}
              value={tab}
            />
          </View>

          <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
            {loading ? (
              <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.secondaryText }]}>{t.recurring.updating}</Text>
            ) : null}
            {error ? (
              <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{error}</Text>
            ) : null}
            {limited ? (
              <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.warning }]}>
                {t.recurring.backlogLimited}
              </Text>
            ) : null}

            {tab === 'due' ? (
              pending.length === 0 ? (
                <EmptyCard text={t.recurring.noneDue} />
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
              ))
            ) : null}

            {tab === 'rules' ? (
              <>
                {/* Creating another rule is the header +; the labeled button only
                    appears when there is nothing yet (docs/design-system.md). */}
                {rules.length > 0 ? <SectionHeading count={activeRules.length} title={t.recurring.activeRules} /> : null}
                {activeRules.length === 0 ? (
                  rules.length === 0 ? (
                    <EmptyState
                      action={{ label: t.recurring.createRule, onPress: () => router.push('/recurring-form'), accessibilityLabel: t.recurring.createFirstRule }}
                      body={t.recurring.emptyBody}
                      icon={{ ios: 'arrow.triangle.2.circlepath', android: 'autorenew', web: 'autorenew' }}
                      title={t.recurring.emptyTitle}
                    />
                  ) : (
                    <EmptyCard text={t.recurring.noActiveRules} />
                  )
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
                    <SectionHeading count={pausedRules.length} title={t.recurring.pausedRules} />
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
                    <SectionHeading count={endedRules.length} title={t.recurring.endedRules} />
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
              </>
            ) : null}

            {tab === 'history' ? (
              history.length === 0 ? (
                <EmptyCard text={t.recurring.historyEmpty} />
              ) : history.map((occurrence) => (
                <Card
                  accessible
                  accessibilityLabel={t.recurring.historyAccessibility(t.recurring.occurrenceStatusSpoken[occurrence.status], occurrenceLabel(occurrence, t), formatMoneyWithSymbol(occurrence.amount, occurrence.currency), formatTransactionDate(occurrence.scheduledDate))}
                  key={occurrence.id}
                  style={styles.historyRow}>
                  <View style={styles.flex}>
                    <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>
                      {occurrenceLabel(occurrence, t)}
                    </Text>
                    <Text style={[styles.meta, { color: theme.secondaryText }]}>
                      {formatTransactionDate(occurrence.scheduledDate)}
                    </Text>
                  </View>
                  <View style={styles.right}>
                    <Text style={[styles.amount, { color: theme.primaryText }]}>{formatMoneyWithSymbol(occurrence.amount, occurrence.currency)}</Text>
                    <Text style={[styles.status, { color: occurrence.status === 'posted' ? theme.income : theme.mutedText }]}>
                      {occurrence.status === 'posted' ? t.recurring.occurrenceStatus.posted : t.recurring.occurrenceStatus.skipped}
                    </Text>
                  </View>
                </Card>
              ))
            ) : null}
          </ScrollView>
        </>
      )}
      <DialogHost dialog={dialog} />
    </View>
  );
}

function SectionHeading({ count, title }: { count: number; title: string }) {
  const theme = useAppTheme();
  const t = useMessages();
  return <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.recurring.sectionCount(title, count)}</Text>;
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
  const t = useMessages();
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>{occurrenceLabel(occurrence, t)}</Text>
          <Text style={[styles.meta, { color: theme.secondaryText }]}>
            {t.recurring.dueOn(formatTransactionDate(occurrence.scheduledDate))}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: theme.secondaryText }]}>
            {ruleDetail(occurrence, t)}
          </Text>
        </View>
        <Text style={[styles.amount, { color: typeColor(occurrence.type, theme) }]}>{formatMoneyWithSymbol(occurrence.amount, occurrence.currency)}</Text>
      </View>
      <View style={styles.actions}>
        <Button
          accessibilityLabel={t.recurring.confirmOccurrence(occurrenceLabel(occurrence, t))}
          busy={confirming}
          disabled={busy}
          label={t.common.confirm}
          onPress={onConfirm}
          size="sm"
          variant="primary"
        />
        <Button
          accessibilityLabel={t.recurring.editOccurrence(occurrenceLabel(occurrence, t))}
          disabled={busy}
          label={t.common.edit}
          onPress={onEdit}
          size="sm"
        />
        <Button
          accessibilityLabel={t.recurring.skipOccurrence(occurrenceLabel(occurrence, t))}
          disabled={busy}
          label={t.recurring.skip}
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
  const t = useMessages();
  const ended = Boolean(rule.endedAt);
  const status = ended ? t.recurring.ruleStatus.ended : rule.isActive ? t.recurring.ruleStatus.active : t.recurring.ruleStatus.paused;
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.flex}>
          <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>{occurrenceLabel(rule, t)}</Text>
          <Text style={[styles.meta, { color: theme.secondaryText }]}>
            {frequencyLabel(rule.frequency, rule.interval, t)} · {t.recurring.nextOn(formatTransactionDate(rule.nextOccurrenceDate))}
          </Text>
          <Text numberOfLines={1} style={[styles.meta, { color: theme.secondaryText }]}>
            {ruleDetail(rule, t)}
          </Text>
        </View>
        <View style={styles.right}>
          <Text style={[styles.amount, { color: typeColor(rule.type, theme) }]}>{formatMoneyWithSymbol(rule.amount, rule.currency)}</Text>
          <Text accessibilityLabel={t.recurring.ruleStatusAccessibility(status)} style={[styles.status, { color: ended ? theme.mutedText : rule.isActive ? theme.income : theme.warning }]}>{status}</Text>
        </View>
      </View>
      {!ended ? (
        <View style={styles.actions}>
          <Button disabled={busy} label={t.recurring.editFuture} onPress={onEdit} size="sm" />
          <Button disabled={busy} label={rule.isActive ? t.recurring.pause : t.recurring.resume} onPress={onToggle} size="sm" />
          <Button disabled={busy} label={t.recurring.end} onPress={onEnd} size="sm" variant="destructive" />
        </View>
      ) : null}
    </Card>
  );
}

function occurrenceLabel(value: Pick<RecurringOccurrenceListItem, 'type' | 'note' | 'categoryName' | 'subcategoryName' | 'accountName' | 'destinationAccountName'>, t: Messages) {
  if (value.note) return value.note;
  if (value.type === 'transfer') return `${value.accountName} → ${value.destinationAccountName ?? t.recurring.account}`;
  return categoryPathLabel(value.categoryName, value.subcategoryName) ?? value.accountName;
}

function ruleDetail(value: Pick<RecurringOccurrenceListItem, 'type' | 'categoryName' | 'subcategoryName' | 'accountName' | 'destinationAccountName'>, t: Messages) {
  if (value.type === 'transfer') return `${value.accountName} → ${value.destinationAccountName ?? t.recurring.account}`;
  return `${value.accountName} · ${categoryPathLabel(value.categoryName, value.subcategoryName) ?? t.recurring.category}`;
}

function frequencyLabel(frequency: RecurringRuleListItem['frequency'], interval: number, t: Messages) {
  if (frequency === 'weekly' && interval === 2) return t.recurring.everyTwoWeeks;
  if (interval === 1) return t.recurring.frequency[frequency];
  return t.recurring.everyInterval(interval, frequency);
}

function typeColor(type: RecurringRuleListItem['type'], theme: ReturnType<typeof useAppTheme>) {
  if (type === 'income') return theme.income;
  if (type === 'transfer') return theme.transfer;
  return theme.expense;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  tabs: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  content: { gap: spacing.md, padding: spacing.md },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.sm },
  card: { gap: spacing.md },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  cardTitle: { ...typography.bodyStrong },
  meta: { ...typography.caption },
  amount: { ...typography.moneyRow },
  status: { ...typography.labelStrong, textTransform: 'uppercase' },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  historyRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 68 },
  error: { ...typography.caption },
  notice: { ...typography.caption },
  flex: { flex: 1, minWidth: 0 },
});
