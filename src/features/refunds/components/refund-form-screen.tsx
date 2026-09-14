import { router } from 'expo-router';
import { DateField } from '@/components/date-field';
import { toUserMessage } from '@/errors/user-error';
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
import {
  currencyName,
  formatMoneyEntry,
  formatMoneyWithSymbol,
  getCurrency,
  parseMoney,
} from '@/features/currency/currency';
import { loadValuationRates } from '@/features/exchange-rates/exchange-rates';
import { useBaseCurrency } from '@/features/settings/use-base-currency';
import { sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { RefundActionError, RefundValidationError } from '../refund.service';
import { refundService } from '../refunds';
import { useRefundSummary } from '../use-refund-summary';
import type { RefundValidationErrors } from '../refund.types';
import { ScreenHeader } from '@/components/screen-header';
import { FixedFooter } from '@/components/fixed-footer';
import { Button } from '@/components/button';

export function RefundFormScreen({ originalTransactionId }: { originalTransactionId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const tr = t.refunds;
  const { summary, error } = useRefundSummary(originalTransactionId);
  const [amountDigits, setAmountDigits] = useState('');
  const [transactionDate, setTransactionDate] = useState(bogotaToday());
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<RefundValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const baseCurrency = useBaseCurrency();
  const refundCurrency = summary?.original.currency ?? baseCurrency;

  async function save() {
    if (saving || !summary) return;
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const parsed = parseMoney(amountDigits || '0', refundCurrency);
      if (!parsed.ok) {
        setErrors({ amount: t.transactions.errors.invalidAmount });
        setSaving(false);
        return;
      }
      let exchangeRate = null;
      if (refundCurrency !== baseCurrency) {
        const rates = await loadValuationRates();
        exchangeRate = rates.snapshotInputFor(refundCurrency);
        if (!exchangeRate) {
          setErrors({ exchangeRate: tr.errors.missingRate(refundCurrency, baseCurrency) });
          setSaving(false);
          return;
        }
      }
      const refund = await refundService.create({
        originalTransactionId,
        amount: parsed.minor,
        transactionDate,
        note,
        exchangeRate,
      });
      router.replace({ pathname: '/transactions/[id]', params: { id: refund.id } });
    } catch (cause) {
      if (cause instanceof RefundValidationError) {
        setErrors(cause.fields);
      } else if (cause instanceof RefundActionError) {
        setGeneralError(cause.message);
      } else {
        setGeneralError(toUserMessage(cause, tr.errors.unableToSave));
      }
      setSaving(false);
    }
  }

  if (summary === undefined && !error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.appBackground }]}>
        <ActivityIndicator color={theme.primaryAction} />
        <Text style={[styles.body, { color: theme.secondaryText }]}>{tr.loadingExpense}</Text>
      </View>
    );
  }
  if (!summary || error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.appBackground }]}>
        <Text style={[styles.body, { color: theme.destructive }]}>{error ?? tr.expenseNotFound}</Text>
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.backAction}>
          <Text style={[styles.body, { color: theme.primaryAction }]}>{t.transactions.details.goBack}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel={tr.cancel} title={tr.title} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        <View style={[styles.contextCard, { backgroundColor: theme.surface }]}>
          <Text style={[styles.overline, { color: theme.mutedText }]}>{tr.originalExpense}</Text>
          <Text style={[styles.contextTitle, { color: theme.primaryText }]}>
            {summary.original.note ?? summary.original.categoryName ?? tr.expenseFallback}
          </Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>
            {summary.original.accountName} · {summary.original.transactionDate}
          </Text>
          <View style={styles.amountRow}>
            <Metric label={tr.gross} value={formatMoneyWithSymbol(summary.grossAmount, refundCurrency)} />
            <Metric label={tr.refunded} value={formatMoneyWithSymbol(summary.refundedAmount, refundCurrency)} />
            <Metric label={tr.remaining} value={formatMoneyWithSymbol(summary.refundableRemaining, refundCurrency)} />
          </View>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.tintPrimary }]}>
          <Text style={[styles.body, { color: theme.primaryText }]}>
            {tr.explanation(summary.original.accountName)}
          </Text>
        </View>

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>{tr.amountLabel(refundCurrency)}</Text>
          <TextInput
            accessibilityLabel={tr.amountA11y(currencyName(refundCurrency))}
            autoFocus
            keyboardType={getCurrency(refundCurrency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
            maxLength={20}
            onChangeText={(value) => {
              setAmountDigits(sanitizeAmountEntry(value, refundCurrency));
              setErrors((current) => ({ ...current, amount: undefined }));
            }}
            placeholder={getCurrency(refundCurrency).fractionDigits > 0 ? '0.00' : '0'}
            placeholderTextColor={theme.mutedText}
            style={[
              styles.amountInput,
              {
                backgroundColor: theme.surface,
                borderColor: errors.amount ? theme.destructive : theme.hairline,
                color: theme.primaryText,
              },
            ]}
            value={formatMoneyEntry(amountDigits, refundCurrency)}
          />
          <Text style={[styles.helper, { color: theme.mutedText }]}>
            {tr.maximumRefundable(formatMoneyWithSymbol(summary.refundableRemaining, refundCurrency))}
          </Text>
          {errors.amount ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.amount}</Text> : null}
          {refundCurrency !== baseCurrency ? (
            <Text style={[styles.helper, { color: theme.mutedText }]}>
              {tr.foreignRateNote(refundCurrency, baseCurrency)}
            </Text>
          ) : null}
          {errors.exchangeRate ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.exchangeRate}</Text> : null}
        </View>

        <DateField
          error={errors.transactionDate}
          label={tr.date}
          onChange={setTransactionDate}
          value={transactionDate}
        />

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.secondaryText }]}>{tr.noteOptional}</Text>
          <TextInput
            accessibilityLabel={tr.noteA11y}
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder={tr.notePlaceholder}
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

      <FixedFooter bottomInset={insets.bottom}>
        <Button
          accessibilityLabel={tr.save}
          busy={saving}
          fullWidth
          icon={{ ios: 'checkmark', android: 'check', web: 'check' }}
          label={tr.save}
          onPress={() => void save()}
          size="lg"
          variant="primary"
        />
      </FixedFooter>
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
  centered: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  backAction: { justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
});
