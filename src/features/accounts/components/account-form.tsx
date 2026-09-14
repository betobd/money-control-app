import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { useRouter } from 'expo-router';
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

import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { accountTypeLabels } from '@/features/accounts/account-format';
import { AccountValidationError } from '@/features/accounts/account.service';
import { accountService } from '@/features/accounts/accounts';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import { accountTypes, type AccountField, type AccountType, type AccountValidationErrors } from '@/features/accounts/account.types';
import { CurrencyPicker } from '@/features/currency/components/currency-picker';
import { getBaseCurrency } from '@/features/settings/settings';
import {
  currencyName,
  formatMoneyEntry,
  getCurrency,
  parseMoney,
  sanitizeMoneyEntry,
  type CurrencyCode,
} from '@/features/currency/currency';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { getMessages } from '@/i18n/messages';
import { ScreenHeader } from '@/components/screen-header';
import { FixedFooter } from '@/components/fixed-footer';

/** Sanitizes raw input for the given currency: digits, optional dot (for USD), optional sign. */
function sanitizeMoneyInput(value: string, currency: CurrencyCode, allowNegative: boolean): string {
  return sanitizeMoneyEntry(value, currency, { allowNegative });
}

/** Formats a stored minor-unit magnitude for editing (no grouping). */
function editStringFromMinor(minorMagnitude: number, currency: CurrencyCode): string {
  const definition = getCurrency(currency);
  if (definition.fractionDigits === 0) return String(minorMagnitude);
  const whole = Math.trunc(minorMagnitude / definition.minorUnitFactor);
  const fraction = minorMagnitude % definition.minorUnitFactor;
  return `${whole}.${String(fraction).padStart(definition.fractionDigits, '0')}`;
}

