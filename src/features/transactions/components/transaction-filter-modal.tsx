import { SymbolView } from 'expo-symbols';
import { toUserMessage } from '@/errors/user-error';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { resolveTransactionDateRange } from '@/features/transactions/transaction-date';
import type {
  TransactionFilterOptions,
  TransactionListFilters,
} from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { DateField } from '@/components/date-field';
import {
  ChoicePill,
  dateFilterOptions,
  FilterChoiceGroup,
  FilterDateFields,
  FilterOptionSheet,
  FilterSection,
  FilterValueRow,
  statusFilterOptions,
  typeFilterOptions,
  type FilterOption,
} from './transaction-filter-controls';

type FilterPicker = 'account' | 'category' | null;

type TransactionFilterModalProps = {
  filters: TransactionListFilters;
  filterOptions: TransactionFilterOptions;
  onApply: (filters: TransactionListFilters) => void;
  onClearAll: () => void;
  onClose: () => void;
  visible: boolean;
};

export function TransactionFilterModal({
  filters,
  filterOptions,
  onApply,
  onClearAll,
  onClose,
  visible,
}: TransactionFilterModalProps) {
  const [draft, setDraft] = useState(filters);
  const [dateError, setDateError] = useState<string>();
  const [picker, setPicker] = useState<FilterPicker>(null);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const accountOptions = buildAccountOptions(filterOptions.accounts);
  const categoryOptions = buildCategoryOptions(filterOptions.categories);

  const apply = () => {
    try {
      resolveTransactionDateRange(
        draft.datePreset,
        undefined,
        draft.customDateFrom,
        draft.customDateTo,
      );
      setDateError(undefined);
      onApply(draft);
    } catch (cause) {
      setDateError(toUserMessage(cause, 'Enter a valid date range.'));
    }
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
      statusBarTranslucent
      visible={visible}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.screen, { backgroundColor: theme.appBackground }]}>
        <View
          accessibilityLabel="Transaction filters"
          accessibilityRole="header"
          style={[styles.header, { borderBottomColor: theme.hairline, paddingTop: insets.top + spacing.sm }]}>
          <Pressable
            accessibilityLabel="Close transaction filters"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.headerButton}>
            <SymbolView
              name={{ ios: 'xmark', android: 'close', web: 'close' }}
              size={24}
              tintColor={theme.primaryText}
            />
          </Pressable>
          <Text style={[styles.title, { color: theme.primaryText }]}>Filters</Text>
          <Pressable
            accessibilityLabel="Clear all transaction filters"
            accessibilityRole="button"
            onPress={onClearAll}
            style={styles.clearButton}>
            <Text style={[styles.clearLabel, { color: theme.primaryAction }]}>Clear all</Text>
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <FilterSection title="Transaction type">
            <FilterChoiceGroup>
              {typeFilterOptions.map((option) => (
                <ChoicePill
                  key={option.label}
                  label={option.label}
                  onPress={() => setDraft((current) => ({ ...current, type: option.value }))}
                  selected={draft.type === option.value}
                />
              ))}
            </FilterChoiceGroup>
          </FilterSection>

          <FilterSection title="Status">
            <FilterChoiceGroup>
              {statusFilterOptions.map((option) => (
                <ChoicePill
                  key={option.label}
                  label={option.label}
                  onPress={() => setDraft((current) => ({ ...current, status: option.value }))}
                  selected={draft.status === option.value}
                />
              ))}
            </FilterChoiceGroup>
          </FilterSection>

          <FilterSection title="Scope">
            <FilterValueRow
              label="Account"
              onPress={() => setPicker('account')}
              value={labelFor(accountOptions, draft.accountId)}
            />
            <FilterValueRow
              label="Category"
              onPress={() => setPicker('category')}
              value={labelFor(categoryOptions, draft.categoryId)}
            />
          </FilterSection>

          <FilterSection title="Date range">
            <FilterChoiceGroup>
              {dateFilterOptions.map((option) => (
                <ChoicePill
                  key={option.value}
                  label={option.label}
                  onPress={() => {
                    setDateError(undefined);
                    setDraft((current) => ({ ...current, datePreset: option.value }));
                  }}
                  selected={draft.datePreset === option.value}
                />
              ))}
            </FilterChoiceGroup>
            {draft.datePreset === 'custom' ? (
              <FilterDateFields>
                <DateField
                  label="Start date"
                  maxDate={draft.customDateTo || undefined}
                  onChange={(value) => setDraft((current) => ({ ...current, customDateFrom: value }))}
                  value={draft.customDateFrom}
                />
                <DateField
                  label="End date"
                  minDate={draft.customDateFrom || undefined}
                  onChange={(value) => setDraft((current) => ({ ...current, customDateTo: value }))}
                  value={draft.customDateTo}
                />
              </FilterDateFields>
            ) : null}
            {dateError ? (
              <Text accessibilityRole="alert" style={[styles.error, { color: theme.destructive }]}>
                {dateError}
              </Text>
            ) : null}
          </FilterSection>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.hairline, paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            accessibilityLabel="Apply transaction filters"
            accessibilityRole="button"
            onPress={apply}
            style={[styles.applyButton, { backgroundColor: theme.primaryAction }]}>
            <Text style={[styles.applyLabel, { color: theme.onPrimaryAction }]}>Apply filters</Text>
          </Pressable>
        </View>

        <FilterOptionSheet
          onClose={() => setPicker(null)}
          onSelect={(accountId) => setDraft((current) => ({ ...current, accountId }))}
          options={accountOptions}
          selectedId={draft.accountId}
          title="Account"
          visible={picker === 'account'}
        />
        <FilterOptionSheet
          onClose={() => setPicker(null)}
          onSelect={(categoryId) => setDraft((current) => ({ ...current, categoryId }))}
          options={categoryOptions}
          selectedId={draft.categoryId}
          title="Category"
          visible={picker === 'category'}
        />
      </KeyboardAvoidingView>
    </Modal>
  );
}

