import { useCallback, useEffect, useState } from 'react';

import { getMessages } from '@/i18n/messages';

import { subscribeToNotificationSettingsChanges } from './notification-settings.events';
import { notificationSettingsService, notificationTestService } from './notifications';
import type { NotificationCategory } from './notification-settings.service';
import type {
  NotificationContentMode,
  NotificationPermissionState,
  NotificationSettings,
} from './notification.types';

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>();
  const [permission, setPermission] = useState<NotificationPermissionState>('not-determined');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [result, setResult] = useState<string>();

  const reload = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    try {
      const [nextSettings, nextPermission] = await Promise.all([
        notificationSettingsService.get(),
        notificationSettingsService.getPermissionStatus(),
      ]);
      setSettings(nextSettings);
      setPermission(nextPermission);
    } catch {
      setError(getMessages().notifications.results.loadFailed);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void reload(), 0);
    const unsubscribe = subscribeToNotificationSettingsChanges((next) => setSettings(next));
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [reload]);

  const run = useCallback(async <T,>(operation: () => Promise<T>, success?: string): Promise<T | undefined> => {
    if (busy) return undefined;
    setBusy(true);
    setError(undefined);
    setResult(undefined);
    try {
      const value = await operation();
      if (success) setResult(success);
      return value;
    } catch {
      setError(getMessages().notifications.results.changeFailed);
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [busy]);

  const results = () => getMessages().notifications.results;

  return {
    settings,
    permission,
    loading,
    busy,
    error,
    result,
    reload,
    enable: () => run(async () => {
      const value = await notificationSettingsService.enableNotifications();
      setPermission(value.permission);
      return value;
    }, results().permissionUpdated),
    disable: () => run(() => notificationSettingsService.disableNotifications(), results().paused),
    setCategory: (category: NotificationCategory, enabled: boolean) => run(async () => {
      const value = await notificationSettingsService.setCategoryEnabled(category, enabled);
      setPermission(value.permission);
      return value;
    }, enabled ? results().reminderEnabled : results().reminderDisabled),
    setRecurringTime: (value: string) => run(() => notificationSettingsService.setRecurringTime(value), results().recurringTimeUpdated),
    setAdvanceDays: (value: 0 | 1 | 2 | 3) => run(() => notificationSettingsService.setRecurringAdvanceDays(value), results().advanceUpdated),
    setDailyTime: (value: string) => run(() => notificationSettingsService.setDailyTime(value), results().dailyTimeUpdated),
    setContentMode: (value: NotificationContentMode) => run(() => notificationSettingsService.setContentMode(value), results().privacyUpdated),
    setCardClosing: (value: boolean) => run(() => notificationSettingsService.setCreditCardClosingReminderEnabled(value), results().cardClosingUpdated),
    setCardDueOffset: (offset: 3 | 1 | 0, value: boolean) => run(() => notificationSettingsService.setCreditCardDueOffsetEnabled(offset, value), results().cardDueUpdated),
    openSettings: () => run(() => notificationSettingsService.openSystemSettings()),
    test: () => run(async () => {
      const value = await notificationTestService.schedule();
      if (value === 'permission-required') throw new Error('Permission required.');
      return value;
    }, results().testScheduled),
    cancelTest: () => run(() => notificationTestService.cancel(), results().testCanceled),
    clearError: () => run(() => notificationSettingsService.clearError()),
  };
}
