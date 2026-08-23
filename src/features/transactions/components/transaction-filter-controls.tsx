import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import type {
  SupportedTransactionType,
  TransactionDateRangePreset,
  TransactionStatus,
} from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';

export const typeFilterOptions: { label: string; value: SupportedTransactionType | null }[] = [
  { label: 'All', value: null },
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
  { label: 'Refund', value: 'refund' },
];

export const statusFilterOptions: { label: string; value: TransactionStatus | null }[] = [
  { label: 'All', value: null },
  { label: 'Posted', value: 'posted' },
  { label: 'Voided', value: 'voided' },
];

export const dateFilterOptions: { label: string; value: TransactionDateRangePreset }[] = [
  { label: 'Current month', value: 'current-month' },
  { label: 'Previous month', value: 'previous-month' },
  { label: 'Last 30 days', value: 'last-30-days' },
  { label: 'Custom range', value: 'custom' },
  { label: 'All time', value: 'all-time' },
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

export function FilterOptionGroup({ children, label }: { children: React.ReactNode; label: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.optionGroup}>
      <Text style={[styles.groupLabel, { color: theme.mutedText }]}>{label}</Text>
      {children}
    </View>
  );
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
  choiceLabel: { ...typography.caption, flexShrink: 1, fontWeight: '700' },
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
  dateFields: { gap: spacing.md },
  dateField: { gap: spacing.sm },
  dateLabel: { ...typography.caption, fontWeight: '700' },
  dateInput: {
    ...typography.body,
    borderRadius: borderRadii.md,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
});
