import {
  bogotaToday,
  resolveTransactionDateRange,
  type TransactionDateRange,
} from './transaction-date';
import type {
  TransactionListFilters,
  TransactionListQuery,
} from './transaction.types';

export function createDefaultTransactionListFilters(
  today = bogotaToday(),
): TransactionListFilters {
  return {
    type: null,
    status: null,
    accountId: null,
    categoryId: null,
    datePreset: 'current-month',
    customDateFrom: today,
    customDateTo: today,
  };
}

export function createClearedTransactionListFilters(
  today = bogotaToday(),
): TransactionListFilters {
  return {
    ...createDefaultTransactionListFilters(today),
    datePreset: 'all-time',
  };
}

export function countActiveTransactionFilters(filters: TransactionListFilters): number {
  return [
    filters.type,
    filters.status,
    filters.accountId,
    filters.categoryId,
    filters.datePreset === 'all-time' ? null : filters.datePreset,
  ].filter(Boolean).length;
}

export function buildTransactionListQuery(
  filters: TransactionListFilters,
  search: string,
  today = bogotaToday(),
): TransactionListQuery {
  const range = resolveTransactionDateRange(
    filters.datePreset,
    today,
    filters.customDateFrom,
    filters.customDateTo,
  );
  return {
    search,
    types: filters.type ? [filters.type] : undefined,
    statuses: filters.status ? [filters.status] : undefined,
    accountId: filters.accountId ?? undefined,
    categoryId: filters.categoryId ?? undefined,
    ...range,
  };
}

export function getTransactionFilterDateRange(
  filters: TransactionListFilters,
  today = bogotaToday(),
): TransactionDateRange {
  return resolveTransactionDateRange(
    filters.datePreset,
    today,
    filters.customDateFrom,
    filters.customDateTo,
  );
}

export function firstTransactionListPage(query: TransactionListQuery): TransactionListQuery {
  return { ...query, cursor: undefined };
}
