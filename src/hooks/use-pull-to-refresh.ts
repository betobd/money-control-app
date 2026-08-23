import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Wraps a screen's `reload` in the state a `RefreshControl` needs.
 *
 * The spinner is driven by its own flag rather than the screen's `loading`
 * flag, so a pull only shows the pull spinner — the screen never falls back to
 * its full-screen loading state and the content stays visible while it re-reads.
 *
 * `reload` may be an inline arrow: it is read through an effect-synced ref, so
 * `onRefresh` keeps a stable identity without going stale.
 */
export function usePullToRefresh(reload: () => Promise<unknown> | unknown) {
  const [refreshing, setRefreshing] = useState(false);
  const mounted = useRef(true);
  const reloadRef = useRef(reload);

  useEffect(() => {
    reloadRef.current = reload;
  }, [reload]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void Promise.resolve(reloadRef.current()).finally(() => {
      if (mounted.current) setRefreshing(false);
    });
  }, []);

  return { refreshing, onRefresh };
}
