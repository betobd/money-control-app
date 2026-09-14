import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { foldForSearch } from '@/utils/text-search';
import type {
  SupportedTransactionType,
  TransactionDateRangePreset,
  TransactionStatus,
} from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getMessages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';

// Labels are getters so they are read in the active language at render time.
export const typeFilterOptions: { readonly label: string; value: SupportedTransactionType | null }[] = [
  { get label() { return getMessages().transactions.filters.all; }, value: null },
  { get label() { return getMessages().transactions.types.expense; }, value: 'expense' },
  { get label() { return getMessages().transactions.types.income; }, value: 'income' },
  { get label() { return getMessages().transactions.types.transfer; }, value: 'transfer' },
  { get label() { return getMessages().transactions.types.refund; }, value: 'refund' },
];

export const statusFilterOptions: { readonly label: string; value: TransactionStatus | null }[] = [
  { get label() { return getMessages().transactions.filters.all; }, value: null },
  { get label() { return getMessages().transactions.status.posted; }, value: 'posted' },
  { get label() { return getMessages().transactions.status.voided; }, value: 'voided' },
];

export const dateFilterOptions: { readonly label: string; value: TransactionDateRangePreset }[] = [
  { get label() { return getMessages().transactions.filters.currentMonth; }, value: 'current-month' },
  { get label() { return getMessages().transactions.filters.previousMonth; }, value: 'previous-month' },
  { get label() { return getMessages().transactions.filters.last30Days; }, value: 'last-30-days' },
  { get label() { return getMessages().transactions.filters.customRange; }, value: 'custom' },
  { get label() { return getMessages().transactions.date.allTime; }, value: 'all-time' },
];

export function FilterSection({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>
        {title}
      </Text>
      {children}
    </View>
  );
}

export function FilterChoiceGroup({ children }: { children: React.ReactNode }) {
  return <View style={styles.choices}>{children}</View>;
}

export function FilterDateFields({ children }: { children: React.ReactNode }) {
  return <View style={styles.dateFields}>{children}</View>;
}

export function ChoicePill({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.choice,
        { backgroundColor: selected ? theme.primaryAction : theme.elevatedSurface },
      ]}>
      {selected ? (
        <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={16}
          tintColor={theme.onPrimaryAction}
        />
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.choiceLabel, { color: selected ? theme.onPrimaryAction : theme.secondaryText }]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function SelectionRow({ label, onPress, selected }: { label: string; onPress: () => void; selected: boolean }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[
        styles.selectionRow,
        { backgroundColor: selected ? theme.tintPrimary : theme.surface },
      ]}>
      <Text
        numberOfLines={1}
        style={[styles.selectionLabel, { color: selected ? theme.primaryAction : theme.primaryText }]}>
        {label}
      </Text>
      <SymbolView
        name={selected
          ? { ios: 'checkmark.circle.fill', android: 'radio_button_checked', web: 'radio_button_checked' }
          : { ios: 'circle', android: 'radio_button_unchecked', web: 'radio_button_unchecked' }}
        size={22}
        tintColor={selected ? theme.primaryAction : theme.mutedText}
      />
    </Pressable>
  );
}

export type FilterOption = {
  /** `null` is the "no filter" option and always sorts first. */
  id: string | null;
  label: string;
  /** Optional heading this option is listed under. */
  group?: string;
};

/**
 * Collapsed filter value: a single row that opens {@link FilterOptionSheet}.
 *
 * Accounts and categories used to be rendered inline as full lists, which made
 * the filter sheet several screens tall for anyone with more than a handful of
 * either. One row per filter keeps every control reachable without scrolling.
 */
