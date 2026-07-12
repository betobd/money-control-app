import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useAppTheme } from '@/hooks/use-app-theme';

const options: { label: string; value: TransactionFormType }[] = [
  { label: 'Expense', value: 'expense' },
  { label: 'Income', value: 'income' },
  { label: 'Transfer', value: 'transfer' },
];

type TransactionTypeSelectorProps = {
  value: TransactionFormType;
  onChange: (value: TransactionFormType) => void;
};

export function TransactionTypeSelector({ value, onChange }: TransactionTypeSelectorProps) {
  const theme = useAppTheme();

  return (
    <View accessibilityLabel="Transaction type" accessibilityRole="radiogroup" style={[styles.container, { backgroundColor: theme.elevatedSurface }]}> 
      {options.map((option) => {
        const selected = option.value === value;
        const tone = getTypeTone(option.value, theme);
        const disabled = option.value === 'transfer';

        return (
          <Pressable
            accessibilityLabel={option.label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected, disabled }}
            disabled={disabled}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[
              styles.option,
              selected && { backgroundColor: tone, borderColor: tone },
              !selected && { borderColor: 'transparent' },
            ]}>
            <Text style={[styles.label, { color: disabled ? theme.disabledText : selected ? theme.onPrimaryAction : theme.secondaryText }]}>
              {disabled ? 'Transfer · Soon' : option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function getTypeTone(type: TransactionFormType, theme: ReturnType<typeof useAppTheme>) {
  if (type === 'income') return theme.income;
  if (type === 'transfer') return theme.transfer;
  return theme.expense;
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
  },
  option: {
    alignItems: 'center',
    borderRadius: borderRadii.sm,
    borderWidth: borderWidths.thin,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xs,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
  },
});
