import { useCallback, useRef, useState } from 'react';

import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { firstTransactionListPage } from './transaction-list-filters';
import { transactionService } from './transactions';
import type {
  TransactionFilterOptions,
  TransactionListCursor,
  TransactionListItem,
  TransactionListQuery,
} from './transaction.types';

const emptyFilterOptions: TransactionFilterOptions = { accounts: [], categories: [] };

export function useTransactions(query: TransactionListQuery) {
  const [transactions, setTransactions] = useState<TransactionListItem[]>([]);
  const [filterOptions, setFilterOptions] = useState<TransactionFilterOptions>(emptyFilterOptions);
  const [nextCursor, setNextCursor] = useState<TransactionListCursor | null>(null);
  const [databaseEmpty, setDatabaseEmpty] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>();
  const requestSequence = useRef(0);
  const loadMoreInFlight = useRef(false);

  const reload = useCallback(async () => {
    const request = ++requestSequence.current;
    loadMoreInFlight.current = false;
    setLoading(true);
    setError(undefined);
    try {
      const [page, options] = await Promise.all([
        transactionService.list(firstTransactionListPage(query)),
        transactionService.listFilterOptions(),
      ]);
      const isDatabaseEmpty = page.items.length === 0
        ? !(await transactionService.hasAny())
        : false;
      if (request !== requestSequence.current) return;
      setTransactions(page.items);
      setNextCursor(page.nextCursor);
      setFilterOptions(options);
      setDatabaseEmpty(isDatabaseEmpty);
    } catch (cause) {
      if (request !== requestSequence.current) return;
      setError(cause instanceof Error ? cause.message : 'Unable to load transactions.');
    } finally {
      if (request === requestSequence.current) setLoading(false);
    }
  }, [query]);

  const loadMore = useCallback(async () => {
    if (!nextCursor || loading || loadingMore || loadMoreInFlight.current) return;
    const request = requestSequence.current;
    loadMoreInFlight.current = true;
    setLoadingMore(true);
    setError(undefined);
    try {
      const page = await transactionService.list({ ...query, cursor: nextCursor });
      if (request !== requestSequence.current) return;
      setTransactions((current) => {
        const ids = new Set(current.map((transaction) => transaction.id));
        return [...current, ...page.items.filter((transaction) => !ids.has(transaction.id))];
      });
      setNextCursor(page.nextCursor);
    } catch (cause) {
      if (request !== requestSequence.current) return;
      setError(cause instanceof Error ? cause.message : 'Unable to load more transactions.');
    } finally {
      loadMoreInFlight.current = false;
      if (request === requestSequence.current) setLoadingMore(false);
    }
  }, [loading, loadingMore, nextCursor, query]);

  useFinancialDataRefresh(reload);

  return {
    transactions,
    filterOptions,
    databaseEmpty,
    loading,
    loadingMore,
    hasMore: nextCursor !== null,
    error,
    loadMore,
    reload,
  };
}
