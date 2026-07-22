import type { LocalNotificationAdapter } from './local-notification.adapter';
import type { NotificationPermissionState } from './notification.types';

export class NotificationPermissionService {
  constructor(private readonly adapter: LocalNotificationAdapter) {}

  async getStatus(): Promise<NotificationPermissionState> {
    if (!this.adapter.isSupported()) return 'unavailable';
    try {
      return this.normalize(await this.adapter.getPermission());
    } catch {
      return 'unavailable';
    }
  }

  async request(): Promise<NotificationPermissionState> {
    if (!this.adapter.isSupported()) return 'unavailable';
    const current = await this.getStatus();
    if (current === 'granted' || current === 'denied-permanent' || current === 'unavailable') {
      return current;
    }
    try {
      return this.normalize(await this.adapter.requestPermission());
    } catch {
      return 'unavailable';
    }
  }

  openSystemSettings(): Promise<void> {
    return this.adapter.openSystemSettings();
  }

  private normalize(value: Awaited<ReturnType<LocalNotificationAdapter['getPermission']>>): NotificationPermissionState {
    if (value.granted || value.status === 'granted') return 'granted';
    if (value.status === 'undetermined') return 'not-determined';
    return value.canAskAgain ? 'denied-requestable' : 'denied-permanent';
  }
}
