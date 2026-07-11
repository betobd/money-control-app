import type { ReactNode } from 'react';
import { StyleSheet, Text, type TextStyle } from 'react-native';

import { typography } from '@/constants/theme';
import type { FinancialTone } from '@/features/home/home-dashboard.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

type MoneyTextProps = {
  children: ReactNode;
  tone?: FinancialTone;
  style?: TextStyle;
};

export function MoneyText({ children, tone = 'default', style }: MoneyTextProps) {
  const theme = useAppTheme();
  const color = tone === 'income' ? theme.income : tone === 'expense' ? theme.expense : theme.primaryText;

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.7}
      numberOfLines={1}
      style={[styles.money, { color }, style]}>
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  money: {
    ...typography.money,
    fontVariant: ['tabular-nums'],
  },
});
