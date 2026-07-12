import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { spacing } from '@/constants/theme';
import { FilterChip } from '@/features/transactions/components/filter-chip';
import { SearchField } from '@/features/transactions/components/search-field';
import { TransactionSection } from '@/features/transactions/components/transaction-section';
import { groupTransactions } from '@/features/transactions/transaction-presentation';
import { useTransactions } from '@/features/transactions/use-transactions';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function TransactionsScreen() {
  const theme = useAppTheme();
  const { transactions, loading, error } = useTransactions();
  const sections = groupTransactions(transactions);
  return (
    <ScreenContainer contentStyle={styles.content}>
      <PrimaryScreenHeader />

      <View style={styles.controls}>
        <SearchField />
        <Text style={[styles.preview, { color: theme.mutedText }]}>Search and filters are coming next.</Text>
        <View accessibilityLabel="Transaction filters" style={styles.filters}>
          <FilterChip icon="category" label="Category" />
          <FilterChip icon="account" label="Account" />
          <FilterChip icon="date" label="Date range" />
        </View>
      </View>

      {loading ? <ActivityIndicator color={theme.primaryAction} /> : null}
      {error ? <Text style={{ color: theme.destructive }}>{error}</Text> : null}
      {!loading && !error && sections.length === 0 ? <Text style={[styles.empty, { color: theme.secondaryText }]}>No transactions yet. Use Add to record an expense, income, or transfer.</Text> : null}
      <View style={styles.sections}>
        {sections.map((section) => (
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
  preview: { fontSize: 12 },
  empty: { paddingVertical: spacing.xl, textAlign: 'center' },
});
