import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
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
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { error, history, limited, loading, pending, reload: load, rules } = useRecurringTransactions();
  const activeRules = rules.filter((rule) => rule.isActive && !rule.endedAt);
  const pausedRules = rules.filter((rule) => !rule.isActive && !rule.endedAt);
  const endedRules = rules.filter((rule) => Boolean(rule.endedAt));

  async function confirm(occurrence: RecurringOccurrenceListItem) {
    try {
      await recurringTransactionService.confirmOccurrence(occurrence.id);
      await load();
    } catch (cause) {
      const validationMessage = cause instanceof TransactionValidationError
        ? Object.values(cause.fields).filter(Boolean).join('\n')
        : undefined;
      Alert.alert(
        'Unable to confirm',
        validationMessage || (cause instanceof Error ? cause.message : 'Review the occurrence and try again.'),
      );
    }
  }

  function skip(occurrence: RecurringOccurrenceListItem) {
    Alert.alert(
      'Skip this occurrence?',
      'It will remain in recurring history and will not affect balances or reports.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Skip',
          style: 'destructive',
          onPress: () => {
            void recurringTransactionService.skipOccurrence(occurrence.id)
              .then(load)
              .catch((cause) => Alert.alert(
                'Unable to skip',
                cause instanceof Error ? cause.message : 'Try again.',
              ));
          },
        },
      ],
    );
  }

  async function toggleRule(rule: RecurringRuleListItem) {
    try {
      if (rule.isActive) await recurringTransactionService.pauseRule(rule.id);
      else await recurringTransactionService.resumeRule(rule.id);
      await load();
    } catch (cause) {
      Alert.alert('Unable to update rule', cause instanceof Error ? cause.message : 'Try again.');
    }
  }

  function endRule(rule: RecurringRuleListItem) {
    Alert.alert(
      'End recurring transaction?',
      'No future occurrences will be generated. Existing history and pending items are preserved.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'End',
          style: 'destructive',
          onPress: () => {
            void recurringTransactionService.endRule(rule.id).then(load);
          },
        },
      ],
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
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

      {loading ? (
        <View style={styles.center}><ActivityIndicator color={theme.primaryAction} /></View>
      ) : (
        <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
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
            <View
              accessible
              accessibilityLabel={`Upcoming ${rule.type}, ${formatCop(rule.amount)}, ${formatTransactionDate(rule.nextOccurrenceDate)}, ${ruleDetail(rule)}`}
              key={`upcoming-${rule.id}`}
              style={[styles.historyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>{occurrenceLabel(rule)}</Text>
                <Text numberOfLines={1} style={[styles.meta, { color: theme.secondaryText }]}>{ruleDetail(rule)}</Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.amount, { color: typeColor(rule.type, theme) }]}>{formatCop(rule.amount)}</Text>
                <Text style={[styles.meta, { color: theme.secondaryText }]}>{formatTransactionDate(rule.nextOccurrenceDate)}</Text>
              </View>
            </View>
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
            <View
              accessible
              accessibilityLabel={`${occurrence.status}, ${occurrenceLabel(occurrence)}, ${formatCop(occurrence.amount)}, ${formatTransactionDate(occurrence.scheduledDate)}`}
              key={occurrence.id}
              style={[styles.historyRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.flex}>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: theme.primaryText }]}>
                  {occurrenceLabel(occurrence)}
                </Text>
                <Text style={[styles.meta, { color: theme.secondaryText }]}>
                  {formatTransactionDate(occurrence.scheduledDate)}
                </Text>
              </View>
              <View style={styles.right}>
                <Text style={[styles.amount, { color: theme.primaryText }]}>{formatCop(occurrence.amount)}</Text>
                <Text style={[styles.status, { color: occurrence.status === 'posted' ? theme.income : theme.mutedText }]}>
                  {occurrence.status === 'posted' ? 'Posted' : 'Skipped'}
                </Text>
              </View>
            </View>
          ))}
        </ScrollView>
      )}
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
    <View style={[styles.empty, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text style={[styles.meta, { color: theme.secondaryText }]}>{text}</Text>
    </View>
  );
}

