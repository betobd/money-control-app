import { type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { IconChip } from '@/components/icon-chip';
import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { MoneyText } from '@/features/home/components/money-text';
import type { FinancialTone } from '@/features/home/home-dashboard.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

type Tone = Exclude<FinancialTone, 'default'>;

type TransactionListItemProps = {
  title: string;
  subtitle: string;
  amount: string;
  tone: Tone;
  icon: SymbolViewProps['name'];
  showDivider?: boolean;
  onPress?: () => void;
};

export function TransactionListItem({ title, subtitle, amount, tone, icon, onPress }: TransactionListItemProps) {
  const theme = useAppTheme();
  const accessibilityLabel = `${title}, ${amount}, ${subtitle}`;
  const color = tone === 'income'
    ? theme.income
    : tone === 'transfer'
      ? theme.transfer
      : tone === 'refund'
        ? theme.primaryAction
        : theme.expense;
  const tint = tone === 'income'
    ? theme.tintIncome
    : tone === 'transfer'
      ? theme.tintTransfer
      : tone === 'refund'
        ? theme.tintPrimary
        : theme.tintExpense;

  const content = (
    <>
      <View style={[styles.accent, { backgroundColor: color }]} />
      <IconChip background={tint} color={color} icon={icon} iconSize={19} size={36} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.primaryText }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: theme.mutedText }]}>
          {subtitle}
        </Text>
      </View>
      <MoneyText style={styles.amount} tone={tone}>
        {amount}
      </MoneyText>
    </>
  );

  if (onPress) {
    return (
      <PressableScale
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.row, { backgroundColor: theme.surface }]}>
        {content}
      </PressableScale>
    );
  }

  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={[styles.row, { backgroundColor: theme.surface }]}>
      {content}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 48,
    paddingHorizontal: spacing.md - spacing.xs,
    paddingVertical: spacing.sm + 1,
  },
  accent: {
    borderRadius: 2,
    height: 30,
    width: 3,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.sans.semibold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  subtitle: {
    fontFamily: fonts.sans.medium,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  amount: {
    ...typography.moneyRow,
    flexShrink: 1,
    textAlign: 'right',
  },
});
