import { router } from 'expo-router';
import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { toUserMessage } from '@/errors/user-error';
import { SymbolView } from 'expo-symbols';
import { useCallback, useEffect, useMemo, useState } from 'react';
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

import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import {
  formatMoneyWithSymbol,
  getCurrency,
  parseMoney,
  type CurrencyCode,
} from '@/features/currency/currency';
import { sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
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
import { DialogHost, useDialog } from '@/components/dialog';

export function PayCreditCardScreen({ accountId }: { accountId: string }) {
  const dialog = useDialog();
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
  const [sourceAmountDigits, setSourceAmountDigits] = useState('');
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
  const cardCurrency: CurrencyCode = details?.account.currency ?? 'COP';
  const money = (value: number) => formatMoneyWithSymbol(value, cardCurrency);
  const selectedSource = sources.find((source) => source.id === effectiveSourceId);
  const sourceCurrency: CurrencyCode = selectedSource?.currency ?? 'COP';
  const crossCurrency = Boolean(selectedSource) && sourceCurrency !== cardCurrency;
  const parsedCustom = parseMoney(amountDigits || '0', cardCurrency);
  const customAmount = parsedCustom.ok ? parsedCustom.minor : 0;
  const customAmountValid = parsedCustom.ok && customAmount > 0;
  const customAmountError = option === 'other' && customAmountTouched && !customAmountValid
    ? 'Enter a valid amount greater than zero.'
    : undefined;
  const parsedSourceAmount = parseMoney(sourceAmountDigits || '0', sourceCurrency);
  const sourceAmountValue = parsedSourceAmount.ok ? parsedSourceAmount.minor : 0;

  const buildInput = useCallback((confirmOverpayment: boolean): CreditCardPaymentInput | null => {
    if (!option) return null;
    return {
      cardAccountId: accountId,
      sourceAccountId: effectiveSourceId,
      option,
      amount: option === 'other' ? customAmount : null,
      sourceAmount: crossCurrency ? sourceAmountValue : null,
      transactionDate: date,
      note,
      confirmOverpayment,
    };
  }, [accountId, crossCurrency, customAmount, date, effectiveSourceId, note, option, sourceAmountValue]);

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
    if (crossCurrency && sourceAmountValue <= 0) return;
    let active = true;
    const timer = setTimeout(() => {
      setPreview(undefined);
      setServiceError(undefined);
      void creditCardPaymentService.preview(input).then((value) => {
        if (active) setPreview(value);
      }, (cause: unknown) => {
        if (active) setServiceError(toUserMessage(cause, 'Unable to calculate payment.'));
      });
    }, 0);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [buildInput, crossCurrency, customAmountValid, details, effectiveSourceId, selectedOption, sourceAmountValue]);

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
        dialog.confirm({
          title: 'Confirm card overpayment',
          message: cause.message,
          confirmLabel: 'Pay anyway',
          onConfirm: () => void submit(true),
          // The submit that raised this left `saving` true; backing out has to
          // release the button or the form stays stuck.
          onCancel: () => setSaving(false),
        });
        return;
      }
      setServiceError(toUserMessage(cause, 'Unable to create card payment.'));
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
        <Pressable accessibilityRole="button" onPress={() => void reload()} style={[styles.retry, { backgroundColor: theme.elevatedSurface }]}>
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
      <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
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
        <View style={[styles.summary, { backgroundColor: theme.elevatedSurface }]}>
          <Value label="Current debt" value={money(details.utilization.currentDebt)} />
          <Text style={[styles.help, { color: theme.mutedText }]}>The total amount currently owed based on transactions recorded in Money Control.</Text>
          <Value label="Remaining statement" value={details.latestStatement ? money(details.latestStatement.remainingStatement) : 'No statement recorded'} />
          <Text style={[styles.help, { color: theme.mutedText }]}>The unpaid portion of the latest statement based on qualifying card payments.</Text>
        </View>

        <Field label="1. Source account">
          <View style={styles.choices}>
            {sources.map((source) => (
              <SourceChoice
                key={source.id}
                label={`${source.name} · ${formatMoneyWithSymbol(source.balance, source.currency)} ${source.currency}`}
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
                currency={cardCurrency}
                onPress={() => selectPaymentOption(item)}
                selected={option === item.type}
                value={item}
              />
            ))}
          </View>
          {selectionMessage ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>{selectionMessage}</Text> : null}
        </Field>

        {option === 'other' ? (
          <Field label={`Other amount (${cardCurrency}, credited to card)`}>
            <TextInput
              accessibilityLabel={`Other card payment amount in ${getCurrency(cardCurrency).name}`}
              keyboardType={getCurrency(cardCurrency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
              onBlur={() => setCustomAmountTouched(true)}
              onChangeText={(value) => {
                setAmountDigits(sanitizeAmountEntry(value, cardCurrency));
                setCustomAmountTouched(true);
                setPreview(undefined);
              }}
              placeholder="Enter amount"
              placeholderTextColor={theme.mutedText}
              style={[styles.input, styles.amountInput, { backgroundColor: theme.surface, borderColor: customAmountError ? theme.destructive : theme.hairline, color: theme.primaryText }]}
              value={amountDigits}
            />
            {customAmountError ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.destructive }]}>{customAmountError}</Text> : null}
          </Field>
        ) : null}

        {crossCurrency ? (
          <Field label={`Amount sent from source (${sourceCurrency})`}>
            <TextInput
              accessibilityLabel={`Amount debited from the source account in ${getCurrency(sourceCurrency).name}`}
              keyboardType={getCurrency(sourceCurrency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
              onChangeText={(value) => {
                setSourceAmountDigits(sanitizeAmountEntry(value, sourceCurrency));
                setPreview(undefined);
              }}
              placeholder="Enter amount your account was debited"
              placeholderTextColor={theme.mutedText}
              style={[styles.input, styles.amountInput, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]}
              value={sourceAmountDigits}
            />
            <Text style={[styles.help, { color: theme.mutedText }]}>
              This card payment converts {sourceCurrency} to {cardCurrency}. Enter the actual amount sent and credited; both are saved.
            </Text>
          </Field>
        ) : null}

        <DateField label="3. Payment date" onChange={setDate} value={date} />
        <Field label="Optional note">
          <TextInput
            accessibilityLabel="Optional payment note"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="e.g. July statement"
            placeholderTextColor={theme.mutedText}
            style={[styles.input, styles.note, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]}
            value={note}
          />
        </Field>

        <Field label="4. Review">
          {preview ? (
            <View style={[styles.review, { backgroundColor: preview.overpaymentAmount > 0 ? theme.tintWarning : theme.surface }]}>
              <Value label="Source account" value={preview.sourceAccountName} />
              <Value label="Source available balance" value={`${formatMoneyWithSymbol(preview.sourceBalance, preview.sourceCurrency)} ${preview.sourceCurrency}`} />
              <Value label="Selected payment option" value={preview.optionLabel} />
              <Value label={preview.crossCurrency ? 'Amount credited to card' : 'Payment amount'} value={money(preview.amount)} />
              {preview.crossCurrency ? (
                <Value label="Amount sent from source" value={`${formatMoneyWithSymbol(preview.sourceAmount, preview.sourceCurrency)} ${preview.sourceCurrency}`} />
              ) : null}
              <Value label="Current debt" value={money(preview.currentDebt)} />
              <Value label="Remaining statement" value={details.latestStatement ? money(preview.statementRemaining) : 'No statement recorded'} />
              <Value label="Expected debt" value={money(preview.expectedDebt)} />
              <Value label="Expected statement remaining" value={details.latestStatement ? money(preview.expectedStatementRemaining) : 'No statement recorded'} />
              <Value label="Payment date" value={date} />
              {preview.amountBeyondStatement > 0 && preview.overpaymentAmount === 0 ? (
                <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>This payment will cover the latest statement and also reduce newer card charges.</Text>
              ) : null}
              {preview.expectedStatementRemaining > 0 && preview.expectedStatementRemaining < preview.statementRemaining ? (
                <Text style={[styles.help, { color: theme.secondaryText }]}>This payment covers part of the statement, leaving {money(preview.expectedStatementRemaining)}.</Text>
              ) : null}
              {preview.overpaymentAmount > 0 ? (
                <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>This payment exceeds the current debt by {money(preview.overpaymentAmount)}. The card will have a positive balance.</Text>
              ) : null}
            </View>
          ) : <Text style={[styles.help, { color: theme.mutedText }]}>Select an available option to review the payment.</Text>}
          {serviceError ? <Text accessibilityLiveRegion="assertive" style={[styles.help, { color: theme.destructive }]}>{serviceError}</Text> : null}
        </Field>

        <Button
          accessibilityLabel="Confirm credit card payment"
          busy={saving}
          disabled={!preview}
          fullWidth
          label="Confirm payment"
          onPress={() => void submit()}
          size="lg"
          variant="primary"
        />
      </ScrollView>
      <DialogHost dialog={dialog} />
    </KeyboardAvoidingView>
  );
}

