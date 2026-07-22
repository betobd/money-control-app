import type { LocalNotificationAdapter } from './local-notification.adapter';
import type { NotificationSchedulingRepository } from './notification-scheduling.repository';
import type {
  LocalNotificationContent,
  LocalNotificationTrigger,
  ScheduledNotificationDomainType,
  ScheduledNotificationKey,
  ScheduledNotificationRecord,
} from './notification.types';

export type DesiredNotification = ScheduledNotificationKey & {
  content: LocalNotificationContent;
  trigger: LocalNotificationTrigger;
  triggerAt: string;
  revision: string;
  replaceIfTriggerChanges?: boolean;
};

export class NotificationScheduler {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly repository: NotificationSchedulingRepository,
    private readonly adapter: LocalNotificationAdapter,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  reconcile(desired: DesiredNotification[], domainTypes: ScheduledNotificationDomainType[]): Promise<void> {
    return this.serialize(async () => {
      const existing = (await this.repository.list()).filter((record) => domainTypes.includes(record.domainType));
      const desiredKeys = new Set(desired.map(keyOf));
      for (const record of existing) {
        if (!desiredKeys.has(keyOf(record))) await this.cancelRecord(record);
      }
      for (const item of desired) await this.ensure(item);
    });
  }

  scheduleOrReplace(desired: DesiredNotification): Promise<void> {
    return this.serialize(() => this.ensure(desired));
  }

  cancelAllKnown(cancelNativeOrphans = false): Promise<void> {
    return this.serialize(async () => {
      for (const record of await this.repository.list()) await this.cancelRecord(record);
      if (cancelNativeOrphans) await this.adapter.cancelAll();
      await this.repository.clear();
    });
  }

  private serialize(work: () => Promise<void>): Promise<void> {
    const next = this.queue.then(work, work);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async ensure(desired: DesiredNotification): Promise<void> {
    const current = await this.repository.find(desired);
    if (
      current
      && current.revision === desired.revision
      && (desired.replaceIfTriggerChanges === false || current.triggerAt === desired.triggerAt)
    ) return;
    if (current) await this.cancelRecord(current);

    const scheduledNotificationId = await this.adapter.schedule(desired.content, desired.trigger);
    const timestamp = this.now();
    const record: ScheduledNotificationRecord = {
      id: current?.id ?? this.createId(),
      domainType: desired.domainType,
      domainId: desired.domainId,
      notificationKind: desired.notificationKind,
      scheduledNotificationId,
      scheduledAt: timestamp,
      triggerAt: desired.triggerAt,
      revision: desired.revision,
      createdAt: current?.createdAt ?? timestamp,
      updatedAt: timestamp,
    };
    try {
      await this.repository.save(record);
    } catch (cause) {
      await this.adapter.cancel(scheduledNotificationId).catch(() => undefined);
      throw cause;
    }
  }

  private async cancelRecord(record: ScheduledNotificationRecord): Promise<void> {
    await this.adapter.cancel(record.scheduledNotificationId);
    await this.repository.remove(record);
  }
}

function keyOf(value: ScheduledNotificationKey): string {
  return `${value.domainType}\u0000${value.domainId}\u0000${value.notificationKind}`;
}
