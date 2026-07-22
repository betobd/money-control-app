import { useCallback, useEffect, useState } from 'react';

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
      setError('Notification settings could not be loaded.');
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
      setError('The notification change could not be completed. Try again.');
      return undefined;
    } finally {
      setBusy(false);
    }
  }, [busy]);

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
    }, 'Notification permission updated.'),
    disable: () => run(() => notificationSettingsService.disableNotifications(), 'All Money Control reminders are paused.'),
    setCategory: (category: NotificationCategory, enabled: boolean) => run(async () => {
      const value = await notificationSettingsService.setCategoryEnabled(category, enabled);
      setPermission(value.permission);
      return value;
    }, enabled ? 'Reminder enabled.' : 'Reminder disabled.'),
    setRecurringTime: (value: string) => run(() => notificationSettingsService.setRecurringTime(value), 'Recurring reminder time updated.'),
    setAdvanceDays: (value: 0 | 1 | 2 | 3) => run(() => notificationSettingsService.setRecurringAdvanceDays(value), 'Advance notice updated.'),
    setDailyTime: (value: string) => run(() => notificationSettingsService.setDailyTime(value), 'Daily reminder time updated.'),
    setContentMode: (value: NotificationContentMode) => run(() => notificationSettingsService.setContentMode(value), 'Notification privacy updated.'),
    setCardClosing: (value: boolean) => run(() => notificationSettingsService.setCreditCardClosingReminderEnabled(value), 'Card closing reminder updated.'),
    setCardDueOffset: (offset: 3 | 1 | 0, value: boolean) => run(() => notificationSettingsService.setCreditCardDueOffsetEnabled(offset, value), 'Card due reminder updated.'),
    openSettings: () => run(() => notificationSettingsService.openSystemSettings()),
    test: () => run(async () => {
      const value = await notificationTestService.schedule();
      if (value === 'permission-required') throw new Error('Permission required.');
      return value;
    }, 'Test notification scheduled for about five seconds from now.'),
    cancelTest: () => run(() => notificationTestService.cancel(), 'Test notification canceled.'),
    clearError: () => run(() => notificationSettingsService.clearError()),
  };
}
