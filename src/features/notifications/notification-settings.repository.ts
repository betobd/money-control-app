import type { NotificationSettings, NotificationSettingsUpdate } from './notification.types';

export interface NotificationSettingsRepository {
  get(): Promise<NotificationSettings>;
  update(update: NotificationSettingsUpdate, updatedAt: string): Promise<NotificationSettings>;
  recordError(code: NotificationSettings['lastErrorCode'], occurredAt: string): Promise<void>;
  clearError(updatedAt: string): Promise<void>;
}
