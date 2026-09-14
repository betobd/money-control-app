import { router } from 'expo-router';
import { getBaseCurrency } from '@/features/settings/settings';
import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { DateField } from '@/components/date-field';
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { currencyName, formatMoneyEntry, getCurrency, parseMoney, type CurrencyCode } from '@/features/currency/currency';
import { sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { getMessages } from '@/i18n/messages';
import { CreditCardStatementValidationError } from '../credit-card-statement.service';
import { creditCardService, creditCardStatementService } from '../credit-cards';
import type {
  CreditCardStatementDefaults,
  CreditCardStatementErrors,
} from '../credit-card.types';
import { ScreenHeader } from '@/components/screen-header';

function editStringFromMinor(minor: number, currency: CurrencyCode): string {
  const definition = getCurrency(currency);
  if (definition.fractionDigits === 0) return String(minor);
  return `${Math.trunc(minor / definition.minorUnitFactor)}.${String(minor % definition.minorUnitFactor).padStart(definition.fractionDigits, '0')}`;
}

export function UpdateStatementScreen({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const [dates, setDates] = useState<CreditCardStatementDefaults>();
  const [cardCurrency, setCardCurrency] = useState<CurrencyCode>(getBaseCurrency);
  const [statementBalance, setStatementBalance] = useState('');
  const [minimumPayment, setMinimumPayment] = useState('');
  const [errors, setErrors] = useState<CreditCardStatementErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void Promise.all([
      creditCardStatementService.defaults(accountId, bogotaToday()),
      creditCardService.getDetails(accountId),
    ]).then(([defaults, details]) => {
      const latest = details?.latestStatement;
      const currency = details?.account.currency ?? getBaseCurrency();
      setCardCurrency(currency);
      setDates(latest?.closingDate === defaults.closingDate ? latest : defaults);
      setStatementBalance(latest?.closingDate === defaults.closingDate ? editStringFromMinor(latest.statementBalance, currency) : '');
      setMinimumPayment(latest?.closingDate === defaults.closingDate ? editStringFromMinor(latest.minimumPayment, currency) : '');
    }, (cause: unknown) => {
      setGeneralError(toUserMessage(cause, getMessages().creditCards.errors.prepareStatement));
    });
  }, [accountId]);

  function changeDate(
    field: 'periodStart' | 'periodEnd' | 'closingDate' | 'dueDate',
    text: string,
  ) {
    setDates((current) => current ? { ...current, [field]: text } : current);
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function changeMoney(field: 'statementBalance' | 'minimumPayment', text: string) {
    const cleaned = sanitizeAmountEntry(text, cardCurrency);
    if (field === 'statementBalance') setStatementBalance(cleaned);
    else setMinimumPayment(cleaned);
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    if (!dates || saving) return;
    const requiredErrors: CreditCardStatementErrors = {};
    if (!statementBalance) requiredErrors.statementBalance = t.creditCards.validation.statementBalanceRequired;
    if (!minimumPayment) requiredErrors.minimumPayment = t.creditCards.validation.minimumPaymentRequired;
    if (Object.keys(requiredErrors).length) {
      setErrors(requiredErrors);
      return;
    }

    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const parsedBalance = parseMoney(statementBalance || '0', cardCurrency);
      const parsedMinimum = parseMoney(minimumPayment || '0', cardCurrency);
      if (!parsedBalance.ok || !parsedMinimum.ok) {
        setErrors({
          statementBalance: parsedBalance.ok ? undefined : t.creditCards.validation.enterValidAmount,
          minimumPayment: parsedMinimum.ok ? undefined : t.creditCards.validation.enterValidAmount,
        });
        setSaving(false);
        return;
      }
      await creditCardStatementService.save({
        ...dates,
        statementBalance: parsedBalance.minor,
        minimumPayment: parsedMinimum.minor,
      });
      router.back();
    } catch (cause) {
      if (cause instanceof CreditCardStatementValidationError) setErrors(cause.fields);
      else setGeneralError(toUserMessage(cause, t.creditCards.errors.updateStatement));
      setSaving(false);
    }
  }

  if (!dates) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground }]}>
        {generalError ? (
          <>
            <Text style={[styles.body, { color: theme.destructive }]}>{generalError}</Text>
            <Button label={t.creditCards.statementForm.goBack} onPress={() => router.back()} />
          </>
        ) : (
          <ActivityIndicator color={theme.primaryAction} size="large" />
        )}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}
    >
      <ScreenHeader leading="close" leadingAccessibilityLabel={t.creditCards.statementForm.close} title={t.creditCards.statementForm.title} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.body, { color: theme.secondaryText }]}>
          {t.creditCards.statementForm.intro}
        </Text>
        {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.help, { color: theme.destructive }]}>{generalError}</Text> : null}
        <MoneyField currency={cardCurrency} error={errors.statementBalance} label={t.creditCards.statementForm.statementBalance} onChange={(text) => changeMoney('statementBalance', text)} value={statementBalance} />
        <Text style={[styles.help, { color: theme.mutedText }]}>{t.creditCards.statementForm.statementBalanceHelp}</Text>
        <MoneyField currency={cardCurrency} error={errors.minimumPayment} label={t.creditCards.statementForm.minimumPayment} onChange={(text) => changeMoney('minimumPayment', text)} value={minimumPayment} />
        <Text style={[styles.help, { color: theme.mutedText }]}>{t.creditCards.statementForm.minimumPaymentHelp}</Text>
        <DateField error={errors.periodStart} label={t.creditCards.statementForm.periodStart} onChange={(text) => changeDate('periodStart', text)} value={dates.periodStart} />
        <DateField error={errors.periodEnd} label={t.creditCards.statementForm.periodEnd} onChange={(text) => changeDate('periodEnd', text)} value={dates.periodEnd} />
        <DateField error={errors.closingDate} label={t.creditCards.statementForm.closingDate} onChange={(text) => changeDate('closingDate', text)} value={dates.closingDate} />
        <DateField error={errors.dueDate} label={t.creditCards.statementForm.dueDate} onChange={(text) => changeDate('dueDate', text)} value={dates.dueDate} />
        <Text style={[styles.help, { color: theme.mutedText }]}>{t.creditCards.statementForm.datesHelp}</Text>
        <Button busy={saving} fullWidth label={t.creditCards.statementForm.save} onPress={() => void save()} size="lg" variant="primary" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyField({ currency, error, label, onChange, value }: { currency: CurrencyCode; error?: string; label: string; onChange: (value: string) => void; value: string }) {
  const t = useMessages();
  return <Field error={error} label={label}><Input accessibilityLabel={t.creditCards.statementForm.amountIn(label, currencyName(currency))} invalid={Boolean(error)} keyboardType={getCurrency(currency).fractionDigits === 0 ? 'number-pad' : 'decimal-pad'} onChangeText={onChange} placeholder={t.creditCards.statementForm.enterAmount} style={styles.amountInput} value={formatMoneyEntry(value, currency)} /></Field>;
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  const theme = useAppTheme();
  return <View style={styles.field}><Overline color={theme.mutedText}>{label}</Overline>{children}{error ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.destructive }]}>{error}</Text> : null}</View>;
}

function Input({ invalid, style, ...props }: React.ComponentProps<typeof TextInput> & { invalid?: boolean }) {
  const theme = useAppTheme();
  return <TextInput {...props} placeholderTextColor={theme.mutedText} style={[styles.input, { backgroundColor: theme.surface, borderColor: invalid ? theme.destructive : theme.hairline, color: theme.primaryText }, style]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  retry: { borderRadius: borderRadii.md, minHeight: 44, justifyContent: 'center', paddingHorizontal: spacing.lg },
  bodyStrong: { ...typography.bodyStrong },
  content: { gap: spacing.md, padding: spacing.md },
  field: { gap: spacing.sm, marginTop: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  amountInput: { fontFamily: fonts.mono.medium },
  body: { ...typography.body },
  strong: { ...typography.bodyStrong },
  help: { ...typography.caption },
});
