import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

import { currentBudgetMonth } from '@/features/budgets/budget-month';
import type { ReportPeriodSelection } from '@/features/reports/report.types';
import { createDefaultTransactionListFilters } from '@/features/transactions/transaction-list-filters';
import type { TransactionListFilters } from '@/features/transactions/transaction.types';
import { DataExportError } from './data-export.service';
import { dataExportService } from './data-exports';
import type {
  DataExportKind,
  DataExportOverview,
  ExportOperation,
  ExportResult,
  TransactionExportOptions,
} from './data-export.types';
import { ExportFileAdapterError } from './export-file.adapter';

function errorMessage(cause: unknown): string {
  if (cause instanceof DataExportError) return cause.message;
  if (cause instanceof ExportFileAdapterError) {
    return cause.fileGenerated
      ? `${cause.message} Money Control cannot confirm that a destination copy was saved.`
      : cause.message;
  }
  return 'The CSV export could not be completed. Your financial data was not changed. Try again.';
}

function successMessage(result: ExportResult): string {
  return `${result.fileName} was generated with ${result.rowCount.toLocaleString('en-US')} ${result.rowCount === 1 ? 'row' : 'rows'}. The native save/share interface closed; Money Control cannot tell whether you saved, shared, or cancelled there.`;
}

export function useDataExport() {
  const [transactionOptions, setTransactionOptions] = useState<TransactionExportOptions>(() => ({
    filters: createDefaultTransactionListFilters(),
    includeNotes: false,
  }));
  const [recurringIncludeNotes, setRecurringIncludeNotes] = useState(false);
  const [budgetMonth, setBudgetMonthValue] = useState(() => currentBudgetMonth());
  const [reportSelection, setReportSelection] = useState<ReportPeriodSelection>({ preset: 'current-month' });
  const [overview, setOverview] = useState<DataExportOverview>();
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [operation, setOperation] = useState<ExportOperation>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();
  const sequence = useRef(0);

  const loadOverview = useCallback(async (
    options = transactionOptions,
    month = budgetMonth,
  ) => {
    const request = ++sequence.current;
    setLoadingOverview(true);
    setError(undefined);
    try {
      const next = await dataExportService.getOverview(options, month);
      if (request === sequence.current) setOverview(next);
    } catch {
      if (request === sequence.current) {
        setError('Export counts could not be loaded. Try reopening this screen.');
      }
    } finally {
      if (request === sequence.current) setLoadingOverview(false);
    }
  }, [budgetMonth, transactionOptions]);

  useFocusEffect(useCallback(() => {
    void dataExportService.cleanupStaleFiles();
    void loadOverview();
  }, [loadOverview]));

  const applyTransactionFilters = useCallback((filters: TransactionListFilters) => {
    const next = { ...transactionOptions, filters };
    setTransactionOptions(next);
    void loadOverview(next, budgetMonth);
  }, [budgetMonth, loadOverview, transactionOptions]);

  const setIncludeTransactionNotes = useCallback((includeNotes: boolean) => {
    setTransactionOptions((current) => ({ ...current, includeNotes }));
  }, []);

  const setBudgetMonth = useCallback((month: string) => {
    setBudgetMonthValue(month);
    void loadOverview(transactionOptions, month);
  }, [loadOverview, transactionOptions]);

  const runExport = useCallback(async (
    kind: DataExportKind,
    action: () => Promise<ExportResult>,
  ) => {
    if (operation) return;
    setOperation(kind);
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await action();
      setNotice(successMessage(result));
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setOperation(null);
    }
  }, [operation]);

  return {
    applyTransactionFilters,
    budgetMonth,
    error,
    exportAccounts: () => runExport('accounts', () => dataExportService.exportAccounts()),
    exportBudgets: () => runExport('budgets', () => dataExportService.exportBudgets(budgetMonth)),
    exportCreditCardStatements: () => runExport(
      'credit-card-statements',
      () => dataExportService.exportCreditCardStatements(),
    ),
    exportRecurringRules: () => runExport(
      'recurring-rules',
      () => dataExportService.exportRecurringRules({ includeNotes: recurringIncludeNotes }),
    ),
    exportReport: () => runExport(
      'report-summary',
      () => dataExportService.exportReport(reportSelection),
    ),
    exportTransactions: () => runExport(
      'transactions',
      () => dataExportService.exportTransactions(transactionOptions),
    ),
    loadingOverview,
    notice,
    operation,
    overview,
    recurringIncludeNotes,
    reportSelection,
    setBudgetMonth,
    setIncludeTransactionNotes,
    setRecurringIncludeNotes,
    setReportSelection,
    transactionOptions,
  };
}
