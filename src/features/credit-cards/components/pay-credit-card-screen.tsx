import { router } from 'expo-router';
import { useBaseCurrency } from '@/features/settings/use-base-currency';
import { Button } from '@/components/button';
import { DateField } from '@/components/date-field';
import { toUserMessage } from '@/errors/user-error';
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
  currencyName,
  formatMoneyEntry,
  formatMoneyWithSymbol,
  getCurrency,
  parseMoney,
  type CurrencyCode,
} from '@/features/currency/currency';
import { sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { useAccounts } from '@/features/accounts/use-accounts';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { getMessages } from '@/i18n/messages';
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
import { ScreenHeader } from '@/components/screen-header';

export function PayCreditCardScreen({ accountId }: { accountId: string }) {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
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
  const baseCurrency = useBaseCurrency();
  const cardCurrency: CurrencyCode = details?.account.currency ?? baseCurrency;
  const money = (value: number) => formatMoneyWithSymbol(value, cardCurrency);
  const selectedSource = sources.find((source) => source.id === effectiveSourceId);
  const sourceCurrency: CurrencyCode = selectedSource?.currency ?? baseCurrency;
  const crossCurrency = Boolean(selectedSource) && sourceCurrency !== cardCurrency;
  const parsedCustom = parseMoney(amountDigits || '0', cardCurrency);
  const customAmount = parsedCustom.ok ? parsedCustom.minor : 0;
  const customAmountValid = parsedCustom.ok && customAmount > 0;
  const customAmountError = option === 'other' && customAmountTouched && !customAmountValid
    ? t.creditCards.validation.enterPositiveAmount
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
      setSelectionMessage(selectedOption.unavailableReason ?? getMessages().creditCards.pay.optionNoLongerAvailable);
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
        if (active) setServiceError(toUserMessage(cause, getMessages().creditCards.errors.calculatePayment));
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
      setSelectionMessage(t.creditCards.pay.selectAvailableOption);
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
          title: t.creditCards.pay.overpaymentTitle,
          message: cause.message,
          confirmLabel: t.creditCards.pay.payAnyway,
          onConfirm: () => void submit(true),
          // The submit that raised this left `saving` true; backing out has to
          // release the button or the form stays stuck.
          onCancel: () => setSaving(false),
        });
        return;
      }
      setServiceError(toUserMessage(cause, t.creditCards.errors.createPayment));
      setSaving(false);
    }
  }

  if (loading && details === undefined) {
    return <View style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} size="large" /></View>;
  }
  if (loadError || !details) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground }]}>
        <Text style={[styles.body, { color: theme.destructive }]}>{loadError ?? t.creditCards.errors.cardNotFound}</Text>
        <Pressable accessibilityRole="button" onPress={() => void reload()} style={[styles.retry, { backgroundColor: theme.elevatedSurface }]}>
          <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{t.common.retry}</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}
    >
      <ScreenHeader leading="close" leadingAccessibilityLabel={t.creditCards.pay.close} title={t.creditCards.pay.title(details.account.name)} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.summary, { backgroundColor: theme.elevatedSurface }]}>
          <Value label={t.creditCards.pay.currentDebt} value={money(details.utilization.currentDebt)} />
          <Text style={[styles.help, { color: theme.mutedText }]}>{t.creditCards.details.currentDebtHelp}</Text>
          <Value label={t.creditCards.pay.remainingStatement} value={details.latestStatement ? money(details.latestStatement.remainingStatement) : t.creditCards.pay.noStatement} />
          <Text style={[styles.help, { color: theme.mutedText }]}>{t.creditCards.pay.remainingStatementHelp}</Text>
        </View>

        <Field label={t.creditCards.pay.sourceAccountStep}>
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
          {sources.length === 0 ? <Text style={[styles.help, { color: theme.destructive }]}>{t.creditCards.pay.noSources}</Text> : null}
        </Field>

        <Field label={t.creditCards.pay.paymentOptionStep}>
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
          <Field label={t.creditCards.pay.otherAmount(cardCurrency)}>
            <TextInput
              accessibilityLabel={t.creditCards.pay.otherAmountAccessibility(currencyName(cardCurrency))}
              keyboardType={getCurrency(cardCurrency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
              onBlur={() => setCustomAmountTouched(true)}
              onChangeText={(value) => {
                setAmountDigits(sanitizeAmountEntry(value, cardCurrency));
                setCustomAmountTouched(true);
                setPreview(undefined);
              }}
              placeholder={t.creditCards.pay.enterAmount}
              placeholderTextColor={theme.mutedText}
              style={[styles.input, styles.amountInput, { backgroundColor: theme.surface, borderColor: customAmountError ? theme.destructive : theme.hairline, color: theme.primaryText }]}
              value={formatMoneyEntry(amountDigits, cardCurrency)}
            />
            {customAmountError ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.destructive }]}>{customAmountError}</Text> : null}
          </Field>
        ) : null}

        {crossCurrency ? (
          <Field label={t.creditCards.pay.sourceAmount(sourceCurrency)}>
            <TextInput
              accessibilityLabel={t.creditCards.pay.sourceAmountAccessibility(currencyName(sourceCurrency))}
              keyboardType={getCurrency(sourceCurrency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
              onChangeText={(value) => {
                setSourceAmountDigits(sanitizeAmountEntry(value, sourceCurrency));
                setPreview(undefined);
              }}
              placeholder={t.creditCards.pay.sourceAmountPlaceholder}
              placeholderTextColor={theme.mutedText}
              style={[styles.input, styles.amountInput, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]}
              value={formatMoneyEntry(sourceAmountDigits, sourceCurrency)}
            />
            <Text style={[styles.help, { color: theme.mutedText }]}>
              {t.creditCards.pay.conversionHelp(sourceCurrency, cardCurrency)}
            </Text>
          </Field>
        ) : null}

        <DateField label={t.creditCards.pay.paymentDateStep} onChange={setDate} value={date} />
        <Field label={t.creditCards.pay.note}>
          <TextInput
            accessibilityLabel={t.creditCards.pay.noteAccessibility}
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder={t.creditCards.pay.notePlaceholder}
            placeholderTextColor={theme.mutedText}
            style={[styles.input, styles.note, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]}
            value={note}
          />
        </Field>

        <Field label={t.creditCards.pay.reviewStep}>
          {preview ? (
            <View style={[styles.review, { backgroundColor: preview.overpaymentAmount > 0 ? theme.tintWarning : theme.surface }]}>
              <Value label={t.creditCards.pay.sourceAccount} value={preview.sourceAccountName} />
              <Value label={t.creditCards.pay.sourceAvailableBalance} value={`${formatMoneyWithSymbol(preview.sourceBalance, preview.sourceCurrency)} ${preview.sourceCurrency}`} />
              <Value label={t.creditCards.pay.selectedOption} value={preview.optionLabel} />
              <Value label={preview.crossCurrency ? t.creditCards.pay.amountCredited : t.creditCards.pay.paymentAmount} value={money(preview.amount)} />
              {preview.crossCurrency ? (
                <Value label={t.creditCards.pay.amountSent} value={`${formatMoneyWithSymbol(preview.sourceAmount, preview.sourceCurrency)} ${preview.sourceCurrency}`} />
              ) : null}
              <Value label={t.creditCards.pay.currentDebt} value={money(preview.currentDebt)} />
              <Value label={t.creditCards.pay.remainingStatement} value={details.latestStatement ? money(preview.statementRemaining) : t.creditCards.pay.noStatement} />
              <Value label={t.creditCards.pay.expectedDebt} value={money(preview.expectedDebt)} />
              <Value label={t.creditCards.pay.expectedStatementRemaining} value={details.latestStatement ? money(preview.expectedStatementRemaining) : t.creditCards.pay.noStatement} />
              <Value label={t.creditCards.pay.paymentDate} value={date} />
              {preview.amountBeyondStatement > 0 && preview.overpaymentAmount === 0 ? (
                <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>{t.creditCards.pay.beyondStatement}</Text>
              ) : null}
              {preview.expectedStatementRemaining > 0 && preview.expectedStatementRemaining < preview.statementRemaining ? (
                <Text style={[styles.help, { color: theme.secondaryText }]}>{t.creditCards.pay.partialStatement(money(preview.expectedStatementRemaining))}</Text>
              ) : null}
              {preview.overpaymentAmount > 0 ? (
                <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.warning }]}>{t.creditCards.overpayment(money(preview.overpaymentAmount))}</Text>
              ) : null}
            </View>
          ) : <Text style={[styles.help, { color: theme.mutedText }]}>{t.creditCards.pay.reviewPlaceholder}</Text>}
          {serviceError ? <Text accessibilityLiveRegion="assertive" style={[styles.help, { color: theme.destructive }]}>{serviceError}</Text> : null}
        </Field>

        <Button
          accessibilityLabel={t.creditCards.pay.confirmAccessibility}
          busy={saving}
          disabled={!preview}
          fullWidth
          label={t.creditCards.pay.confirm}
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
  const t = useMessages();
  const detail = value.amount !== null
    ? formatMoneyWithSymbol(value.amount, currency)
    : value.unavailableReason ?? t.creditCards.pay.customAmount;
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
  bodyStrong: { ...typography.bodyStrong },
  help: { ...typography.caption },
});
