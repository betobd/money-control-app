import { router } from 'expo-router';
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

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { CreditCardStatementValidationError } from '../credit-card-statement.service';
import { creditCardService, creditCardStatementService } from '../credit-cards';
import type {
  CreditCardStatementDefaults,
  CreditCardStatementErrors,
} from '../credit-card.types';

function money(value: string): number {
  return /^\d+$/.test(value) ? Number(value) : Number.NaN;
}

export function UpdateStatementScreen({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [dates, setDates] = useState<CreditCardStatementDefaults>();
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
      setDates(latest?.closingDate === defaults.closingDate ? latest : defaults);
      setStatementBalance(latest?.closingDate === defaults.closingDate ? String(latest.statementBalance) : '');
      setMinimumPayment(latest?.closingDate === defaults.closingDate ? String(latest.minimumPayment) : '');
    }, (cause: unknown) => {
      setGeneralError(cause instanceof Error ? cause.message : 'Unable to prepare statement.');
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
    const digits = text.replace(/\D/g, '');
    if (field === 'statementBalance') setStatementBalance(digits);
    else setMinimumPayment(digits);
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
      await creditCardStatementService.save({
        ...dates,
        statementBalance: money(statementBalance),
        minimumPayment: money(minimumPayment),
      });
      router.back();
    } catch (cause) {
      if (cause instanceof CreditCardStatementValidationError) setErrors(cause.fields);
      else setGeneralError(cause instanceof Error ? cause.message : 'Unable to update statement.');
      setSaving(false);
    }
  }

  if (!dates) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground }]}>
        {generalError
          ? <Text style={[styles.body, { color: theme.destructive }]}>{generalError}</Text>
          : <ActivityIndicator color={theme.primaryAction} size="large" />}
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}
    >
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
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
        <MoneyField error={errors.statementBalance} label="Statement balance" onChange={(text) => changeMoney('statementBalance', text)} value={statementBalance} />
        <Text style={[styles.help, { color: theme.mutedText }]}>The amount billed on the latest statement from your bank. Enter 0 only for an actual zero-balance statement.</Text>
        <MoneyField error={errors.minimumPayment} label="Minimum payment" onChange={(text) => changeMoney('minimumPayment', text)} value={minimumPayment} />
        <Text style={[styles.help, { color: theme.mutedText }]}>The minimum shown by your bank. Money Control does not calculate this value; enter 0 only when no minimum is due.</Text>
        <DateField error={errors.periodStart} label="Statement period start" onChange={(text) => changeDate('periodStart', text)} value={dates.periodStart} />
        <DateField error={errors.periodEnd} label="Statement period end" onChange={(text) => changeDate('periodEnd', text)} value={dates.periodEnd} />
        <DateField error={errors.closingDate} label="Closing date" onChange={(text) => changeDate('closingDate', text)} value={dates.closingDate} />
        <DateField error={errors.dueDate} label="Due date" onChange={(text) => changeDate('dueDate', text)} value={dates.dueDate} />
        <Text style={[styles.help, { color: theme.mutedText }]}>Dates default from the configured cycle. Closing normally matches period end, but all dates may be corrected to match the bank statement.</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: saving ? theme.disabledSurface : theme.primaryAction }]}
        >
          {saving
            ? <ActivityIndicator color={theme.disabledText} />
            : <Text style={[styles.strong, { color: theme.onPrimaryAction }]}>Save statement</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function MoneyField({ error, label, onChange, value }: { error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <Field error={error} label={label}><Input accessibilityLabel={`${label} in whole Colombian pesos`} keyboardType="number-pad" onChangeText={onChange} placeholder="Enter amount" value={value} /></Field>;
}

function DateField({ error, label, onChange, value }: { error?: string; label: string; onChange: (value: string) => void; value: string }) {
  return <Field error={error} label={label}><Input accessibilityLabel={`${label} in YYYY-MM-DD`} autoCapitalize="none" maxLength={10} onChangeText={onChange} value={value} /></Field>;
}

function Field({ children, error, label }: { children: React.ReactNode; error?: string; label: string }) {
  const theme = useAppTheme();
  return <View style={styles.field}><Text style={[styles.strong, { color: theme.primaryText }]}>{label}</Text>{children}{error ? <Text accessibilityLiveRegion="polite" style={[styles.help, { color: theme.destructive }]}>{error}</Text> : null}</View>;
}

function Input(props: React.ComponentProps<typeof TextInput>) {
  const theme = useAppTheme();
  return <TextInput {...props} placeholderTextColor={theme.mutedText} style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.border, color: theme.primaryText }]} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, justifyContent: 'center', padding: spacing.lg },
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.md, padding: spacing.md },
  field: { gap: spacing.sm, marginTop: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 52, paddingHorizontal: spacing.md },
  save: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 54, marginTop: spacing.md },
  body: { ...typography.body },
  strong: { ...typography.body, fontWeight: '700' },
  help: { ...typography.caption },
});
