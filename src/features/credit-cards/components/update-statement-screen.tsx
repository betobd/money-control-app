import { router } from 'expo-router';
import { getBaseCurrency } from '@/features/settings/settings';
import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
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

import { DateField } from '@/components/date-field';
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { formatMoneyEntry, getCurrency, parseMoney, type CurrencyCode } from '@/features/currency/currency';
import { sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { CreditCardStatementValidationError } from '../credit-card-statement.service';
import { creditCardService, creditCardStatementService } from '../credit-cards';
import type {
  CreditCardStatementDefaults,
  CreditCardStatementErrors,
} from '../credit-card.types';

function editStringFromMinor(minor: number, currency: CurrencyCode): string {
  const definition = getCurrency(currency);
  if (definition.fractionDigits === 0) return String(minor);
  return `${Math.trunc(minor / definition.minorUnitFactor)}.${String(minor % definition.minorUnitFactor).padStart(definition.fractionDigits, '0')}`;
}

export function UpdateStatementScreen({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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
      setGeneralError(toUserMessage(cause, 'Unable to prepare statement.'));
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
    if (!statementBalance) requiredErrors.statementBalance = 'Statement balance is required.';
    if (!minimumPayment) requiredErrors.minimumPayment = 'Minimum payment is required.';
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
          statementBalance: parsedBalance.ok ? undefined : 'Enter a valid amount.',
          minimumPayment: parsedMinimum.ok ? undefined : 'Enter a valid amount.',
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
      else setGeneralError(toUserMessage(cause, 'Unable to update statement.'));
      setSaving(false);
    }
  }

  if (!dates) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground }]}>
        {generalError ? (
          <>
            <Text style={[styles.body, { color: theme.destructive }]}>{generalError}</Text>
            <Button label="Go back" onPress={() => router.back()} />
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
      <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
        <Pressable accessibilityLabel="Close statement form" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Update statement</Text>
        <View style={styles.headerButton} />
      </View>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.body, { color: theme.secondaryText }]}>
          Copy these values from your latest bank statement. Updating a statement does not create a transaction or change your card balance.
        </Text>
        {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.help, { color: theme.destructive }]}>{generalError}</Text> : null}
        <MoneyField currency={cardCurrency} error={errors.statementBalance} label="Statement balance" onChange={(text) => changeMoney('statementBalance', text)} value={statementBalance} />
        <Text style={[styles.help, { color: theme.mutedText }]}>The amount billed on the latest statement from your bank. Enter 0 only for an actual zero-balance statement.</Text>
        <MoneyField currency={cardCurrency} error={errors.minimumPayment} label="Minimum payment" onChange={(text) => changeMoney('minimumPayment', text)} value={minimumPayment} />
        <Text style={[styles.help, { color: theme.mutedText }]}>The minimum shown by your bank. Money Control does not calculate this value; enter 0 only when no minimum is due.</Text>
        <DateField error={errors.periodStart} label="Statement period start" onChange={(text) => changeDate('periodStart', text)} value={dates.periodStart} />
        <DateField error={errors.periodEnd} label="Statement period end" onChange={(text) => changeDate('periodEnd', text)} value={dates.periodEnd} />
        <DateField error={errors.closingDate} label="Closing date" onChange={(text) => changeDate('closingDate', text)} value={dates.closingDate} />
        <DateField error={errors.dueDate} label="Due date" onChange={(text) => changeDate('dueDate', text)} value={dates.dueDate} />
        <Text style={[styles.help, { color: theme.mutedText }]}>Dates default from the configured cycle. Closing normally matches period end, but all dates may be corrected to match the bank statement.</Text>
        <Button busy={saving} fullWidth label="Save statement" onPress={() => void save()} size="lg" variant="primary" />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyField({ currency, error, label, onChange, value }: { currency: CurrencyCode; error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <Field error={error} label={label}><Input accessibilityLabel={`${label} in ${getCurrency(currency).name}`} invalid={Boolean(error)} keyboardType={getCurrency(currency).fractionDigits === 0 ? 'number-pad' : 'decimal-pad'} onChangeText={onChange} placeholder="Enter amount" style={styles.amountInput} value={formatMoneyEntry(value, currency)} /></Field>;
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
  bodyStrong: { ...typography.body, fontWeight: '700' },
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.md, padding: spacing.md },
  field: { gap: spacing.sm, marginTop: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  amountInput: { fontFamily: fonts.mono.medium },
  body: { ...typography.body },
  strong: { ...typography.body, fontWeight: '700' },
  help: { ...typography.caption },
});
