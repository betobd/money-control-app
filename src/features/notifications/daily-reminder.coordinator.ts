import { NOTIFICATION_CHANNELS } from './local-notification.adapter';
import { dailyReminderContent } from './notification-content';
import type { NotificationPermissionService } from './notification-permission.service';
import { notificationRevision } from './notification-revision';
import type { NotificationScheduler } from './notification-scheduler';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import { deviceTimeZone, splitTime } from './notification-time';

export class DailyReminderCoordinator {
  constructor(
    private readonly settingsRepository: NotificationSettingsRepository,
    private readonly permissions: NotificationPermissionService,
    private readonly scheduler: NotificationScheduler,
  ) {}

  async reconcile(): Promise<void> {
    const settings = await this.settingsRepository.get();
    const active = settings.notificationsEnabled
      && settings.dailyReminderEnabled
      && await this.permissions.getStatus() === 'granted';
    if (!active) {
      await this.scheduler.reconcile([], ['daily-reminder']);
      return;
    }
    const time = splitTime(settings.dailyReminderTime);
    const timezone = deviceTimeZone();
    await this.scheduler.reconcile([{
      domainType: 'daily-reminder',
      domainId: 'device',
      notificationKind: 'daily-review',
      content: dailyReminderContent(),
      trigger: { type: 'daily', ...time, channelId: NOTIFICATION_CHANNELS.daily },
      triggerAt: `daily@${settings.dailyReminderTime}@${timezone}`,
      revision: notificationRevision([settings.dailyReminderTime, timezone]),
    }], ['daily-reminder']);
  }
}
