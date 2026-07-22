import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { useAccounts } from '@/features/accounts/use-accounts';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { CreditCardOverpaymentConfirmationRequired } from '../credit-card-payment.service';
import { creditCardPaymentService } from '../credit-cards';
import type {
  CreditCardPaymentInput,
  CreditCardPaymentOption,
  CreditCardPaymentOptionView,
  CreditCardPaymentPreview,
} from '../credit-card.types';
import { useCreditCard } from '../use-credit-card';

export function PayCreditCardScreen({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { accounts } = useAccounts();
  const { details, loading, error: loadError, reload } = useCreditCard(accountId);
  const sources = useMemo(
    () => accounts.filter((account) => !account.isArchived && account.type !== 'credit_card'),
    [accounts],
  );
  const [sourceId, setSourceId] = useState('');
  const [option, setOption] = useState<CreditCardPaymentOption | null>(null);
  const [amountDigits, setAmountDigits] = useState('');
  const [customAmountTouched, setCustomAmountTouched] = useState(false);
  const [date, setDate] = useState(bogotaToday);
  const [note, setNote] = useState('');
  const [preview, setPreview] = useState<CreditCardPaymentPreview>();
  const [serviceError, setServiceError] = useState<string>();
  const [selectionMessage, setSelectionMessage] = useState<string>();
  const [saving, setSaving] = useState(false);

  const effectiveSourceId = sources.some((source) => source.id === sourceId)
    ? sourceId
    : sources[0]?.id ?? '';
  const options = useMemo(
    () => details ? creditCardPaymentService.getPaymentOptions(details) : [],
    [details],
  );
  const selectedOption = options.find((candidate) => candidate.type === option);
  const customAmount = Number(amountDigits || 0);
  const customAmountValid = /^\d+$/.test(amountDigits) && Number.isSafeInteger(customAmount) && customAmount > 0;
  const customAmountError = option === 'other' && customAmountTouched && !customAmountValid
    ? 'Enter a positive whole, safe COP amount.'
    : undefined;

  const buildInput = useCallback((confirmOverpayment: boolean): CreditCardPaymentInput | null => {
    if (!option) return null;
    return {
      cardAccountId: accountId,
      sourceAccountId: effectiveSourceId,
      option,
      amount: option === 'other' ? customAmount : null,
      transactionDate: date,
      note,
      confirmOverpayment,
    };
  }, [accountId, customAmount, date, effectiveSourceId, note, option]);

  useEffect(() => {
    if (!option || !selectedOption || selectedOption.isAvailable) return;
    const unavailableOption = option;
    const timer = setTimeout(() => {
      setOption((current) => current === unavailableOption ? null : current);
      setPreview(undefined);
      setSelectionMessage(selectedOption.unavailableReason ?? 'That payment option is no longer available.');
    }, 0);
    return () => clearTimeout(timer);
  }, [option, selectedOption]);

  useEffect(() => {
    const input = buildInput(false);
    if (!details || !effectiveSourceId || !input || !selectedOption?.isAvailable) return;
    if (input.option === 'other' && !customAmountValid) return;
    let active = true;
    const timer = setTimeout(() => {
      setPreview(undefined);
      setServiceError(undefined);
      void creditCardPaymentService.preview(input).then((value) => {
        if (active) setPreview(value);
      }, (cause: unknown) => {
        if (active) setServiceError(cause instanceof Error ? cause.message : 'Unable to calculate payment.');
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [buildInput, customAmountValid, details, effectiveSourceId, selectedOption]);

  function selectPaymentOption(value: CreditCardPaymentOptionView) {
    if (!value.isAvailable) return;
    setOption(value.type);
    setSelectionMessage(undefined);
    setServiceError(undefined);
    setPreview(undefined);
    if (value.type === 'other') setCustomAmountTouched(false);
  }

  async function submit(confirmOverpayment = false) {
    if (saving) return;
    const input = buildInput(confirmOverpayment);
    if (!input) {
      setSelectionMessage('Select an available payment option.');
      return;
    }
    if (input.option === 'other' && !customAmountValid) {
      setCustomAmountTouched(true);
      return;
    }
    setSaving(true);
    setServiceError(undefined);
    try {
      await creditCardPaymentService.pay(input);
      router.back();
    } catch (cause) {
      if (cause instanceof CreditCardOverpaymentConfirmationRequired) {
        setSaving(false);
        Alert.alert('Confirm card overpayment', cause.message, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Pay anyway', onPress: () => void submit(true) },
        ]);
        return;
      }
      setServiceError(cause instanceof Error ? cause.message : 'Unable to create card payment.');
      setSaving(false);
    }
  }

  if (loading && details === undefined) {
    return <View style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} size="large" /></View>;
  }
  if (loadError || !details) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground }]}>
        <Text style={[styles.body, { color: theme.destructive }]}>{loadError ?? 'Credit card not found.'}</Text>
        <Pressable accessibilityRole="button" onPress={() => void reload()} style={[styles.retry, { borderColor: theme.border }]}>
          <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable accessibilityLabel="Close card payment" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Pay {details.account.name}</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summary, { backgroundColor: theme.elevatedSurface, borderColor: theme.border }]}>
          <Value label="Current debt" value={formatCop(details.utilization.currentDebt)} />
          <Text style={[styles.help, { color: theme.mutedText }]}>The total amount currently owed based on transactions recorded in Money Control.</Text>
          <Value label="Remaining statement" value={details.latestStatement ? formatCop(details.latestStatement.remainingStatement) : 'No statement recorded'} />
          <Text style={[styles.help, { color: theme.mutedText }]}>The unpaid portion of the latest statement based on qualifying card payments.</Text>
        </View>

        <Field label="1. Source account">
          <View style={styles.choices}>
            {sources.map((source) => (
              <SourceChoice
                key={source.id}
                label={`${source.name} · ${formatCop(source.balance)}`}
                onPress={() => setSourceId(source.id)}
                selected={effectiveSourceId === source.id}
              />
            ))}
          </View>
          {sources.length === 0 ? <Text style={[styles.help, { color: theme.destructive }]}>Create or restore a non-card account before paying this card.</Text> : null}
        </Field>

        <Field label="2. Payment option">
          <View accessibilityRole="radiogroup" style={styles.optionList}>
            {options.map((item) => (
              <PaymentOptionChoice
                key={item.type}
                onPress={() => selectPaymentOption(item)}
                selected={option === item.type}
                value={item}
              />
            ))}
          </View>
          {selectionMessage ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>{selectionMessage}</Text> : null}
        </Field>

        {option === 'other' ? (
          <Field label="Other amount">
            <TextInput
              accessibilityLabel="Other card payment amount"
              keyboardType="number-pad"
              onBlur={() => setCustomAmountTouched(true)}
              onChangeText={(value) => {
                setAmountDigits(value.replace(/\D/g, ''));
                setCustomAmountTouched(true);
                setPreview(undefined);
              }}
              placeholder="Enter amount"
              placeholderTextColor={theme.mutedText}
              style={[styles.input, { backgroundColor: theme.surface, borderColor: customAmountError ? theme.destructive : theme.border, color: theme.primaryText }]}
              value={amountDigits}
            />
            {customAmountError ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.destructive }]}>{customAmountError}</Text> : null}
          </Field>
        ) : null}

        <Field label="3. Payment date">
          <TextInput
            accessibilityLabel="Payment date in YYYY-MM-DD"
            autoCapitalize="none"
            maxLength={10}
            onChangeText={setDate}
            style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.primaryText }]}
            value={date}
          />
        </Field>
        <Field label="Optional note">
          <TextInput
            accessibilityLabel="Optional payment note"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="e.g. July statement"
            placeholderTextColor={theme.mutedText}
            style={[styles.input, styles.note, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.primaryText }]}
            value={note}
          />
        </Field>

        <Field label="4. Review">
          {preview ? (
            <View style={[styles.review, { backgroundColor: theme.surface, borderColor: preview.overpaymentAmount > 0 ? theme.warning : theme.border }]}>
              <Value label="Source account" value={preview.sourceAccountName} />
              <Value label="Source available balance" value={formatCop(preview.sourceBalance)} />
              <Value label="Selected payment option" value={preview.optionLabel} />
              <Value label="Payment amount" value={formatCop(preview.amount)} />
              <Value label="Current card debt" value={formatCop(preview.currentDebt)} />
              <Value label="Statement remaining" value={details.latestStatement ? formatCop(preview.statementRemaining) : 'No statement recorded'} />
              <Value label="Expected card debt" value={formatCop(preview.expectedDebt)} />
              <Value label="Expected statement remaining" value={details.latestStatement ? formatCop(preview.expectedStatementRemaining) : 'No statement recorded'} />
              <Value label="Payment date" value={date} />
              {preview.amountBeyondStatement > 0 && preview.overpaymentAmount === 0 ? (
                <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>This payment will cover the latest statement and also reduce newer card charges.</Text>
              ) : null}
              {preview.expectedStatementRemaining > 0 && preview.expectedStatementRemaining < preview.statementRemaining ? (
                <Text style={[styles.help, { color: theme.secondaryText }]}>This payment covers part of the statement, leaving {formatCop(preview.expectedStatementRemaining)}.</Text>
              ) : null}
              {preview.overpaymentAmount > 0 ? (
                <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>This payment exceeds the current debt by {formatCop(preview.overpaymentAmount)}. The card will have a positive balance.</Text>
              ) : null}
            </View>
          ) : <Text style={[styles.help, { color: theme.mutedText }]}>Select an available option to review the payment.</Text>}
          {serviceError ? <Text accessibilityLiveRegion="assertive" style={[styles.help, { color: theme.destructive }]}>{serviceError}</Text> : null}
        </Field>

        <Pressable
          accessibilityLabel="Confirm credit card payment"
          accessibilityRole="button"
          accessibilityState={{ disabled: saving || !preview }}
          disabled={saving || !preview}
          onPress={() => void submit()}
          style={[styles.save, { backgroundColor: saving || !preview ? theme.disabledSurface : theme.primaryAction }]}
        >
          {saving
            ? <ActivityIndicator color={theme.disabledText} />
            : <Text style={[styles.bodyStrong, { color: preview ? theme.onPrimaryAction : theme.disabledText }]}>Confirm payment</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  const theme = useAppTheme();
  return <View style={styles.field}><Text style={[styles.fieldLabel, { color: theme.primaryText }]}>{label}</Text>{children}</View>;
}

