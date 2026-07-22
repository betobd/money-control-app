import type {
  ScheduledNotificationKey,
  ScheduledNotificationRecord,
} from './notification.types';

export interface NotificationSchedulingRepository {
  list(): Promise<ScheduledNotificationRecord[]>;
  find(key: ScheduledNotificationKey): Promise<ScheduledNotificationRecord | null>;
  save(record: ScheduledNotificationRecord): Promise<void>;
  remove(key: ScheduledNotificationKey): Promise<void>;
  clear(): Promise<void>;
}
