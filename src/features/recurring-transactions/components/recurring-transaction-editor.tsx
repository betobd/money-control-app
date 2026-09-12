import { useRouter } from 'expo-router';
import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { useState } from 'react';
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
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAccounts } from '@/features/accounts/use-accounts';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput, sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { parseMoney, type CurrencyCode } from '@/features/currency/currency';
import { CategoryGrid, type CategorySelection } from '@/features/add-transaction/components/category-grid';
import { CategoryPicker } from '@/features/add-transaction/components/category-picker';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { TransactionTypeSelector } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useCategoryTree } from '@/features/categories/use-categories';
import { useAppTheme } from '@/hooks/use-app-theme';
import { RecurringRuleValidationError } from '../recurring-transaction.service';
import type {
  RecurringFrequency,
  RecurringRuleInput,
  RecurringRuleValidationErrors,
  RecurringTransactionShape,
} from '../recurring-transaction.types';
import { ScreenHeader } from '@/components/screen-header';
import { FixedFooter } from '@/components/fixed-footer';

type OccurrenceEditInput = RecurringTransactionShape & { scheduledDate: string };
type EditorInitial = {
  type: TransactionFormType;
  amount: number;
  accountId: string;
  destinationAccountId: string | null;
  categoryId: string | null;
  subcategoryId: string | null;
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

// Validation-error fields this editor renders inline. Errors on any other field
// (e.g. currency/exchangeRate) have no input to attach to and would otherwise
// fail silently, so they are surfaced as a general error instead.
const RENDERED_ERROR_FIELDS = new Set<string>([
  'amount',
  'accountId',
  'destinationAccountId',
  'categoryId',
  'subcategoryId',
  'frequency',
  'interval',
  'startDate',
  'endDate',
  'note',
]);

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
  const expenseTree = useCategoryTree('expense', false).tree;
  const incomeTree = useCategoryTree('income', false).tree;
  const [type, setType] = useState(props.initial.type);
  const [digits, setDigits] = useState(String(props.initial.amount || ''));
  const [accountId, setAccountId] = useState(props.initial.accountId);
  const [destinationAccountId, setDestinationAccountId] = useState(props.initial.destinationAccountId ?? '');
  const [selection, setSelection] = useState<CategorySelection | null>(
    props.initial.categoryId
      ? { categoryId: props.initial.categoryId, subcategoryId: props.initial.subcategoryId }
      : null,
  );
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
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
  const editorCurrency: CurrencyCode = selectedAccount?.currency ?? 'COP';
  const selectedDestination = accounts.find((account) => account.id === destinationAccountId);
  const tree = type === 'income' ? incomeTree : expenseTree;
  // Re-resolved against the live tree so a category archived elsewhere cannot
  // stay selected, and a subcategory never outlives a change of category.
  const selectedCategory = tree.find((category) => category.id === selection?.categoryId);
  const effectiveSelection: CategorySelection | null = selectedCategory
    ? {
        categoryId: selectedCategory.id,
        subcategoryId: selectedCategory.subcategories.some((item) => item.id === selection?.subcategoryId)
          ? selection?.subcategoryId ?? null
          : null,
      }
    : null;
  const pickerAccounts = picker === 'source'
    ? activeAccounts.filter((account) => account.id !== destinationAccountId)
    : picker === 'destination'
      ? activeAccounts.filter((account) => account.id !== accountId)
      : activeAccounts;

  function changeType(next: TransactionFormType) {
    setType(next);
    setSelection(null);
    setErrors({});
  }

  function selectCategory(next: CategorySelection) {
    setSelection(next);
    setErrors((current) => ({ ...current, categoryId: undefined, subcategoryId: undefined }));
  }

  function selectAccount(id: string) {
    if (picker === 'destination') setDestinationAccountId(id);
    else setAccountId(id);
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    const parsed = parseMoney(digits || '0', editorCurrency);
    if (!parsed.ok) {
      setErrors({ amount: 'Enter a valid amount greater than zero.' });
      setSaving(false);
      return;
    }
    const amount = parsed.minor;
    const shape: RecurringTransactionShape = type === 'transfer'
      ? {
          type: 'transfer',
          amount,
          accountId,
          destinationAccountId,
          categoryId: null,
          subcategoryId: null,
          note,
        }
      : {
          type,
          amount,
          accountId,
          destinationAccountId: null,
          categoryId: effectiveSelection?.categoryId ?? '',
          subcategoryId: effectiveSelection?.subcategoryId ?? null,
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
      if (cause instanceof RecurringRuleValidationError) {
        setErrors(cause.fields);
        // Guard against a validation error on a field this form does not render
        // (e.g. currency/exchangeRate): surface it as a general error instead of
        // failing silently with no visible feedback.
        const visible = Object.keys(cause.fields).some((field) => RENDERED_ERROR_FIELDS.has(field));
        if (!visible) {
          const first = Object.values(cause.fields).find(Boolean);
          setGeneralError(first ?? 'Unable to save recurring transaction.');
        }
      } else {
        setGeneralError(toUserMessage(cause, 'Unable to save recurring transaction.'));
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.screen, { backgroundColor: theme.appBackground }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel={`Close ${props.title}`} title={props.title} topInset={insets.top + spacing.sm} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text> : null}
        <AmountInput autoFocus={false} currency={editorCurrency} digits={digits} error={errors.amount} onDigitsChange={(value) => setDigits(sanitizeAmountEntry(value, editorCurrency))} type={type} />
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
              categories={tree}
              error={errors.categoryId}
              onSelect={selectCategory}
              onViewAll={() => setCategoryPickerVisible(true)}
              selection={effectiveSelection}
              subcategoryError={errors.subcategoryId}
              type={type}
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
            <Overline color={theme.mutedText}>Frequency</Overline>
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
                        backgroundColor: selected ? theme.tintPrimary : theme.surface,
                        borderColor: selected ? theme.primaryAction : 'transparent',
                      },
                    ]}>
                    <Text style={[styles.optionLabel, { color: selected ? theme.primaryText : theme.secondaryText }]}>{option.label}</Text>
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
          <DateField clearable error={errors.endDate} label="End date (optional)" onChange={setEndDate} value={endDate} />
        ) : null}

        <View style={styles.field}>
          <Overline color={theme.mutedText}>Note (optional)</Overline>
          <TextInput
            accessibilityLabel="Recurring transaction note"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="Add a description…"
            placeholderTextColor={theme.mutedText}
            style={[styles.note, { backgroundColor: theme.surface, borderColor: errors.note ? theme.destructive : theme.hairline, color: theme.primaryText }]}
            textAlignVertical="top"
            value={note}
          />
          {errors.note ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.note}</Text> : null}
        </View>
      </ScrollView>

      <FixedFooter bottomInset={insets.bottom}>
        <Button
          accessibilityLabel="Save recurring transaction"
          busy={saving}
          fullWidth
          label="Save"
          onPress={() => void save()}
          size="lg"
          variant="primary"
        />
      </FixedFooter>

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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  optionGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  optionLabel: { ...typography.captionStrong },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  note: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 96, padding: spacing.md },
  error: { ...typography.caption },
});
