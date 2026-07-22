import { useCallback, useState } from 'react';

import { useFocusEffect } from 'expo-router';
import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { subscribeToCreditCardDataChanges } from './credit-card-data-events';
import { creditCardService } from './credit-cards';
import type { CreditCardDetails } from './credit-card.types';

export function useCreditCard(accountId: string) {
  const [details, setDetails] = useState<CreditCardDetails | null>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      setDetails(await creditCardService.getDetails(accountId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load credit card.');
    } finally {
      setLoading(false);
    }
  }, [accountId]);

  useFinancialDataRefresh(reload);
  useFocusEffect(useCallback(() => subscribeToCreditCardDataChanges(() => void reload()), [reload]));

  return { details, loading, error, reload };
}
