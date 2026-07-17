import { useCallback, useRef, useState } from 'react';

import { useFinancialDataRefresh } from '@/hooks/use-financial-data-refresh';
import { reportService } from './reports';
import type { ReportData, ReportPeriodSelection } from './report.types';

export function useReports(selection: ReportPeriodSelection) {
  const [data, setData] = useState<ReportData>();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string>();
  const sequence = useRef(0);

  const reload = useCallback(async (asRefresh = false) => {
    const request = ++sequence.current;
    if (asRefresh) setRefreshing(true);
    else setLoading(true);
    setError(undefined);
    try {
      const next = await reportService.load(selection);
      if (request === sequence.current) setData(next);
    } catch (cause) {
      if (request === sequence.current) {
        setError(cause instanceof Error ? cause.message : 'Unable to load reports.');
      }
    } finally {
      if (request === sequence.current) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, [selection]);

  useFinancialDataRefresh(reload);

  return {
    data,
    error,
    loading,
    refreshing,
    reload: () => reload(false),
    refresh: () => reload(true),
  };
}
