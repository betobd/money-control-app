import { router, type Href } from 'expo-router';
import { useEffect } from 'react';
import { AppState } from 'react-native';

import { subscribeToRecurringDataChanges } from '@/features/recurring-transactions/recurring-data-events';
import { subscribeToFinancialDataChanges } from '@/features/transactions/financial-data-events';
import { subscribeToNotificationSettingsChanges } from './notification-settings.events';
import { subscribeToCreditCardDataChanges } from '@/features/credit-cards/credit-card-data-events';
import {
  localNotificationAdapter,
  notificationCoordinator,
  notificationNavigationService,
  notificationRepository,
} from './notifications';
import type { LocalNotificationResponse } from './notification.types';

export function NotificationRuntime({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    let active = true;
    let responseQueue = Promise.resolve();

    const handleResponse = (response: LocalNotificationResponse) => {
      responseQueue = responseQueue.then(async () => {
        try {
          const route = await notificationNavigationService.resolve(response);
          if (!active || !route) return;
          router.push(route as Href);
        } catch {
          await notificationRepository.recordError('navigation-failed', new Date().toISOString()).catch(() => undefined);
        } finally {
          try {
            localNotificationAdapter.clearLastResponse();
          } catch {
            // The response was still consumed in memory; an unavailable native clear is non-fatal.
          }
        }
      });
    };

    void notificationCoordinator.start().then(() => {
      if (!active) return;
      try {
        const last = localNotificationAdapter.getLastResponse();
        if (last) handleResponse(last);
      } catch {
        void notificationRepository.recordError('navigation-failed', new Date().toISOString());
      }
    });
    const removeResponse = localNotificationAdapter.addResponseListener(handleResponse);
    const removeRecurring = subscribeToRecurringDataChanges(() => void notificationCoordinator.recurringChanged());
    const removeFinancial = subscribeToFinancialDataChanges((change) => void notificationCoordinator.financialChanged(change));
    const removeSettings = subscribeToNotificationSettingsChanges((settings) => void notificationCoordinator.settingsChanged(settings));
    const removeCreditCards = subscribeToCreditCardDataChanges(() => void notificationCoordinator.creditCardChanged());
    const appState = AppState.addEventListener('change', (state) => {
      if (state === 'active') void notificationCoordinator.appBecameActive();
    });
    return () => {
      active = false;
      removeResponse();
      removeRecurring();
      removeFinancial();
      removeSettings();
      removeCreditCards();
      appState.remove();
    };
  }, []);

  return children;
}
