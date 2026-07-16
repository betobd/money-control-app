import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';

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
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load recurring transactions.');
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

  return { rules, pending, history, loading, error, limited, reload };
}