function OccurrenceCard({
  occurrence,
  onConfirm,
  onEdit,
  onSkip,
}: {
  occurrence: RecurringOccurrenceListItem;
  onConfirm: () => void;
  onEdit: () => void;
  onSkip: () => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
        <Text style={[styles.amount, { color: typeColor(occurrence.type, theme) }]}>{formatCop(occurrence.amount)}</Text>
      </View>
      <View style={styles.actions}>
        <Pressable accessibilityLabel={`Confirm ${occurrenceLabel(occurrence)}`} accessibilityRole="button" onPress={onConfirm} style={[styles.primaryAction, { backgroundColor: theme.primaryAction }]}>
          <Text style={[styles.actionLabel, { color: theme.onPrimaryAction }]}>Confirm</Text>
        </Pressable>
        <Pressable accessibilityLabel={`Edit ${occurrenceLabel(occurrence)} occurrence`} accessibilityRole="button" onPress={onEdit} style={[styles.secondaryAction, { borderColor: theme.border }]}>
          <Text style={[styles.actionLabel, { color: theme.primaryText }]}>Edit</Text>
        </Pressable>
        <Pressable accessibilityLabel={`Skip ${occurrenceLabel(occurrence)} occurrence`} accessibilityRole="button" onPress={onSkip} style={[styles.secondaryAction, { borderColor: theme.border }]}>
          <Text style={[styles.actionLabel, { color: theme.destructive }]}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

function RuleCard({
  rule,
  onEdit,
  onToggle,
  onEnd,
}: {
  rule: RecurringRuleListItem;
  onEdit: () => void;
  onToggle: () => void;
  onEnd: () => void;
}) {
  const theme = useAppTheme();
  const ended = Boolean(rule.endedAt);
  const status = ended ? 'Ended' : rule.isActive ? 'Active' : 'Paused';
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
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
          <Text style={[styles.amount, { color: typeColor(rule.type, theme) }]}>{formatCop(rule.amount)}</Text>
          <Text accessibilityLabel={`Rule status ${status}`} style={[styles.status, { color: ended ? theme.mutedText : rule.isActive ? theme.income : theme.warning }]}>{status}</Text>
        </View>
      </View>
      {!ended ? (
        <View style={styles.actions}>
          <Pressable accessibilityRole="button" onPress={onEdit} style={[styles.secondaryAction, { borderColor: theme.border }]}>
            <Text style={[styles.actionLabel, { color: theme.primaryText }]}>Edit future</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onToggle} style={[styles.secondaryAction, { borderColor: theme.border }]}>
            <Text style={[styles.actionLabel, { color: theme.primaryText }]}>{rule.isActive ? 'Pause' : 'Resume'}</Text>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={onEnd} style={[styles.secondaryAction, { borderColor: theme.border }]}>
            <Text style={[styles.actionLabel, { color: theme.destructive }]}>End</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function occurrenceLabel(value: Pick<RecurringOccurrenceListItem, 'type' | 'note' | 'categoryName' | 'accountName' | 'destinationAccountName'>) {
  if (value.note) return value.note;
  if (value.type === 'transfer') return `${value.accountName} → ${value.destinationAccountName ?? 'Account'}`;
  return value.categoryName ?? value.accountName;
}

function ruleDetail(value: Pick<RecurringOccurrenceListItem, 'type' | 'categoryName' | 'accountName' | 'destinationAccountName'>) {
  if (value.type === 'transfer') return `${value.accountName} → ${value.destinationAccountName ?? 'Account'}`;
  return `${value.accountName} · ${value.categoryName ?? 'Category'}`;
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
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, fontSize: 22, textAlign: 'center' },
  content: { gap: spacing.md, padding: spacing.md },
  sectionTitle: { ...typography.sectionTitle, marginTop: spacing.sm },
  sectionTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  textButton: { alignItems: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.sm },
  textButtonLabel: { ...typography.caption, fontWeight: '700' },
  card: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.md },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md },
  cardTitle: { ...typography.body, fontWeight: '700' },
  meta: { ...typography.caption },
  amount: { ...typography.caption, fontWeight: '700', fontVariant: ['tabular-nums'] },
  status: { ...typography.label, fontWeight: '700', textTransform: 'uppercase' },
  right: { alignItems: 'flex-end', gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  primaryAction: { alignItems: 'center', borderRadius: borderRadii.sm, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  secondaryAction: { alignItems: 'center', borderRadius: borderRadii.sm, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  actionLabel: { ...typography.caption, fontWeight: '700' },
  historyRow: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.md, minHeight: 68, padding: spacing.md },
  empty: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, padding: spacing.md },
  error: { ...typography.caption },
  notice: { ...typography.caption },
  flex: { flex: 1, minWidth: 0 },
});
