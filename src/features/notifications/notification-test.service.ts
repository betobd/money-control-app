import { NOTIFICATION_CHANNELS } from './local-notification.adapter';
import { testNotificationContent } from './notification-content';
import type { NotificationPermissionService } from './notification-permission.service';
import { notificationRevision } from './notification-revision';
import type { NotificationScheduler } from './notification-scheduler';

export class NotificationTestService {
  constructor(
    private readonly permissions: NotificationPermissionService,
    private readonly scheduler: NotificationScheduler,
    private readonly now = () => new Date(),
  ) {}

  async schedule(): Promise<'scheduled' | 'permission-required'> {
    if (await this.permissions.getStatus() !== 'granted') return 'permission-required';
    const trigger = new Date(this.now().getTime() + 5_000);
    await this.scheduler.scheduleOrReplace({
      domainType: 'test-notification',
      domainId: 'settings-screen',
      notificationKind: 'test',
      content: testNotificationContent(),
      trigger: { type: 'date', date: trigger, channelId: NOTIFICATION_CHANNELS.recurring },
      triggerAt: trigger.toISOString(),
      revision: notificationRevision([trigger.toISOString()]),
    });
    return 'scheduled';
  }

  cancel(): Promise<void> {
    return this.scheduler.reconcile([], ['test-notification']);
  }
}
