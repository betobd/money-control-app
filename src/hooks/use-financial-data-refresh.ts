import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect } from 'react';

import { subscribeToFinancialDataChanges } from '@/features/transactions/financial-data-events';

export function useFinancialDataRefresh(load: () => Promise<void>): void {
  useFocusEffect(useCallback(() => { void load(); }, [load]));
  useEffect(() => subscribeToFinancialDataChanges(() => { void load(); }), [load]);
}
