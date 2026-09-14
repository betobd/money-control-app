import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

const options: readonly TransactionFormType[] = ['expense', 'income', 'transfer'];

type TransactionTypeSelectorProps = {
  value: TransactionFormType;
  onChange: (value: TransactionFormType) => void;
};

export function TransactionTypeSelector({ value, onChange }: TransactionTypeSelectorProps) {
  const theme = useAppTheme();
  const t = useMessages();

  return (
    <View accessibilityLabel={t.addTransaction.transactionType} accessibilityRole="radiogroup" style={[styles.container, { backgroundColor: theme.elevatedSurface }]}>
      {options.map((option) => {
        const selected = option === value;
        const tone = getTypeTone(option, theme);
        const label = t.transactions.types[option];
        return (
          <Pressable
            accessibilityLabel={label}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            key={option}
            onPress={() => onChange(option)}
            style={[styles.option, selected && { backgroundColor: tone }]}>
            <Text style={[styles.label, { color: selected ? theme.onPrimaryAction : theme.secondaryText }]}>
              {label}
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
    borderRadius: borderRadii.md - 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.xs,
  },
  label: {
    ...typography.body,
    fontFamily: fonts.sans.bold,
    fontSize: 14,
    fontWeight: '700',
  },
});