/** The chosen option's label, or the "no filter" row when nothing is selected. */
function labelFor(options: readonly FilterOption[], id: string | null): string {
  return options.find((option) => option.id === id)?.label ?? options[0].label;
}

function buildAccountOptions(accounts: TransactionFilterOptions['accounts']): FilterOption[] {
  return [
    { id: null, label: 'All accounts' },
    ...accounts.map((account) => ({
      id: account.id,
      label: `${account.name}${account.isArchived ? ' (Archived)' : ''}`,
    })),
  ];
}

/**
 * Categories and subcategories in one list, each subcategory qualified by its
 * category. A bare subcategory name ("Taxi") is ambiguous next to the categories
 * it could belong to, and the flat list gave no other clue.
 */
function buildCategoryOptions(categories: TransactionFilterOptions['categories']): FilterOption[] {
  const names = new Map(categories.map((category) => [category.id, category.name]));
  const options: FilterOption[] = [{ id: null, label: 'All categories' }];
  for (const type of ['expense', 'income'] as const) {
    for (const category of categories.filter((candidate) => candidate.type === type)) {
      const parentName = category.parentCategoryId ? names.get(category.parentCategoryId) : undefined;
      const name = parentName ? `${parentName} · ${category.name}` : category.name;
      options.push({
        id: category.id,
        label: `${name}${category.isArchived ? ' (Archived)' : ''}`,
        group: type === 'expense' ? 'Expense' : 'Income',
      });
    }
  }
  return options;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    minHeight: 64,
    paddingHorizontal: spacing.sm,
  },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  clearButton: { alignItems: 'center', minHeight: 48, justifyContent: 'center', minWidth: 80 },
  clearLabel: { ...typography.caption, fontWeight: '700' },
  content: { gap: spacing.xl, padding: spacing.md, paddingBottom: spacing.xl },
  error: { ...typography.caption },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  applyButton: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56 },
  applyLabel: { ...typography.body, fontWeight: '700' },
});
