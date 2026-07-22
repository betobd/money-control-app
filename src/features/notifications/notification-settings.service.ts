import type { NotificationPermissionService } from './notification-permission.service';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import { notifyNotificationSettingsChanged } from './notification-settings.events';
import {
  isValidTime,
  type NotificationContentMode,
  type NotificationPermissionState,
  type NotificationSettings,
  type NotificationSettingsUpdate,
} from './notification.types';

export type NotificationCategory = 'recurring' | 'budgets' | 'daily';

export class NotificationSettingsValidationError extends Error {}

export class NotificationSettingsService {
  constructor(
    private readonly repository: NotificationSettingsRepository,
    private readonly permissions: NotificationPermissionService,
    private readonly now = () => new Date().toISOString(),
  ) {}

  get(): Promise<NotificationSettings> {
    return this.repository.get();
  }

  getPermissionStatus(): Promise<NotificationPermissionState> {
    return this.permissions.getStatus();
  }

  openSystemSettings(): Promise<void> {
    return this.permissions.openSystemSettings();
  }

  async enableNotifications(): Promise<{ settings: NotificationSettings; permission: NotificationPermissionState }> {
    const permission = await this.permissions.request();
    const settings = await this.update({
      permissionPrompted: true,
      notificationsEnabled: permission === 'granted',
    });
    return { settings, permission };
  }

  disableNotifications(): Promise<NotificationSettings> {
    return this.update({ notificationsEnabled: false });
  }

  async setCategoryEnabled(
    category: NotificationCategory,
    enabled: boolean,
  ): Promise<{ settings: NotificationSettings; permission: NotificationPermissionState }> {
    let permission = await this.permissions.getStatus();
    if (enabled && permission !== 'granted') {
      permission = await this.permissions.request();
      if (permission !== 'granted') {
        const settings = await this.update({ permissionPrompted: true, notificationsEnabled: false });
        return { settings, permission };
      }
    }
    const field = category === 'recurring'
      ? 'recurringRemindersEnabled'
      : category === 'budgets'
        ? 'budgetAlertsEnabled'
        : 'dailyReminderEnabled';
    const settings = await this.update({
      [field]: enabled,
      ...(enabled ? { notificationsEnabled: true, permissionPrompted: true } : {}),
    });
    return { settings, permission };
  }

  setRecurringTime(value: string): Promise<NotificationSettings> {
    this.assertTime(value);
    return this.update({ recurringReminderTime: value });
  }

  setRecurringAdvanceDays(value: 0 | 1 | 2 | 3): Promise<NotificationSettings> {
    if (![0, 1, 2, 3].includes(value)) throw new NotificationSettingsValidationError('Advance notice must be between zero and three days.');
    return this.update({ recurringAdvanceDays: value });
  }

  setDailyTime(value: string): Promise<NotificationSettings> {
    this.assertTime(value);
    return this.update({ dailyReminderTime: value });
  }

  setContentMode(value: NotificationContentMode): Promise<NotificationSettings> {
    if (value !== 'private' && value !== 'detailed') throw new NotificationSettingsValidationError('Select a supported notification content mode.');
    return this.update({ notificationContentMode: value });
  }

  async clearError(): Promise<void> {
    await this.repository.clearError(this.now());
    notifyNotificationSettingsChanged(await this.repository.get());
  }

  private async update(update: NotificationSettingsUpdate): Promise<NotificationSettings> {
    const settings = await this.repository.update(update, this.now());
    notifyNotificationSettingsChanged(settings);
    return settings;
  }

  private assertTime(value: string): void {
    if (!isValidTime(value)) throw new NotificationSettingsValidationError('Enter a valid 24-hour time.');
  }
}
