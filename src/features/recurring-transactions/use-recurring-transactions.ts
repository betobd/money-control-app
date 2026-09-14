import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

import { toUserMessage } from '@/errors/user-error';
import { subscribeToFinancialDataChanges } from '@/features/transactions/financial-data-events';
import { getMessages } from '@/i18n/messages';
import { subscribeToRecurringDataChanges } from './recurring-data-events';
import { recurringTransactionService } from './recurring-transactions';
import type {
  RecurringOccurrenceListItem,
  RecurringRuleListItem,
} from './recurring-transaction.types';

export function useRecurringTransactions() {
  const [rules, setRules] = useState<RecurringRuleListItem[]>([]);
  const [pending, setPending] = useState<RecurringOccurrenceListItem[]>([]);
  const [history, setHistory] = useState<RecurringOccurrenceListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [limited, setLimited] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const generation = await recurringTransactionService.generateDueOccurrences();
      const [nextRules, nextPending, nextHistory] = await Promise.all([
        recurringTransactionService.listRules(),
        recurringTransactionService.listPendingDue(),
        recurringTransactionService.listRecentOccurrences(),
      ]);
      setRules(nextRules);
      setPending(nextPending);
      setHistory(nextHistory);
      setLimited(generation.limitedRules > 0);
      setHasLoaded(true);
    } catch (cause) {
      setError(toUserMessage(cause, getMessages().recurring.loadError));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void reload();
  }, [reload]));

  useEffect(() => subscribeToRecurringDataChanges(() => {
    void reload();
  }), [reload]);

  useEffect(() => subscribeToFinancialDataChanges(() => {
    void reload();
  }), [reload]);

  return { rules, pending, history, loading, hasLoaded, error, limited, reload };
}
