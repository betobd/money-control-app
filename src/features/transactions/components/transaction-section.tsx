import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { TransactionListItem } from '@/features/transactions/components/transaction-list-item';
import type { TransactionSection as TransactionSectionModel } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type TransactionSectionProps = {
  section: TransactionSectionModel;
};

export function TransactionSection({ section }: TransactionSectionProps) {
  const theme = useAppTheme();

  return (
    <View accessibilityLabel={section.label} style={styles.section}>
      <Text accessibilityRole="header" style={[styles.label, { color: theme.secondaryText }]}>
        {section.label}
      </Text>
      <View style={styles.rows}>
        {section.transactions.map((transaction) => (
          <TransactionListItem key={transaction.id} transaction={transaction} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  rows: {
    gap: spacing.sm,
  },
});
