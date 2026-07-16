import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SymbolView } from 'expo-symbols';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import {
  buildTransactionListQuery,
  countActiveTransactionFilters,
  createClearedTransactionListFilters,
  createDefaultTransactionListFilters,
  getTransactionFilterDateRange,
} from '@/features/transactions/transaction-list-filters';
import {
  formatTransactionDateRange,
  type TransactionDateRange,
} from '@/features/transactions/transaction-date';
import { groupTransactions } from '@/features/transactions/transaction-presentation';
import type {
  TransactionListFilters,
  TransactionListItem as TransactionItem,
} from '@/features/transactions/transaction.types';
import { useTransactions } from '@/features/transactions/use-transactions';
import { useAppTheme } from '@/hooks/use-app-theme';
import { AppliedFilterBadge } from './filter-chip';
import { SearchField } from './search-field';
import { TransactionFilterModal } from './transaction-filter-modal';
import { TransactionListItem } from './transaction-list-item';
import {
  EmptyTransactionsState,
  LoadingTransactionRow,
  NoTransactionResultsState,
  TransactionErrorState,
} from './transaction-states';

const SEARCH_DEBOUNCE_MS = 250;

export function TransactionsScreen() {
  const [search, setSearch] = useState('');
  const [querySearch, setQuerySearch] = useState('');
  const [filters, setFilters] = useState<TransactionListFilters>(() => createDefaultTransactionListFilters());
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterModalKey, setFilterModalKey] = useState(0);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  const query = useMemo(
    () => buildTransactionListQuery(filters, querySearch),
    [filters, querySearch],
  );
  const {
    transactions,
    filterOptions,
    databaseEmpty,
    loading,
    loadingMore,
    hasMore,
    error,
    loadMore,
    reload,
  } = useTransactions(query);
  const sections = useMemo(
    () => groupTransactions(transactions).map(({ id, label, transactions: data }) => ({ id, label, data })),
    [transactions],
  );
  const activeFilterCount = countActiveTransactionFilters(filters);
  const activeDateRange = getTransactionFilterDateRange(filters);

  useEffect(() => () => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
  }, []);

  const changeSearch = useCallback((value: string) => {
    setSearch(value);
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const normalized = value.trim();
    if (!normalized) {
      setQuerySearch('');
      searchTimer.current = null;
      return;
    }
    searchTimer.current = setTimeout(() => {
      setQuerySearch(normalized);
      searchTimer.current = null;
    }, SEARCH_DEBOUNCE_MS);
  }, []);

  const clearSearch = useCallback(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = null;
    setSearch('');
    setQuerySearch('');
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(createClearedTransactionListFilters());
    setFilterModalVisible(false);
  }, []);

  const openFullFilters = useCallback(() => {
    setFilterModalKey((value) => value + 1);
    setFilterModalVisible(true);
  }, []);

  const account = filterOptions.accounts.find((option) => option.id === filters.accountId);
  const category = filterOptions.categories.find((option) => option.id === filters.categoryId);

  const listHeader = (
    <View style={styles.headerContent}>
      <PrimaryScreenHeader />
      <View style={styles.controls}>
        <SearchField onChangeText={changeSearch} onClear={clearSearch} value={search} />
        <View style={styles.filterSummary}>
          <Text style={[styles.dateSummary, { color: theme.secondaryText }]}>
            Date: {formatTransactionDateRange(activeDateRange)}
          </Text>
          <View style={styles.activeCountRow}>
            <Text accessibilityLiveRegion="polite" style={[styles.activeCount, { color: theme.mutedText }]}>
              {activeFilterCount} active {activeFilterCount === 1 ? 'filter' : 'filters'}
            </Text>
            {activeFilterCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.inlineAction}>
                <Text style={[styles.inlineActionLabel, { color: theme.primaryAction }]}>Clear all</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.filters}>
          <Pressable
            accessibilityHint="Opens the complete transaction filters screen"
            accessibilityLabel="Open all transaction filters"
            accessibilityRole="button"
            hitSlop={spacing.xs}
            onPress={openFullFilters}
            style={[
              styles.fullFiltersButton,
              { backgroundColor: theme.surface, borderColor: theme.border },
            ]}>
            <SymbolView
              name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
              size={16}
              tintColor={theme.secondaryText}
            />
            <Text numberOfLines={1} style={[styles.fullFiltersLabel, { color: theme.secondaryText }]}>Filters</Text>
          </Pressable>
          {filters.type ? (
            <AppliedFilterBadge
              accessibilityLabel={`Transaction type filter applied: ${capitalize(filters.type)}`}
              icon="type"
              label={capitalize(filters.type)}
            />
          ) : null}
          {filters.status ? (
            <AppliedFilterBadge
              accessibilityLabel={`Transaction status filter applied: ${capitalize(filters.status)}`}
              icon="status"
              label={capitalize(filters.status)}
            />
          ) : null}
          {filters.accountId ? (
            <AppliedFilterBadge
              accessibilityLabel={`Transaction account filter applied: ${filterOptionLabel(account)}`}
              icon="account"
              label={filterOptionLabel(account)}
            />
          ) : null}
          {filters.categoryId ? (
            <AppliedFilterBadge
              accessibilityLabel={`Transaction category filter applied: ${filterOptionLabel(category)}`}
              icon="category"
              label={filterOptionLabel(category)}
            />
          ) : null}
          {filters.datePreset !== 'all-time' ? (
            <AppliedFilterBadge
              accessibilityLabel={`Transaction date filter applied: ${dateChipLabel(filters, activeDateRange)}`}
              icon="date"
              label={dateChipLabel(filters, activeDateRange)}
            />
          ) : null}
        </View>
        {loading && transactions.length > 0 ? (
          <View accessibilityLabel="Refreshing transactions" style={styles.refreshing}>
            <ActivityIndicator color={theme.primaryAction} size="small" />
            <Text style={[styles.refreshingLabel, { color: theme.secondaryText }]}>Refreshing…</Text>
          </View>
        ) : null}
        {error && transactions.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => void reload()} style={styles.errorBanner}>
            <Text style={[styles.errorBannerText, { color: theme.destructive }]}>{error} Tap to retry.</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground }]}>
      <SectionList<TransactionItem, { id: string; label: string }>
        contentContainerStyle={[
          styles.content,
          { paddingBottom: spacing.xxl, paddingTop: insets.top + spacing.md },
        ]}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={(
          <View style={styles.emptyArea}>
            {loading ? (
              <>
                <LoadingTransactionRow />
                <LoadingTransactionRow />
                <LoadingTransactionRow />
              </>
            ) : error ? (
              <TransactionErrorState message={error} onRetry={() => void reload()} />
            ) : databaseEmpty ? (
              <EmptyTransactionsState />
            ) : (
              <NoTransactionResultsState
                hasSearch={querySearch.length > 0}
                onClearFilters={clearFilters}
                onClearSearch={clearSearch}
              />
            )}
          </View>
        )}
        ListFooterComponent={transactions.length > 0 ? (
          <View style={styles.footer}>
            {hasMore ? (
              <Pressable
                accessibilityLabel="Load more transactions"
                accessibilityRole="button"
                accessibilityState={{ disabled: loadingMore }}
                disabled={loadingMore}
                onPress={() => void loadMore()}
                style={styles.loadMoreButton}>
                {loadingMore ? <ActivityIndicator color={theme.primaryAction} size="small" /> : null}
                <Text style={[styles.loadMoreLabel, { color: theme.primaryAction }]}>
                  {loadingMore ? 'Loading…' : 'Load more'}
                </Text>
              </Pressable>
            ) : (
              <Text style={[styles.endLabel, { color: theme.mutedText }]}>End of transaction history</Text>
            )}
          </View>
        ) : null}
        ListHeaderComponent={listHeader}
        onEndReached={() => { if (hasMore) void loadMore(); }}
        onEndReachedThreshold={0.25}
        renderItem={({ item }) => (
          <View style={styles.transactionItem}>
            <TransactionListItem transaction={item} />
          </View>
        )}
        renderSectionHeader={({ section }) => (
          <Text accessibilityRole="header" style={[styles.sectionLabel, { backgroundColor: theme.appBackground, color: theme.secondaryText }]}>
            {section.label}
          </Text>
        )}
        sections={sections}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled
      />
      <TransactionFilterModal
        key={`full-${filterModalKey}`}
        filterOptions={filterOptions}
        filters={filters}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setFilterModalVisible(false);
        }}
        onClearAll={clearFilters}
        onClose={() => setFilterModalVisible(false)}
        visible={filterModalVisible}
      />
    </View>
  );
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function filterOptionLabel(option: { isArchived: boolean; name: string } | undefined): string {
  if (!option) return 'Selected';
  return `${option.name}${option.isArchived ? ' (Archived)' : ''}`;
}

