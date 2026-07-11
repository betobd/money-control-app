import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { MoneyText } from '@/features/home/components/money-text';
import type { FinancialTone } from '@/features/home/home-dashboard.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

type TransactionListItemProps = {
  title: string;
  subtitle: string;
  amount: string;
  tone: Exclude<FinancialTone, 'default'>;
  icon: SymbolViewProps['name'];
  showDivider?: boolean;
};

export function TransactionListItem({
  title,
  subtitle,
  amount,
  tone,
  icon,
  showDivider = false,
}: TransactionListItemProps) {
  const theme = useAppTheme();
  const iconColor = tone === 'income' ? theme.income : theme.expense;

  return (
    <View style={[styles.row, showDivider && { borderBottomColor: theme.border, borderBottomWidth: borderWidths.thin }]}>
      <View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView name={icon} size={22} tintColor={iconColor} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.primaryText }]}>
          {title}
        </Text>
        <Text numberOfLines={1} style={[styles.subtitle, { color: theme.secondaryText }]}>
          {subtitle}
        </Text>
      </View>
      <MoneyText style={styles.amount} tone={tone}>
        {amount}
      </MoneyText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 84,
    paddingVertical: spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  subtitle: {
    ...typography.caption,
  },
  amount: {
    flexShrink: 1,
    fontSize: 17,
    textAlign: 'right',
  },
});