export function AccountForm({ accountId }: { accountId?: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useAppTheme();
  const t = useMessages();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [currency, setCurrency] = useState<CurrencyCode>(getBaseCurrency);
  const [currencyPickerOpen, setCurrencyPickerOpen] = useState(false);
  const [currencyEditable, setCurrencyEditable] = useState(true);
  const [openingBalance, setOpeningBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [statementClosingDay, setStatementClosingDay] = useState('');
  const [paymentDueDay, setPaymentDueDay] = useState('');
  const [errors, setErrors] = useState<AccountValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(accountId));
  const [saving, setSaving] = useState(false);
  const [openingBalanceEditable, setOpeningBalanceEditable] = useState(true);
  const isEditing = Boolean(accountId);

  useEffect(() => {
    if (!accountId) return;
    Promise.all([
      accountService.get(accountId),
      accountService.canEditOpeningBalance(accountId),
      accountService.canChangeCurrency(accountId),
    ])
      .then(([account, canEdit, canChangeCurrency]) => {
        if (!account) throw new Error(getMessages().accounts.errors.notFound);
        setName(account.name);
        setType(account.type);
        setCurrency(account.currency);
        setCurrencyEditable(canChangeCurrency);
        const openingMagnitude = account.type === 'credit_card' ? Math.abs(account.openingBalance) : account.openingBalance;
        setOpeningBalance(editStringFromMinor(openingMagnitude, account.currency));
        setCreditLimit(account.creditLimit === null ? '' : editStringFromMinor(account.creditLimit, account.currency));
        setStatementClosingDay(account.statementClosingDay === null ? '' : String(account.statementClosingDay));
        setPaymentDueDay(account.paymentDueDay === null ? '' : String(account.paymentDueDay));
        setOpeningBalanceEditable(canEdit);
      })
      .catch((cause) => setGeneralError(toUserMessage(cause, getMessages().accounts.errors.load)))
      .finally(() => setLoading(false));
  }, [accountId]);

  function clearError(field: AccountField) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const fieldErrors: AccountValidationErrors = {};
      const openingParsed = parseMoney(openingBalance.trim() || '0', currency, { allowNegative: true });
      if (!openingParsed.ok) {
        fieldErrors.openingBalance = t.accounts.validation.enterValidAmount;
      }
      let creditLimitMinor: number | null = null;
      if (type === 'credit_card' && creditLimit.trim()) {
        const creditParsed = parseMoney(creditLimit, currency);
        if (!creditParsed.ok) fieldErrors.creditLimit = t.accounts.validation.enterValidAmount;
        else creditLimitMinor = creditParsed.minor;
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        setSaving(false);
        return;
      }
      const input = {
        name,
        type,
        currency,
        openingBalance: openingParsed.ok ? openingParsed.minor : 0,
        creditLimit: creditLimitMinor,
        statementClosingDay: type === 'credit_card' && statementClosingDay.trim() ? Number(statementClosingDay) : null,
        paymentDueDay: type === 'credit_card' && paymentDueDay.trim() ? Number(paymentDueDay) : null,
      };
      if (accountId) await accountService.update(accountId, input);
      else await accountService.create(input);
      router.back();
    } catch (cause) {
      if (cause instanceof AccountValidationError) setErrors(cause.fields);
      else setGeneralError(toUserMessage(cause, t.accounts.errors.save));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  }

  const inputStyle = (invalid: boolean, editable = true) => [
    styles.input,
    {
      backgroundColor: editable ? theme.surface : theme.disabledSurface,
      borderColor: invalid ? theme.destructive : theme.hairline,
      color: editable ? theme.primaryText : theme.disabledText,
    },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel={t.accounts.form.close} title={isEditing ? t.accounts.form.editTitle : t.accounts.form.newTitle} />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled">
        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
            {generalError}
          </Text>
        ) : null}
        <FormField label={t.accounts.form.name} error={errors.name} theme={theme}>
          <TextInput
            accessibilityLabel={t.accounts.form.name}
            autoCapitalize="words"
            maxLength={80}
            onChangeText={(value) => { setName(value); clearError('name'); }}
            placeholder={t.accounts.form.namePlaceholder}
            placeholderTextColor={theme.mutedText}
            style={inputStyle(Boolean(errors.name))}
            value={name}
          />
        </FormField>

        <FormField label={t.accounts.form.type} error={errors.type} theme={theme}>
          <View style={styles.typeGrid}>
            {accountTypes.map((option) => {
              const selected = type === option;
              return (
                <Pressable
                  accessibilityLabel={accountTypeLabels[option]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => { setType(option); clearError('type'); clearError('creditLimit'); }}
                  style={[
                    styles.typeCard,
                    {
                      backgroundColor: selected ? theme.tintPrimary : theme.surface,
                      borderColor: selected ? theme.primaryAction : 'transparent',
                    },
                  ]}>
                  <AccountTypeIcon kind={option} size={40} />
                  <Text
                    numberOfLines={2}
                    style={[styles.typeText, { color: selected ? theme.primaryText : theme.secondaryText }]}>
                    {accountTypeLabels[option]}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>

        <FormField label={t.accounts.form.currency} error={errors.currency} theme={theme}>
          {currencyEditable ? (
            <Pressable
              accessibilityLabel={t.accounts.form.currencyAccessibility(currency, currencyName(currency))}
              accessibilityRole="button"
              onPress={() => setCurrencyPickerOpen(true)}
              style={[styles.readOnly, { backgroundColor: theme.surface }]}>
              <Text style={[styles.inputText, { color: theme.primaryText }]}>
                {currency} · {currencyName(currency)}
              </Text>
            </Pressable>
          ) : (
            <View style={[styles.readOnly, { backgroundColor: theme.disabledSurface }]}>
              <Text style={[styles.inputText, { color: theme.secondaryText }]}>{currency} · {currencyName(currency)}</Text>
            </View>
          )}
          {!currencyEditable && isEditing ? (
            <Text style={[styles.help, { color: theme.secondaryText }]}>{t.accounts.validation.currencyLocked}</Text>
          ) : null}
        </FormField>

        <FormField label={t.accounts.form.openingBalance(currency)} error={errors.openingBalance} theme={theme}>
          <TextInput
            accessibilityLabel={t.accounts.form.openingBalanceIn(currencyName(currency))}
            editable={openingBalanceEditable}
            keyboardType={getCurrency(currency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
            onChangeText={(value) => { setOpeningBalance(sanitizeMoneyInput(value, currency, true)); clearError('openingBalance'); }}
            placeholder={getCurrency(currency).fractionDigits > 0 ? '0.00' : '0'}
            placeholderTextColor={theme.mutedText}
            style={[styles.moneyInput, inputStyle(Boolean(errors.openingBalance), openingBalanceEditable)]}
            value={formatMoneyEntry(openingBalance, currency)}
          />
          {!openingBalanceEditable ? <Text style={[styles.help, { color: theme.secondaryText }]}>{t.accounts.form.openingBalanceLockedHelp}</Text> : null}
        </FormField>

        {type === 'credit_card' ? (
          <FormField label={t.accounts.form.creditLimit(currency)} error={errors.creditLimit} theme={theme}>
            <TextInput
              accessibilityLabel={t.accounts.form.creditLimitIn(currencyName(currency))}
              keyboardType={getCurrency(currency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
              onChangeText={(value) => { setCreditLimit(sanitizeMoneyInput(value, currency, false)); clearError('creditLimit'); }}
              placeholder={getCurrency(currency).fractionDigits > 0 ? '0.00' : '0'}
              placeholderTextColor={theme.mutedText}
              style={[styles.moneyInput, inputStyle(Boolean(errors.creditLimit))]}
              value={formatMoneyEntry(creditLimit, currency)}
            />
            <Text style={[styles.help, { color: theme.secondaryText }]}>{t.accounts.form.creditLimitHelp}</Text>
          </FormField>
        ) : null}

        {type === 'credit_card' ? (
          <FormField label={t.accounts.form.closingDay} error={errors.statementClosingDay} theme={theme}>
            <TextInput
              accessibilityLabel={t.accounts.form.closingDayAccessibility}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(value) => { setStatementClosingDay(value.replace(/\D/g, '')); clearError('statementClosingDay'); }}
              placeholder="1–31"
              placeholderTextColor={theme.mutedText}
              style={inputStyle(Boolean(errors.statementClosingDay))}
              value={statementClosingDay}
            />
            <Text style={[styles.help, { color: theme.secondaryText }]}>{t.accounts.form.closingDayHelp}</Text>
          </FormField>
        ) : null}

        {type === 'credit_card' ? (
          <FormField label={t.accounts.form.dueDay} error={errors.paymentDueDay} theme={theme}>
            <TextInput
              accessibilityLabel={t.accounts.form.dueDayAccessibility}
              keyboardType="number-pad"
              maxLength={2}
              onChangeText={(value) => { setPaymentDueDay(value.replace(/\D/g, '')); clearError('paymentDueDay'); }}
              placeholder="1–31"
              placeholderTextColor={theme.mutedText}
              style={inputStyle(Boolean(errors.paymentDueDay))}
              value={paymentDueDay}
            />
            <Text style={[styles.help, { color: theme.secondaryText }]}>{t.accounts.form.dueDayHelp}</Text>
          </FormField>
        ) : null}
      </ScrollView>

      <FixedFooter bottomInset={insets.bottom}>
        <Button
          accessibilityLabel={isEditing ? t.accounts.form.saveChangesAccessibility : t.accounts.form.create}
          busy={saving}
          fullWidth
          label={isEditing ? t.accounts.form.saveChanges : t.accounts.form.create}
          onPress={() => void save()}
          size="lg"
          variant="primary"
        />
      </FixedFooter>
      <CurrencyPicker
        onClose={() => setCurrencyPickerOpen(false)}
        onSelect={(code) => { setCurrency(code); clearError('currency'); clearError('openingBalance'); clearError('creditLimit'); }}
        selected={currency}
        suggested={[getBaseCurrency()]}
        title={t.accounts.form.currencyPickerTitle}
        visible={currencyPickerOpen}
      />
    </KeyboardAvoidingView>
  );
}

type Theme = ReturnType<typeof useAppTheme>;
function FormField({ children, error, label, theme }: { children: React.ReactNode; error?: string; label: string; theme: Theme }) {
  return (
    <View style={styles.field}>
      <Overline color={theme.mutedText}>{label}</Overline>
      {children}
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  field: { gap: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  moneyInput: { fontFamily: fonts.mono.medium },
  inputText: { ...typography.body },
  readOnly: { borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.md },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeCard: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    borderWidth: borderWidths.thin,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 68,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  typeText: { ...typography.caption, flexShrink: 1, fontFamily: fonts.sans.bold, fontWeight: '700' },
  error: { ...typography.caption },
  help: { ...typography.caption },
});