function dateChipLabel(
  filters: TransactionListFilters,
  range: TransactionDateRange,
): string {
  if (filters.datePreset === 'all-time') return 'Date';
  if (filters.datePreset === 'last-30-days') return 'Last 30 days';
  if (filters.datePreset === 'custom') return formatTransactionDateRange(range);
  if (!range.dateFrom) return 'Date';

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    timeZone: 'UTC',
    year: 'numeric',
  }).format(new Date(`${range.dateFrom}T00:00:00Z`));
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: spacing.md },
  headerContent: { gap: spacing.lg, paddingBottom: spacing.lg },
  controls: { gap: spacing.md },
  filterSummary: { gap: spacing.xs },
  dateSummary: { ...typography.caption },
  activeCountRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  activeCount: { ...typography.label },
  inlineAction: { alignItems: 'center', justifyContent: 'center', minHeight: 44, paddingHorizontal: spacing.sm },
  inlineActionLabel: { ...typography.caption, fontWeight: '700' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fullFiltersButton: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 40,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  fullFiltersLabel: { ...typography.caption, fontWeight: '700' },
  refreshing: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  refreshingLabel: { ...typography.caption },
  errorBanner: { minHeight: 48, justifyContent: 'center' },
  errorBannerText: { ...typography.caption },
  sectionLabel: {
    ...typography.label,
    paddingBottom: spacing.sm,
    paddingTop: spacing.md,
    textTransform: 'uppercase',
  },
  transactionItem: { paddingBottom: spacing.md },
  emptyArea: { gap: spacing.sm },
  footer: { alignItems: 'center', paddingVertical: spacing.xl },
  loadMoreButton: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingHorizontal: spacing.lg },
  loadMoreLabel: { ...typography.body, fontWeight: '700' },
  endLabel: { ...typography.caption, textAlign: 'center' },
});
