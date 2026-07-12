import { router } from 'expo-router';
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
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
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
import type { TransactionValidationErrors } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountPickerField = 'account' | 'source' | 'destination' | null;

export default function AddTransactionModal() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [type, setType] = useState<TransactionFormType>('expense');
  const [amountDigits, setAmountDigits] = useState('');
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

  const { accounts } = useAccounts();
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const expenseCategories = useCategories('expense', false).categories;
  const incomeCategories = useCategories('income', false).categories;
  const categories = type === 'income' ? incomeCategories : expenseCategories;
  const selectedAccount = activeAccounts.find((account) => account.id === selectedAccountId);
  const destinationAccount = activeAccounts.find((account) => account.id === destinationAccountId);
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
      const common = {
        amount: amountDigits ? Number(amountDigits) : 0,
        accountId: selectedAccountId ?? '',
        transactionDate,
        note,
      };
      if (type === 'transfer') {
        await transactionService.create({
          ...common,
          type: 'transfer',
          destinationAccountId: destinationAccountId ?? '',
          categoryId: null,
        });
      } else {
        await transactionService.create({
          ...common,
          type,
          categoryId: effectiveCategoryId ?? '',
        });
      }
      setShowSuccess(true);
      closeTimer.current = setTimeout(() => router.back(), 650);
    } catch (cause) {
      if (cause instanceof TransactionValidationError) {
        setErrors(cause.fields);
      } else {
        setGeneralError(cause instanceof Error ? cause.message : 'Unable to save transaction.');
      }
      setSaving(false);
    }
  }

  const transferHelper = destinationAccount?.type === 'credit_card'
    ? 'Payment reduces the amount owed.'
    : selectedAccount?.type === 'credit_card'
      ? 'This increases the card amount owed or reduces a card credit balance.'
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
            digits={amountDigits}
            error={errors.amount}
            onDigitsChange={setAmountDigits}
            type={type}
          />
          <TransactionTypeSelector onChange={changeType} value={type} />

          {generalError ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {generalError}
            </Text>
          ) : null}

          {type === 'transfer' ? (
            <TransferAccountFields
              destination={destinationAccount?.name ?? 'Select account'}
              destinationError={errors.destinationAccountId}
              helperText={transferHelper}
              onSelectDestination={() => setAccountPickerField('destination')}
              onSelectSource={() => setAccountPickerField('source')}
              source={selectedAccount?.name ?? 'Select account'}
              sourceError={errors.accountId}
            />
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
                  borderColor: errors.transactionDate ? theme.destructive : theme.border,
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
                  borderColor: errors.note ? theme.destructive : theme.border,
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
  title: { ...typography.title, flex: 1, fontSize: 26, textAlign: 'center' },
  keyboardArea: { flex: 1 },
  content: { gap: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  field: { gap: spacing.sm },
  fieldLabel: { ...typography.label, textTransform: 'uppercase' },
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
  limit: { ...typography.label, textAlign: 'right' },
});
