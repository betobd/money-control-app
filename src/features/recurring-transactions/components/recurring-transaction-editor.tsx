import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
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
import { useAccounts } from '@/features/accounts/use-accounts';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid } from '@/features/add-transaction/components/category-grid';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { TransactionTypeSelector } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useCategories } from '@/features/categories/use-categories';
import { useAppTheme } from '@/hooks/use-app-theme';
import { RecurringRuleValidationError } from '../recurring-transaction.service';
import type {
  RecurringFrequency,
  RecurringRuleInput,
  RecurringRuleValidationErrors,
  RecurringTransactionShape,
} from '../recurring-transaction.types';

type OccurrenceEditInput = RecurringTransactionShape & { scheduledDate: string };
type EditorInitial = {
  type: TransactionFormType;
  amount: number;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  note: string | null;
  date: string;
  frequency?: RecurringFrequency;
  interval?: number;
  endDate?: string | null;
};

type RuleProps = {
  mode: 'rule';
  title: string;
  initial: EditorInitial;
  onSave: (input: RecurringRuleInput) => Promise<void>;
};

type OccurrenceProps = {
  mode: 'occurrence';
  title: string;
  initial: EditorInitial;
  onSave: (input: OccurrenceEditInput) => Promise<void>;
};

type PickerField = 'account' | 'source' | 'destination' | null;

const frequencyOptions: {
  label: string;
  frequency: RecurringFrequency;
  interval: number;
}[] = [
  { label: 'Daily', frequency: 'daily', interval: 1 },
  { label: 'Weekly', frequency: 'weekly', interval: 1 },
  { label: 'Every 2 weeks', frequency: 'weekly', interval: 2 },
  { label: 'Monthly', frequency: 'monthly', interval: 1 },
  { label: 'Yearly', frequency: 'yearly', interval: 1 },
];