function SourceChoice({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, { backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface, borderColor: selected ? theme.primaryAction : theme.border }]}><Text style={[styles.help, { color: selected ? theme.selectedNavigationForeground : theme.secondaryText }]}>{label}</Text></Pressable>;
}

function PaymentOptionChoice({ onPress, selected, value }: { onPress: () => void; selected: boolean; value: CreditCardPaymentOptionView }) {
  const theme = useAppTheme();
  const detail = value.amount !== null
    ? formatCop(value.amount)
    : value.unavailableReason ?? 'Enter a custom amount';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ disabled: !value.isAvailable, selected }}
      disabled={!value.isAvailable}
      onPress={onPress}
      style={[styles.option, {
        backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface,
        borderColor: selected ? theme.primaryAction : theme.border,
        opacity: value.isAvailable ? 1 : 0.65,
      }]}
    >
      <Text style={[styles.bodyStrong, { color: value.isAvailable ? theme.primaryText : theme.disabledText }]}>{value.label}</Text>
      <Text style={[styles.help, { color: value.isAvailable ? theme.secondaryText : theme.disabledText }]}>{detail}</Text>
    </Pressable>
  );
}

function Value({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return <View style={styles.valueRow}><Text style={[styles.body, { color: theme.secondaryText }]}>{label}</Text><Text style={[styles.bodyStrong, styles.value, { color: theme.primaryText }]}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md },
  summary: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.body, fontWeight: '700' },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { borderRadius: borderRadii.full, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  optionList: { gap: spacing.sm },
  option: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.xs, minHeight: 64, padding: spacing.md },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 52, paddingHorizontal: spacing.md },
  note: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  review: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md },
  valueRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  value: { flexShrink: 1, textAlign: 'right' },
  save: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 54, paddingHorizontal: spacing.md },
  retry: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  body: { ...typography.body },
  bodyStrong: { ...typography.body, fontWeight: '700' },
  help: { ...typography.caption },
});
