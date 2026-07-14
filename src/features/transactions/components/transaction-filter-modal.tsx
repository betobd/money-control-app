import { SymbolView } from 'expo-symbols';
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

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { resolveTransactionDateRange } from '@/features/transactions/transaction-date';
import type {
  TransactionFilterOptions,
  TransactionListFilters,
} from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  ChoicePill,
  DateField,
  dateFilterOptions,
  FilterChoiceGroup,
  FilterDateFields,
  FilterOptionGroup,
  FilterSection,
  SelectionRow,
  statusFilterOptions,
  typeFilterOptions,
} from './transaction-filter-controls';

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
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

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
      setDateError(cause instanceof Error ? cause.message : 'Enter a valid date range.');
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
          style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + spacing.sm }]}>
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

          <FilterSection title="Account">
            <SelectionRow
              label="All accounts"
              onPress={() => setDraft((current) => ({ ...current, accountId: null }))}
              selected={draft.accountId === null}
            />
            {filterOptions.accounts.map((account) => (
              <SelectionRow
                key={account.id}
                label={`${account.name}${account.isArchived ? ' (Archived)' : ''}`}
                onPress={() => setDraft((current) => ({ ...current, accountId: account.id }))}
                selected={draft.accountId === account.id}
              />
            ))}
          </FilterSection>

          <FilterSection title="Category">
            <SelectionRow
              label="All categories"
              onPress={() => setDraft((current) => ({ ...current, categoryId: null }))}
              selected={draft.categoryId === null}
            />
            {(['expense', 'income'] as const).map((type) => {
              const options = filterOptions.categories.filter((category) => category.type === type);
              if (options.length === 0) return null;
              return (
                <FilterOptionGroup key={type} label={type === 'expense' ? 'Expense' : 'Income'}>
                  {options.map((category) => (
                    <SelectionRow
                      key={category.id}
                      label={`${category.name}${category.isArchived ? ' (Archived)' : ''}`}
                      onPress={() => setDraft((current) => ({ ...current, categoryId: category.id }))}
                      selected={draft.categoryId === category.id}
                    />
                  ))}
                </FilterOptionGroup>
              );
            })}
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
                  onChangeText={(value) => setDraft((current) => ({ ...current, customDateFrom: value }))}
                  value={draft.customDateFrom}
                />
                <DateField
                  label="End date"
                  onChangeText={(value) => setDraft((current) => ({ ...current, customDateTo: value }))}
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

        <View style={[styles.footer, { borderTopColor: theme.border, paddingBottom: insets.bottom + spacing.md }]}>
          <Pressable
            accessibilityLabel="Apply transaction filters"
            accessibilityRole="button"
            onPress={apply}
            style={[styles.applyButton, { backgroundColor: theme.primaryAction }]}>
            <Text style={[styles.applyLabel, { color: theme.onPrimaryAction }]}>Apply filters</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    borderBottomWidth: borderWidths.thin,
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
  footer: { borderTopWidth: borderWidths.thin, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  applyButton: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56 },
  applyLabel: { ...typography.body, fontWeight: '700' },
});