export function RecurringTransactionEditor(props: RuleProps | OccurrenceProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { accounts } = useAccounts();
  const expenseCategories = useCategories('expense', false).categories;
  const incomeCategories = useCategories('income', false).categories;
  const [type, setType] = useState(props.initial.type);
  const [digits, setDigits] = useState(String(props.initial.amount || ''));
  const [accountId, setAccountId] = useState(props.initial.accountId);
  const [destinationAccountId, setDestinationAccountId] = useState(props.initial.destinationAccountId ?? '');
  const [categoryId, setCategoryId] = useState(props.initial.categoryId ?? '');
  const [date, setDate] = useState(props.initial.date);
  const [endDate, setEndDate] = useState(props.initial.endDate ?? '');
  const [frequency, setFrequency] = useState(props.initial.frequency ?? 'monthly');
  const [interval, setInterval] = useState(props.initial.interval ?? 1);
  const [note, setNote] = useState(props.initial.note ?? '');
  const [picker, setPicker] = useState<PickerField>(null);
  const [errors, setErrors] = useState<RecurringRuleValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);

  const activeAccounts = accounts.filter((account) => !account.isArchived);
  const selectedAccount = accounts.find((account) => account.id === accountId);
  const selectedDestination = accounts.find((account) => account.id === destinationAccountId);
  const categories = type === 'income' ? incomeCategories : expenseCategories;
  const pickerAccounts = picker === 'source'
    ? activeAccounts.filter((account) => account.id !== destinationAccountId)
    : picker === 'destination'
      ? activeAccounts.filter((account) => account.id !== accountId)
      : activeAccounts;

  function changeType(next: TransactionFormType) {
    setType(next);
    setCategoryId('');
    setErrors({});
  }

  function selectAccount(id: string) {
    if (picker === 'destination') setDestinationAccountId(id);
    else setAccountId(id);
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    const shape: RecurringTransactionShape = type === 'transfer'
      ? {
          type: 'transfer',
          amount: digits ? Number(digits) : 0,
          accountId,
          destinationAccountId,
          categoryId: null,
          note,
        }
      : {
          type,
          amount: digits ? Number(digits) : 0,
          accountId,
          destinationAccountId: null,
          categoryId,
          note,
        };
    try {
      if (props.mode === 'rule') {
        await props.onSave({
          ...shape,
          frequency,
          interval,
          startDate: date,
          endDate: endDate.trim() || null,
        } as RecurringRuleInput);
      } else {
        await props.onSave({ ...shape, scheduledDate: date } as OccurrenceEditInput);
      }
      router.back();
    } catch (cause) {
      if (cause instanceof RecurringRuleValidationError) setErrors(cause.fields);
      else setGeneralError(cause instanceof Error ? cause.message : 'Unable to save recurring transaction.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { backgroundColor: theme.appBackground }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + spacing.sm }]}>
        <Pressable accessibilityLabel={`Close ${props.title}`} accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.primaryText }]}>{props.title}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text> : null}
        <AmountInput autoFocus={false} digits={digits} error={errors.amount} onDigitsChange={setDigits} type={type} />
        <TransactionTypeSelector onChange={changeType} value={type} />

        {type === 'transfer' ? (
          <>
            <FormFieldButton
              error={errors.accountId}
              icon={{ ios: 'arrow.up.circle.fill', android: 'arrow_upward', web: 'arrow_upward' }}
              label="Source account"
              onPress={() => setPicker('source')}
              value={selectedAccount?.name ?? 'Select account'}
            />
            <FormFieldButton
              error={errors.destinationAccountId}
              icon={{ ios: 'arrow.down.circle.fill', android: 'arrow_downward', web: 'arrow_downward' }}
              label="Destination account"
              onPress={() => setPicker('destination')}
              value={selectedDestination?.name ?? 'Select account'}
            />
          </>
        ) : (
          <>
            <CategoryGrid
              categories={categories}
              error={errors.categoryId}
              onSelect={setCategoryId}
              onViewAll={() => router.push({ pathname: '/categories', params: { type } })}
              selectedId={categoryId}
              type={type}
            />
            <FormFieldButton
              error={errors.accountId}
              icon={{ ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
              label={type === 'income' ? 'Destination account' : 'Source account'}
              onPress={() => setPicker('account')}
              value={selectedAccount?.name ?? 'Select account'}
            />
          </>
        )}

        {props.mode === 'rule' ? (
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.primaryText }]}>Frequency</Text>
            <View accessibilityRole="radiogroup" style={styles.optionGrid}>
              {frequencyOptions.map((option) => {
                const selected = option.frequency === frequency && option.interval === interval;
                return (
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected }}
                    key={option.label}
                    onPress={() => {
                      setFrequency(option.frequency);
                      setInterval(option.interval);
                    }}
                    style={[
                      styles.option,
                      {
                        backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface,
                        borderColor: selected ? theme.primaryAction : theme.border,
                      },
                    ]}>
                    <Text style={[styles.optionLabel, { color: selected ? theme.selectedNavigationForeground : theme.primaryText }]}>{option.label}</Text>
                  </Pressable>
                );
              })}
            </View>
            {errors.frequency || errors.interval ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.frequency ?? errors.interval}</Text> : null}
          </View>
        ) : null}

        <DateField
          error={errors.startDate}
          label={props.mode === 'rule' ? 'Start date' : 'Scheduled date'}
          onChange={setDate}
          value={date}
        />
        {props.mode === 'rule' ? (
          <DateField error={errors.endDate} label="End date (optional)" onChange={setEndDate} value={endDate} />
        ) : null}

        <View style={styles.field}>
          <Text style={[styles.label, { color: theme.primaryText }]}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Recurring transaction note"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="Add a description…"
            placeholderTextColor={theme.mutedText}
            style={[styles.note, { backgroundColor: theme.surface, borderColor: errors.note ? theme.destructive : theme.border, color: theme.primaryText }]}
            textAlignVertical="top"
            value={note}
          />
          {errors.note ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.note}</Text> : null}
        </View>
      </ScrollView>

      <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          accessibilityLabel="Save recurring transaction"
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: saving ? theme.disabledSurface : theme.primaryAction }]}>
          {saving ? <ActivityIndicator color={theme.disabledText} /> : <Text style={[styles.saveLabel, { color: theme.onPrimaryAction }]}>Save</Text>}
        </Pressable>
      </View>

      <AccountPicker
        accounts={pickerAccounts}
        onClose={() => setPicker(null)}
        onSelect={selectAccount}
        selectedId={picker === 'destination' ? destinationAccountId : accountId}
        title={picker === 'destination' ? 'Select destination account' : picker === 'source' ? 'Select source account' : 'Select account'}
        visible={picker !== null}
      />
    </KeyboardAvoidingView>
  );
}

function DateField({
  error,
  label,
  onChange,
  value,
}: {
  error?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.label, { color: theme.primaryText }]}>{label}</Text>
      <TextInput
        accessibilityLabel={`${label}, YYYY-MM-DD`}
        autoCapitalize="none"
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        onChangeText={onChange}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.mutedText}
        style={[styles.input, { backgroundColor: theme.surface, borderColor: error ? theme.destructive : theme.border, color: theme.primaryText }]}
        value={value}
      />
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  label: { ...typography.body, fontWeight: '700' },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  optionLabel: { ...typography.caption, fontWeight: '700' },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 52, paddingHorizontal: spacing.md },
  note: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 96, padding: spacing.md },
  error: { ...typography.caption },
  footer: { borderTopWidth: borderWidths.thin, padding: spacing.md },
  save: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 52 },
  saveLabel: { ...typography.body, fontWeight: '700' },
});
