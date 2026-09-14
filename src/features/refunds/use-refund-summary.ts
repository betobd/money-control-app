import { useCallback, useState } from 'react';

import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { getMessages } from '@/i18n/messages';
import { refundService } from './refunds';
import type { RefundSummary } from './refund.types';

export function useRefundSummary(originalTransactionId: string | null) {
  const [summary, setSummary] = useState<RefundSummary | null>();
  const [error, setError] = useState<string>();

  const reload = useCallback(async () => {
    if (!originalTransactionId) {
      setSummary(null);
      return;
    }
    try {
      setError(undefined);
      setSummary(await refundService.summarize(originalTransactionId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : getMessages().refunds.errors.unableToLoadSummary);
    }
  }, [originalTransactionId]);

  useFinancialDataRefresh(reload);
  return { summary, error, reload };
}
