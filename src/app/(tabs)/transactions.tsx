import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { spacing, typography } from '@/constants/theme';
import { FilterChip } from '@/features/transactions/components/filter-chip';
import { SearchField } from '@/features/transactions/components/search-field';
import { TransactionSection } from '@/features/transactions/components/transaction-section';
import { transactionHistoryMock } from '@/features/transactions/transactions.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TransactionsScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer contentStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.brand, { color: theme.primaryText }]}>
        Money Control
      </Text>

      <View style={styles.controls}>
        <SearchField />
        <View accessibilityLabel="Transaction filters" style={styles.filters}>
          <FilterChip icon="category" label="Category" />
          <FilterChip icon="account" label="Account" />
          <FilterChip icon="date" label="Date range" />
        </View>
      </View>

      <View style={styles.sections}>
        {transactionHistoryMock.map((section) => (
          <TransactionSection key={section.id} section={section} />
        ))}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  brand: {
    ...typography.sectionTitle,
    textAlign: 'center',
  },
  controls: {
    gap: spacing.md,
  },
  filters: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  sections: {
    gap: spacing.lg,
  },
});
