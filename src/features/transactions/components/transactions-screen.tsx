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
import { borderRadii, spacing, typography } from '@/constants/theme';
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
import { getIntlLocale, type Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
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
import { Button } from '@/components/button';

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
  const t = useMessages();

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
      <PrimaryScreenHeader title={t.common.tabs.transactions} />
      <View style={styles.controls}>
        <SearchField onChangeText={changeSearch} onClear={clearSearch} value={search} />
        <View style={styles.filterSummary}>
          <Text style={[styles.dateSummary, { color: theme.secondaryText }]}>
            {t.transactions.list.dateSummary(formatTransactionDateRange(activeDateRange))}
          </Text>
          <View style={styles.activeCountRow}>
            <Text accessibilityLiveRegion="polite" style={[styles.activeCount, { color: theme.mutedText }]}>
              {t.transactions.list.activeFilters(activeFilterCount)}
            </Text>
            {activeFilterCount > 0 ? (
              <Pressable accessibilityRole="button" onPress={clearFilters} style={styles.inlineAction}>
                <Text style={[styles.inlineActionLabel, { color: theme.primaryAction }]}>{t.transactions.list.clearAll}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        <View style={styles.filters}>
          <Pressable
            accessibilityHint={t.transactions.list.openFiltersHint}
            accessibilityLabel={t.transactions.list.openFilters}
            accessibilityRole="button"
            hitSlop={spacing.xs}
            onPress={openFullFilters}
            style={[styles.fullFiltersButton, { backgroundColor: theme.elevatedSurface }]}>
            <SymbolView
              name={{ ios: 'slider.horizontal.3', android: 'tune', web: 'tune' }}
              size={16}
              tintColor={theme.secondaryText}
            />
            <Text numberOfLines={1} style={[styles.fullFiltersLabel, { color: theme.secondaryText }]}>{t.transactions.list.filters}</Text>
          </Pressable>
          {filters.type ? (
            <AppliedFilterBadge
              accessibilityLabel={t.transactions.list.appliedType(t.transactions.types[filters.type])}
              icon="type"
              label={t.transactions.types[filters.type]}
            />
          ) : null}
          {filters.status ? (
            <AppliedFilterBadge
              accessibilityLabel={t.transactions.list.appliedStatus(t.transactions.status[filters.status])}
              icon="status"
              label={t.transactions.status[filters.status]}
            />
          ) : null}
          {filters.accountId ? (
            <AppliedFilterBadge
              accessibilityLabel={t.transactions.list.appliedAccount(filterOptionLabel(t, account))}
              icon="account"
              label={filterOptionLabel(t, account)}
            />
          ) : null}
          {filters.categoryId ? (
            <AppliedFilterBadge
              accessibilityLabel={t.transactions.list.appliedCategory(filterOptionLabel(t, category))}
              icon="category"
              label={filterOptionLabel(t, category)}
            />
          ) : null}
          {filters.datePreset !== 'all-time' ? (
            <AppliedFilterBadge
              accessibilityLabel={t.transactions.list.appliedDate(dateChipLabel(t, filters, activeDateRange))}
              icon="date"
              label={dateChipLabel(t, filters, activeDateRange)}
            />
          ) : null}
        </View>
        {loading && transactions.length > 0 ? (
          <View accessibilityLabel={t.transactions.list.refreshingA11y} style={styles.refreshing}>
            <ActivityIndicator color={theme.primaryAction} size="small" />
            <Text style={[styles.refreshingLabel, { color: theme.secondaryText }]}>{t.transactions.list.refreshing}</Text>
          </View>
        ) : null}
        {error && transactions.length > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => void reload()} style={styles.errorBanner}>
            <Text style={[styles.errorBannerText, { color: theme.destructive }]}>{t.transactions.list.tapToRetry(error)}</Text>
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
              <Button
                accessibilityLabel={t.transactions.list.loadMoreA11y}
                busy={loadingMore}
                label={t.transactions.list.loadMore}
                onPress={() => void loadMore()}
                variant="tonal"
              />
            ) : (
              <Text style={[styles.endLabel, { color: theme.mutedText }]}>{t.transactions.list.endOfHistory}</Text>
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

function filterOptionLabel(t: Messages, option: { isArchived: boolean; name: string } | undefined): string {
  if (!option) return t.transactions.list.selected;
  return option.isArchived ? t.transactions.list.archived(option.name) : option.name;
}

function dateChipLabel(
  t: Messages,
  filters: TransactionListFilters,
  range: TransactionDateRange,
): string {
  if (filters.datePreset === 'all-time') return t.transactions.list.date;
  if (filters.datePreset === 'last-30-days') return t.transactions.filters.last30Days;
  if (filters.datePreset === 'custom') return formatTransactionDateRange(range);
  if (!range.dateFrom) return t.transactions.list.date;

  return new Intl.DateTimeFormat(getIntlLocale(), {
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
  inlineActionLabel: { ...typography.captionStrong },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  fullFiltersButton: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 34,
    paddingHorizontal: spacing.sm + spacing.xs,
  },
  fullFiltersLabel: { ...typography.captionStrong },
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
  transactionItem: { paddingBottom: spacing.sm - 2 },
  emptyArea: { gap: spacing.sm },
  footer: { alignItems: 'center', paddingVertical: spacing.xl },
  endLabel: { ...typography.caption, textAlign: 'center' },
});
