import { router } from 'expo-router';
import { toUserMessage } from '@/errors/user-error';
import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
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
import { useAccounts } from '@/features/accounts/use-accounts';
import {
  convertCopMinorToUsdMinor,
  convertUsdMinorToCopMinor,
  deriveCrossCurrencyRate,
  formatExchangeRate,
  parseMoney,
  type CurrencyCode,
  type ScaledRate,
} from '@/features/currency/currency';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput, sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid } from '@/features/add-transaction/components/category-grid';
import { FixedSaveBar } from '@/features/add-transaction/components/fixed-save-bar';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { SuccessToast } from '@/features/add-transaction/components/success-toast';
import { TransactionTypeSelector } from '@/features/add-transaction/components/transaction-type-selector';
import { TransferAccountFields } from '@/features/add-transaction/components/transfer-account-fields';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useCategories } from '@/features/categories/use-categories';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { TransactionValidationError } from '@/features/transactions/transaction.service';
import { transactionService } from '@/features/transactions/transactions';
import type { ExchangeRateSnapshotInput, TransactionValidationErrors } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountPickerField = 'account' | 'source' | 'destination' | null;

export default function AddTransactionModal() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [type, setType] = useState<TransactionFormType>('expense');
  const [amountDigits, setAmountDigits] = useState('');
  const [destinationAmountDigits, setDestinationAmountDigits] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>();
  const [selectedAccountId, setSelectedAccountId] = useState<string>();
  const [destinationAccountId, setDestinationAccountId] = useState<string>();
  const [transactionDate, setTransactionDate] = useState(bogotaToday);
  const [note, setNote] = useState('');
  const [accountPickerField, setAccountPickerField] = useState<AccountPickerField>(null);
  const [errors, setErrors] = useState<TransactionValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { accounts, rateStatus } = useAccounts();
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const expenseCategories = useCategories('expense', false).categories;
  const incomeCategories = useCategories('income', false).categories;
  const categories = type === 'income' ? incomeCategories : expenseCategories;
  const selectedAccount = activeAccounts.find((account) => account.id === selectedAccountId);
  const destinationAccount = activeAccounts.find((account) => account.id === destinationAccountId);
  const sourceCurrency: CurrencyCode = selectedAccount?.currency ?? 'COP';
  const destinationCurrency: CurrencyCode = destinationAccount?.currency ?? 'COP';
  const entryCurrency: CurrencyCode = type === 'transfer' ? sourceCurrency : sourceCurrency;
  const crossCurrency = type === 'transfer' && Boolean(selectedAccount) && Boolean(destinationAccount) && sourceCurrency !== destinationCurrency;
  const needsForeignRate = (type !== 'transfer' && sourceCurrency !== 'COP') || crossCurrency;
  const valuationRate: ScaledRate | null = rateStatus?.rate
    ? { rateScaled: rateStatus.rate.rateScaled, rateScale: rateStatus.rate.rateScale }
    : null;
  const effectiveCategoryId = categories.some((category) => category.id === selectedCategoryId)
    ? selectedCategoryId
    : categories[0]?.id;
  const pickerAccounts = accountPickerField === 'source'
    ? activeAccounts.filter((account) => account.id !== destinationAccountId)
    : accountPickerField === 'destination'
      ? activeAccounts.filter((account) => account.id !== selectedAccountId)
      : activeAccounts;

  useEffect(() => () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
  }, []);

  function changeType(next: TransactionFormType) {
    setType(next);
    setSelectedCategoryId(undefined);
    setErrors({});
    setGeneralError(undefined);
  }

  function selectAccount(id: string) {
    if (accountPickerField === 'destination') {
      setDestinationAccountId(id);
      setErrors((current) => ({ ...current, destinationAccountId: undefined }));
      return;
    }
    setSelectedAccountId(id);
    setErrors((current) => ({ ...current, accountId: undefined }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);

    try {
      const parsedSource = parseMoney(amountDigits || '0', sourceCurrency);
      if (!parsedSource.ok) {
        setErrors({ amount: 'Enter a valid amount greater than zero.' });
        setSaving(false);
        return;
      }
      const amount = parsedSource.minor;
      const common = {
        amount,
        accountId: selectedAccountId ?? '',
        transactionDate,
        note,
      };

      if (type === 'transfer') {
        let destinationAmountMinor: number | undefined;
        let exchangeRate: ExchangeRateSnapshotInput | null = null;
        if (crossCurrency) {
          const parsedDestination = parseMoney(destinationAmountDigits || '0', destinationCurrency);
          if (!parsedDestination.ok || parsedDestination.minor <= 0) {
            setErrors({ destinationAmount: 'Enter both the amount sent and the amount received.' });
            setSaving(false);
            return;
          }
          destinationAmountMinor = parsedDestination.minor;
          // The effective rate is derived from the actual amounts (authoritative).
          const copMinor = sourceCurrency === 'COP' ? amount : destinationAmountMinor;
          const usdMinor = sourceCurrency === 'USD' ? amount : destinationAmountMinor;
          const derived = deriveCrossCurrencyRate(copMinor, usdMinor);
          exchangeRate = {
            rateScaled: derived.rateScaled,
            rateScale: derived.rateScale,
            effectiveDate: transactionDate,
            source: 'transfer_effective',
          };
        }
        await transactionService.create({
          ...common,
          type: 'transfer',
          destinationAccountId: destinationAccountId ?? '',
          categoryId: null,
          destinationAmountMinor,
          exchangeRate,
        });
      } else {
        let exchangeRate: ExchangeRateSnapshotInput | null = null;
        if (sourceCurrency !== 'COP') {
          if (!rateStatus?.rate) {
            setErrors({ exchangeRate: 'Add an exchange rate before saving this USD transaction.' });
            setSaving(false);
            return;
          }
          exchangeRate = {
            rateScaled: rateStatus.rate.rateScaled,
            rateScale: rateStatus.rate.rateScale,
            effectiveDate: rateStatus.rate.effectiveDate,
            source: rateStatus.rate.source,
          };
        }
        await transactionService.create({
          ...common,
          type,
          categoryId: effectiveCategoryId ?? '',
          exchangeRate,
        });
      }
      setShowSuccess(true);
      closeTimer.current = setTimeout(() => router.back(), 650);
    } catch (cause) {
      if (cause instanceof TransactionValidationError) {
        setErrors(cause.fields);
      } else {
        setGeneralError(toUserMessage(cause, 'Unable to save transaction.'));
      }
      setSaving(false);
    }
  }

  function prefillDestination() {
    if (!valuationRate) return;
    const parsedSource = parseMoney(amountDigits || '0', sourceCurrency);
    if (!parsedSource.ok || parsedSource.minor <= 0) return;
    const destMinor = destinationCurrency === 'USD'
      ? convertCopMinorToUsdMinor(parsedSource.minor, valuationRate)
      : convertUsdMinorToCopMinor(parsedSource.minor, valuationRate);
    const text = destinationCurrency === 'USD'
      ? `${Math.trunc(destMinor / 100)}.${String(destMinor % 100).padStart(2, '0')}`
      : String(destMinor);
    setDestinationAmountDigits(text);
    setErrors((current) => ({ ...current, destinationAmount: undefined }));
  }

  const transferHelper = destinationAccount?.type === 'credit_card'
    ? 'This transfer reduces the card’s current debt.'
    : selectedAccount?.type === 'credit_card'
      ? 'This increases the card’s current debt or reduces a credit balance.'
      : undefined;
  const pickerTitle = accountPickerField === 'source'
    ? 'Select source account'
    : accountPickerField === 'destination'
      ? 'Select destination account'
      : 'Select account';
  const pickerSelectedId = accountPickerField === 'destination'
    ? destinationAccountId
    : selectedAccountId;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close Add Transaction"
          accessibilityRole="button"
          onPress={() => router.back()}
          style={styles.closeButton}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={24}
            tintColor={theme.primaryText}
          />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          Add Transaction
        </Text>
        <View style={styles.closeButton} />
      </View>

      <SuccessToast type={type} visible={showSuccess} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardArea}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <AmountInput
            currency={entryCurrency}
            digits={amountDigits}
            error={errors.amount}
            onDigitsChange={setAmountDigits}
            type={type}
          />
          <TransactionTypeSelector onChange={changeType} value={type} />

          {needsForeignRate ? (
            rateStatus?.rate ? (
              <Text style={[styles.rateNote, { color: rateStatus.freshness === 'stale' ? theme.warning : theme.secondaryText }]}>
                USD/COP reference rate COP {formatExchangeRate({ rateScaled: rateStatus.rate.rateScaled, rateScale: rateStatus.rate.rateScale })} · {rateStatus.freshness === 'stale' ? 'may be out of date' : `rate date ${rateStatus.rate.effectiveDate}`}. Your bank may use a different rate.
              </Text>
            ) : (
              <Text accessibilityLiveRegion="polite" style={[styles.rateWarning, { color: theme.destructive }]}>
                No exchange rate is available. Add a USD/COP rate in More → Currency & Rates before saving.
              </Text>
            )
          ) : null}
          {errors.exchangeRate ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{errors.exchangeRate}</Text>
          ) : null}

          {generalError ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {generalError}
            </Text>
          ) : null}

          {type === 'transfer' ? (
            <>
              <TransferAccountFields
                destination={destinationAccount?.name ?? 'Select account'}
                destinationError={errors.destinationAccountId}
                helperText={transferHelper}
                onSelectDestination={() => setAccountPickerField('destination')}
                onSelectSource={() => setAccountPickerField('source')}
                source={selectedAccount?.name ?? 'Select account'}
                sourceError={errors.accountId}
              />
              {crossCurrency ? (
                <View style={styles.field}>
                  <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>
                    Amount received ({destinationCurrency})
                  </Text>
                  <TextInput
                    accessibilityLabel={`Amount received in ${destinationCurrency}`}
                    keyboardType={destinationCurrency === 'COP' ? 'number-pad' : 'decimal-pad'}
                    onChangeText={(value) => {
                      setDestinationAmountDigits(sanitizeAmountEntry(value, destinationCurrency));
                      setErrors((current) => ({ ...current, destinationAmount: undefined }));
                    }}
                    placeholder={destinationCurrency === 'COP' ? '0' : '0.00'}
                    placeholderTextColor={theme.mutedText}
                    value={destinationAmountDigits}
                    style={[
                      styles.textInput,
                      {
                        backgroundColor: theme.surface,
                        borderColor: errors.destinationAmount ? theme.destructive : theme.hairline,
                        color: theme.primaryText,
                      },
                    ]}
                  />
                  {valuationRate ? (
                    <Pressable accessibilityRole="button" onPress={prefillDestination}>
                      <Text style={[styles.rateNote, { color: theme.primaryAction }]}>Estimate from reference rate</Text>
                    </Pressable>
                  ) : null}
                  {errors.destinationAmount ? (
                    <Text style={[styles.error, { color: theme.destructive }]}>{errors.destinationAmount}</Text>
                  ) : (
                    <Text style={[styles.rateNote, { color: theme.mutedText }]}>Enter the actual amount your bank credited. Both amounts are saved.</Text>
                  )}
                </View>
              ) : null}
            </>
          ) : (
            <>
              <CategoryGrid
                categories={categories}
                error={errors.categoryId}
                onSelect={setSelectedCategoryId}
                onViewAll={() => router.push({ pathname: '/categories', params: { type } })}
                selectedId={effectiveCategoryId}
                type={type}
              />
              {categories.length === 0 ? (
                <Pressable onPress={() => router.push({ pathname: '/categories', params: { type } })}>
                  <Text style={{ color: theme.primaryAction }}>Manage categories</Text>
                </Pressable>
              ) : null}
              <FormFieldButton
                error={errors.accountId}
                icon={{ ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
                label={type === 'income' ? 'Destination account' : 'Source account'}
                onPress={() => setAccountPickerField('account')}
                value={selectedAccount?.name ?? 'Select account'}
              />
            </>
          )}

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Transaction date</Text>
            <TextInput
              accessibilityLabel="Transaction date, YYYY-MM-DD"
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              onChangeText={setTransactionDate}
              value={transactionDate}
              style={[
                styles.textInput,
                {
                  backgroundColor: theme.surface,
                  borderColor: errors.transactionDate ? theme.destructive : theme.hairline,
                  color: theme.primaryText,
                },
              ]}
            />
            {errors.transactionDate ? (
              <Text style={[styles.error, { color: theme.destructive }]}>{errors.transactionDate}</Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Note (optional)</Text>
            <TextInput
              accessibilityLabel="Transaction note, optional"
              maxLength={200}
              multiline
              onChangeText={setNote}
              placeholder="Add a description…"
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
            <Text style={[styles.limit, { color: theme.mutedText }]}>{note.length}/200</Text>
          </View>
        </ScrollView>
        <FixedSaveBar
          bottomInset={insets.bottom}
          onPress={() => void save()}
          saving={saving}
          type={type}
        />
      </KeyboardAvoidingView>

      <AccountPicker
        accounts={pickerAccounts}
        onClose={() => setAccountPickerField(null)}
        onSelect={selectAccount}
        selectedId={pickerSelectedId}
        title={pickerTitle}
        visible={accountPickerField !== null}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  closeButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  keyboardArea: { flex: 1 },
  content: { gap: spacing.md, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.overline },
  textInput: {
    ...typography.body,
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  noteInput: {
    ...typography.body,
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    minHeight: 104,
    padding: spacing.md,
  },
  error: { ...typography.caption },
  rateNote: { ...typography.caption },
  rateWarning: { ...typography.caption },
  limit: { ...typography.label, textAlign: 'right' },
});
