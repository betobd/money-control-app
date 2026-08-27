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

import { DateField } from '@/components/date-field';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAccounts } from '@/features/accounts/use-accounts';
import {
  convertMinor,
  describeRate,
  deriveEffectiveRate,
  getCurrency,
  parseMoney,
  type CurrencyCode,
} from '@/features/currency/currency';
import { useBaseCurrency } from '@/features/settings/use-base-currency';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput, sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid, type CategorySelection } from '@/features/add-transaction/components/category-grid';
import { CategoryPicker } from '@/features/add-transaction/components/category-picker';
import { FixedSaveBar } from '@/features/add-transaction/components/fixed-save-bar';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { SuccessToast } from '@/features/add-transaction/components/success-toast';
import { TransactionTypeSelector } from '@/features/add-transaction/components/transaction-type-selector';
import { TransferAccountFields } from '@/features/add-transaction/components/transfer-account-fields';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useCategoryTree } from '@/features/categories/use-categories';
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
  const [selection, setSelection] = useState<CategorySelection | null>(null);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
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

  const { accounts, rates } = useAccounts();
  const baseCurrency = useBaseCurrency();
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const expenseTree = useCategoryTree('expense', false).tree;
  const incomeTree = useCategoryTree('income', false).tree;
  const tree = type === 'income' ? incomeTree : expenseTree;
  const selectedAccount = activeAccounts.find((account) => account.id === selectedAccountId);
  const destinationAccount = activeAccounts.find((account) => account.id === destinationAccountId);
  const sourceCurrency: CurrencyCode = selectedAccount?.currency ?? baseCurrency;
  const destinationCurrency: CurrencyCode = destinationAccount?.currency ?? baseCurrency;
  const entryCurrency: CurrencyCode = type === 'transfer' ? sourceCurrency : sourceCurrency;
  const crossCurrency = type === 'transfer' && Boolean(selectedAccount) && Boolean(destinationAccount) && sourceCurrency !== destinationCurrency;
  const needsForeignRate = (type !== 'transfer' && sourceCurrency !== baseCurrency) || crossCurrency;
  // The selection is re-resolved against the current tree on every render: a
  // category (or subcategory) archived elsewhere while this modal is open must
  // not stay silently selected. Falling back to the first category preserves the
  // existing behaviour of always having one chosen.
  const selectedCategory = tree.find((category) => category.id === selection?.categoryId);
  const effectiveSelection: CategorySelection | null = selectedCategory
    ? {
        categoryId: selectedCategory.id,
        subcategoryId: selectedCategory.subcategories.some((item) => item.id === selection?.subcategoryId)
          ? selection?.subcategoryId ?? null
          : null,
      }
    : tree[0]
      ? { categoryId: tree[0].id, subcategoryId: null }
      : null;
  // Which pair the note is about: for a transfer the source leg is what needs a
  // rate against the base, and for everything else it is the entry currency.
  const rateCurrency = crossCurrency && sourceCurrency === baseCurrency ? destinationCurrency : sourceCurrency;
  const rateSnapshot = rateCurrency === baseCurrency ? null : rates.snapshotFor(rateCurrency);
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
    setSelection(null);
    setErrors({});
    setGeneralError(undefined);
  }

  function selectCategory(next: CategorySelection) {
    setSelection(next);
    setErrors((current) => ({ ...current, categoryId: undefined, subcategoryId: undefined }));
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
          // The effective rate is derived from the actual amounts (authoritative),
          // and carries the pair it was derived for.
          const derived = deriveEffectiveRate(amount, sourceCurrency, destinationAmountMinor, destinationCurrency);
          exchangeRate = {
            rateScaled: derived.rateScaled,
            rateScale: derived.rateScale,
            baseCurrencyCode: derived.baseCurrencyCode,
            quoteCurrencyCode: derived.quoteCurrencyCode,
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
        if (sourceCurrency !== baseCurrency) {
          exchangeRate = rates.snapshotInputFor(sourceCurrency);
          if (!exchangeRate) {
            setErrors({
              exchangeRate: `Add a ${sourceCurrency}/${baseCurrency} exchange rate before saving this transaction.`,
            });
            setSaving(false);
            return;
          }
        }
        await transactionService.create({
          ...common,
          type,
          categoryId: effectiveSelection?.categoryId ?? '',
          subcategoryId: effectiveSelection?.subcategoryId ?? null,
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

  /**
   * Suggest the destination amount from the saved rates. Both legs may be foreign,
   * so the conversion goes through the base currency, which is the only currency
   * every saved rate is stated against.
   */
  function prefillDestination() {
    const parsedSource = parseMoney(amountDigits || '0', sourceCurrency);
    if (!parsedSource.ok || parsedSource.minor <= 0) return;
    const sourceInBase = rates.toBase(parsedSource.minor, sourceCurrency);
    if (sourceInBase === null) return;
    const destinationRate = rates.rateFor(destinationCurrency);
    const destMinor = destinationCurrency === baseCurrency
      ? sourceInBase
      : destinationRate
        ? convertMinor(sourceInBase, baseCurrency, destinationCurrency, destinationRate)
        : null;
    if (destMinor === null) return;
    const factor = getCurrency(destinationCurrency).minorUnitFactor;
    const digits = getCurrency(destinationCurrency).fractionDigits;
    const text = digits === 0
      ? String(destMinor)
      : `${Math.trunc(destMinor / factor)}.${String(destMinor % factor).padStart(digits, '0')}`;
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
            rateSnapshot ? (
              <Text style={[styles.rateNote, { color: theme.secondaryText }]}>
                Reference rate {describeRate(rateSnapshot.rate)} · rate date {rateSnapshot.effectiveDate}. Your bank may use a different rate.
              </Text>
            ) : (
              <Text accessibilityLiveRegion="polite" style={[styles.rateWarning, { color: theme.destructive }]}>
                No exchange rate is available. Add a {rateCurrency}/{baseCurrency} rate in More → Currency & Rates before saving.
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
                    keyboardType={getCurrency(destinationCurrency).fractionDigits === 0 ? 'number-pad' : 'decimal-pad'}
                    onChangeText={(value) => {
                      setDestinationAmountDigits(sanitizeAmountEntry(value, destinationCurrency));
                      setErrors((current) => ({ ...current, destinationAmount: undefined }));
                    }}
                    placeholder={getCurrency(destinationCurrency).fractionDigits === 0 ? '0' : '0.00'}
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
                  {rates.has(sourceCurrency) && rates.has(destinationCurrency) ? (
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
                categories={tree}
                error={errors.categoryId}
                onSelect={selectCategory}
                onViewAll={() => setCategoryPickerVisible(true)}
                selection={effectiveSelection}
                subcategoryError={errors.subcategoryId}
                type={type}
              />
              {tree.length === 0 ? (
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

          <DateField
            error={errors.transactionDate}
            label="Transaction date"
            onChange={(value) => {
              setTransactionDate(value);
              setErrors((current) => ({ ...current, transactionDate: undefined }));
            }}
            value={transactionDate}
          />

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

      <CategoryPicker
        categories={tree}
        onClose={() => setCategoryPickerVisible(false)}
        onManage={() => router.push({ pathname: '/categories', params: { type } })}
        onSelect={selectCategory}
        selection={effectiveSelection}
        title={type === 'income' ? 'Select income category' : 'Select expense category'}
        visible={categoryPickerVisible}
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