function Field({ children, label }: { children: React.ReactNode; label: string }) {
  return <View style={styles.field}><Overline>{label}</Overline>{children}</View>;
}

function SourceChoice({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useAppTheme();
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent' }]}><Text style={[styles.help, { color: selected ? theme.primaryText : theme.secondaryText }]}>{label}</Text></Pressable>;
}

function PaymentOptionChoice({ onPress, selected, value, currency }: { onPress: () => void; selected: boolean; value: CreditCardPaymentOptionView; currency: CurrencyCode }) {
  const theme = useAppTheme();
  const detail = value.amount !== null
    ? formatMoneyWithSymbol(value.amount, currency)
    : value.unavailableReason ?? 'Enter a custom amount';
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ disabled: !value.isAvailable, selected }}
      disabled={!value.isAvailable}
      onPress={onPress}
      style={[styles.option, {
        backgroundColor: selected ? theme.tintPrimary : theme.surface,
        borderColor: selected ? theme.primaryAction : 'transparent',
        opacity: value.isAvailable ? 1 : 0.65,
      }]}
    >
      <Text style={[styles.bodyStrong, { color: value.isAvailable ? theme.primaryText : theme.disabledText }]}>{value.label}</Text>
      <Text style={[styles.help, styles.optionDetail, { color: value.isAvailable ? theme.secondaryText : theme.disabledText }]}>{detail}</Text>
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
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md },
  summary: { borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.md },
  field: { gap: spacing.sm },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: { borderRadius: borderRadii.full, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  optionList: { gap: spacing.sm },
  option: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.xs, minHeight: 64, padding: spacing.md },
  optionDetail: { fontFamily: fonts.mono.medium },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  amountInput: { fontFamily: fonts.mono.medium },
  note: { minHeight: 88, paddingTop: spacing.md, textAlignVertical: 'top' },
  review: { borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.md },
  valueRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  value: { flexShrink: 1, fontFamily: fonts.mono.bold, textAlign: 'right' },
  retry: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm },
  body: { ...typography.body },
  bodyStrong: { ...typography.body, fontWeight: '700' },
  help: { ...typography.caption },
});
