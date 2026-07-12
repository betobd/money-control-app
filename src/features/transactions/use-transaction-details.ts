import { useCallback, useState } from 'react';

import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { transactionService } from './transactions';
import type { TransactionListItem } from './transaction.types';

export function useTransactionDetails(id: string) {
  const [transaction, setTransaction] = useState<TransactionListItem | null>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setTransaction(await transactionService.get(id));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load transaction.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFinancialDataRefresh(reload);
  return { transaction, loading, error, reload };
}
