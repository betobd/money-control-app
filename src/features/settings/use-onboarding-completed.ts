import { useSyncExternalStore } from 'react';

import { isOnboardingCompleted, subscribeToOnboardingStatus } from './onboarding-status';

/** Whether the welcome flow is done, re-rendering the caller when it changes. */
export function useOnboardingCompleted(): boolean {
  return useSyncExternalStore(subscribeToOnboardingStatus, isOnboardingCompleted, isOnboardingCompleted);
}
