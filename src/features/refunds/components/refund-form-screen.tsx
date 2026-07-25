import { router } from 'expo-router';
import { toUserMessage } from '@/errors/user-error';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { RefundActionError, RefundValidationError } from '../refund.service';
import { refundService } from '../refunds';
import { useRefundSummary } from '../use-refund-summary';
import type { RefundValidationErrors } from '../refund.types';

export function RefundFormScreen({ originalTransactionId }: { originalTransactionId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { summary, error } = useRefundSummary(originalTransactionId);
  const [amountDigits, setAmountDigits] = useState('');
  const [transactionDate, setTransactionDate] = useState(bogotaToday());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<RefundValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);

  async function save() {
    if (saving) return;
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const refund = await refundService.create({
        originalTransactionId,
        amount: amountDigits ? Number(amountDigits) : 0,
        transactionDate,
        note,
      });
      router.replace({ pathname: '/transactions/[id]', params: { id: refund.id } });
    } catch (cause) {
      if (cause instanceof RefundValidationError) {
        setErrors(cause.fields);
      } else if (cause instanceof RefundActionError) {
        setGeneralError(cause.message);
      } else {
        setGeneralError(toUserMessage(cause, 'Unable to save the refund.'));
      }
      setSaving(false);
    }
  }

  if (summary === undefined && !error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.appBackground }]}>
        <ActivityIndicator color={theme.primaryAction} />
        <Text style={[styles.body, { color: theme.secondaryText }]}>Loading expense…</Text>
      </View>
    );
  }
  if (!summary || error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.appBackground }]}>
        <Text style={[styles.body, { color: theme.destructive }]}>{error ?? 'Expense not found.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}>
          <Text style={[styles.body, { color: theme.primaryAction }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Cancel refund"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Add refund</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.contextCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.overline, { color: theme.mutedText }]}>Original expense</Text>
          <Text style={[styles.contextTitle, { color: theme.primaryText }]}>
            {summary.original.note ?? summary.original.categoryName ?? 'Expense'}
          </Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>
            {summary.original.accountName} · {summary.original.transactionDate}
          </Text>
          <View style={styles.amountRow}>
            <Metric label="Gross" value={formatCop(summary.grossAmount)} />
            <Metric label="Refunded" value={formatCop(summary.refundedAmount)} />
            <Metric label="Remaining" value={formatCop(summary.refundableRemaining)} />
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.tintPrimary }]}>
          <Text style={[styles.body, { color: theme.primaryText }]}>
            A refund reduces expenses and returns money to {summary.original.accountName}. It is not income.
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>Refund amount (COP)</Text>
          <TextInput
            accessibilityLabel={`Refund amount in Colombian pesos, maximum ${summary.refundableRemaining}`}
            autoFocus
            keyboardType="number-pad"
            maxLength={16}
            onChangeText={(value) => {
              setAmountDigits(value.replace(/\D/g, '').slice(0, 16));
              setErrors((current) => ({ ...current, amount: undefined }));
            }}
            placeholder="0"
            placeholderTextColor={theme.mutedText}
            style={[
              styles.amountInput,
              {
                backgroundColor: theme.surface,
                borderColor: errors.amount ? theme.destructive : theme.hairline,
                color: theme.primaryText,
              },
            ]}
            value={amountDigits}
          />
          <Text style={[styles.helper, { color: theme.mutedText }]}>
            Maximum refundable: {formatCop(summary.refundableRemaining)}
          </Text>
          {errors.amount ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.amount}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>Refund date</Text>
          <TextInput
            accessibilityLabel="Refund date, YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={setTransactionDate}
            style={[
              styles.input,
              {
                backgroundColor: theme.surface,
                borderColor: errors.transactionDate ? theme.destructive : theme.hairline,
                color: theme.primaryText,
              },
            ]}
            value={transactionDate}
          />
          {errors.transactionDate ? (
            <Text style={[styles.error, { color: theme.destructive }]}>{errors.transactionDate}</Text>
          ) : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Refund note, optional"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="Merchant refund, correction…"
            placeholderTextColor={theme.mutedText}
            style={[
              styles.noteInput,
              {
                backgroundColor: theme.surface,
                borderColor: errors.note ? theme.destructive : theme.hairline,
                color: theme.primaryText,
              },
            ]}
            textAlignVertical="top"
            value={note}
          />
          {errors.note ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.note}</Text> : null}
        </View>

        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
            {generalError}
          </Text>
        ) : null}
      </ScrollView>

      <View style={[styles.saveBar, { borderTopColor: theme.hairline, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          accessibilityLabel="Save refund"
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.saveButton, { backgroundColor: theme.primaryAction }]}>
          {saving ? <ActivityIndicator color={theme.onPrimaryAction} /> : null}
          <Text style={[styles.saveLabel, { color: theme.onPrimaryAction }]}>
            {saving ? 'Saving…' : 'Save refund'}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.metric}>
      <Text style={[styles.overline, { color: theme.mutedText }]}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.metricValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.md },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.md, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  contextCard: { borderRadius: borderRadii.lg, gap: spacing.xs, padding: spacing.md },
  contextTitle: { ...typography.sectionTitle },
  infoCard: { borderRadius: borderRadii.md, padding: spacing.md },
  amountRow: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm },
  metric: { flex: 1, minWidth: 0 },
  metricValue: { ...typography.moneyRow, fontSize: 12, lineHeight: 18 },
  overline: { ...typography.overline },
  body: { ...typography.caption },
  field: { gap: spacing.sm },
  label: { ...typography.overline },
  helper: { ...typography.caption },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  amountInput: { ...typography.money, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 64, paddingHorizontal: spacing.md },
  noteInput: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 104, padding: spacing.md },
  error: { ...typography.caption },
  saveBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  saveButton: { alignItems: 'center', borderRadius: borderRadii.full, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 56 },
  saveLabel: { ...typography.body, fontWeight: '700' },
  centered: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  backAction: { justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
});
