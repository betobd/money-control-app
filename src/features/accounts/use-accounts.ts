import { useCallback, useState } from 'react';

import { accountService } from './accounts';
import type { AccountWithBalance } from './account.types';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';

export function useAccounts() {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setAccounts(await accountService.list(true));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load accounts.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFinancialDataRefresh(load);

  return { accounts, error, loading, reload: load };
}
