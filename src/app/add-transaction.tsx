import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
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

import { spacing, typography } from '@/constants/theme';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid } from '@/features/add-transaction/components/category-grid';
import { FixedSaveBar } from '@/features/add-transaction/components/fixed-save-bar';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { SuccessToast } from '@/features/add-transaction/components/success-toast';
import { TransactionTypeSelector } from '@/features/add-transaction/components/transaction-type-selector';
import { TransferAccountFields } from '@/features/add-transaction/components/transfer-account-fields';
import {
  transactionFormMock,
  type TransactionFormType,
} from '@/features/add-transaction/add-transaction.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function AddTransactionModal() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [type, setType] = useState<TransactionFormType>('expense');
  const [amountDigits, setAmountDigits] = useState('125450000');
  const [showSuccess, setShowSuccess] = useState(false);
  const successTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimer.current) clearTimeout(successTimer.current);
    };
  }, []);

  const handleTypeChange = (nextType: TransactionFormType) => {
    setType(nextType);
    setShowSuccess(false);
  };

  const handleMockSave = () => {
    if (successTimer.current) clearTimeout(successTimer.current);
    setShowSuccess(true);
    successTimer.current = setTimeout(() => setShowSuccess(false), 1800);
  };

  const categories =
    type === 'income' ? transactionFormMock.incomeCategories : transactionFormMock.expenseCategories;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close Add Transaction"
          accessibilityRole="button"
          hitSlop={8}
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
        <View style={styles.headerSpacer} />
      </View>

      <SuccessToast type={type} visible={showSuccess} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
        style={styles.keyboardArea}>
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <AmountInput digits={amountDigits} onDigitsChange={setAmountDigits} type={type} />
          <TransactionTypeSelector onChange={handleTypeChange} value={type} />

          {type === 'transfer' ? (
            <TransferAccountFields
              destination={transactionFormMock.transferDestination}
              source={transactionFormMock.transferSource}
            />
          ) : (
            <>
              <CategoryGrid categories={categories} selectedId={categories[0].id} type={type} />
              <FormFieldButton
                icon={{ ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
                label={type === 'income' ? 'Destination account' : 'Source account'}
                value={type === 'income' ? transactionFormMock.incomeAccount : transactionFormMock.expenseAccount}
              />
            </>
          )}

          <FormFieldButton
            icon={{ ios: 'calendar', android: 'calendar_month', web: 'calendar_month' }}
            label="Date"
            value={transactionFormMock.date}
          />

          <View style={styles.noteGroup}>
            <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>Note (optional)</Text>
            <TextInput
              accessibilityLabel="Transaction note, optional"
              multiline
              placeholder="Add a description…"
              placeholderTextColor={theme.mutedText}
              style={[
                styles.noteInput,
                {
                  backgroundColor: theme.surface,
                  borderColor: theme.border,
                  color: theme.primaryText,
                },
              ]}
              textAlignVertical="top"
            />
          </View>
        </ScrollView>

        <FixedSaveBar
          bottomInset={insets.bottom}
          onPress={handleMockSave}
          type={type}
        />
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  closeButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    ...typography.title,
    flex: 1,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  keyboardArea: {
    flex: 1,
  },
  content: {
    gap: spacing.lg,
    paddingBottom: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  noteGroup: {
    gap: spacing.sm,
  },
  fieldLabel: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  noteInput: {
    ...typography.body,
    borderRadius: 12,
    borderWidth: 1,
    minHeight: 104,
    padding: spacing.md,
  },
});