export function FilterValueRow({
  label,
  onPress,
  value,
}: {
  label: string;
  onPress: () => void;
  value: string;
}) {
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <Pressable
      accessibilityHint={t.transactions.filters.openListHint(label)}
      accessibilityLabel={`${label}, ${value}`}
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.valueRow, { backgroundColor: theme.surface }]}>
      <Text style={[styles.valueRowLabel, { color: theme.mutedText }]}>{label}</Text>
      <Text numberOfLines={1} style={[styles.valueRowValue, { color: theme.primaryText }]}>{value}</Text>
      <SymbolView
        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
        size={18}
        tintColor={theme.mutedText}
      />
    </Pressable>
  );
}

/** Searchable single-select list, presented over the filter sheet. */
export function FilterOptionSheet({
  onClose,
  onSelect,
  options,
  selectedId,
  title,
  visible,
}: {
  onClose: () => void;
  onSelect: (id: string | null) => void;
  options: readonly FilterOption[];
  selectedId: string | null;
  title: string;
  visible: boolean;
}) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const [query, setQuery] = useState('');
  const needle = foldForSearch(query);
  // The "no filter" option is never searched away: it is how the filter is
  // cleared, and hiding it behind an empty query would strand the user.
  const matches = options.filter((option) => option.id === null || !needle || foldForSearch(option.label).includes(needle));
  const groups = [...new Set(matches.map((option) => option.group))];

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={visible}>
      <View style={[styles.sheet, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
        <View style={styles.sheetHeader}>
          <Pressable
            accessibilityLabel={t.transactions.filters.closeSheet(title)}
            accessibilityRole="button"
            onPress={close}
            style={styles.sheetHeaderButton}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
          </Pressable>
          <Text accessibilityRole="header" style={[styles.sheetTitle, { color: theme.primaryText }]}>{title}</Text>
          <View style={styles.sheetHeaderButton} />
        </View>
        <View style={styles.sheetSearch}>
          <TextInput
            accessibilityLabel={t.transactions.filters.searchSheet(title)}
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={t.transactions.filters.search}
            placeholderTextColor={theme.mutedText}
            style={[styles.searchInput, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]}
            value={query}
          />
        </View>
        <ScrollView
          accessibilityRole="radiogroup"
          contentContainerStyle={[styles.sheetContent, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled">
          {matches.length === 1 && needle ? (
            <Text style={[styles.groupLabel, { color: theme.secondaryText }]}>{t.transactions.filters.noMatches}</Text>
          ) : null}
          {groups.map((group) => {
            const rows = matches.filter((option) => option.group === group);
            if (rows.length === 0) return null;
            return (
              <View key={group ?? 'ungrouped'} style={styles.optionGroup}>
                {group ? <Text style={[styles.groupLabel, { color: theme.mutedText }]}>{group}</Text> : null}
                {rows.map((option) => (
                  <SelectionRow
                    key={option.id ?? 'all'}
                    label={option.label}
                    onPress={() => {
                      onSelect(option.id);
                      close();
                    }}
                    selected={option.id === selectedId}
                  />
                ))}
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  section: { gap: spacing.md },
  sectionTitle: { ...typography.sectionTitle },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  choice: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
  },
  choiceLabel: { ...typography.captionStrong, flexShrink: 1 },
  selectionRow: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  selectionLabel: { ...typography.body, flex: 1 },
  optionGroup: { gap: spacing.sm },
  groupLabel: { ...typography.label, textTransform: 'uppercase' },
  valueRow: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.md,
  },
  valueRowLabel: { ...typography.label, textTransform: 'uppercase' },
  valueRowValue: { ...typography.body, flex: 1, textAlign: 'right' },
  sheet: { flex: 1 },
  sheetHeader: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  sheetHeaderButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  sheetTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  sheetSearch: { paddingBottom: spacing.sm, paddingHorizontal: spacing.md },
  searchInput: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 52, paddingHorizontal: spacing.md },
  sheetContent: { gap: spacing.lg, padding: spacing.md },
  dateFields: { gap: spacing.md },
  dateField: { gap: spacing.sm },
  dateLabel: { ...typography.captionStrong },
  dateInput: {
    ...typography.body,
    borderRadius: borderRadii.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
});
