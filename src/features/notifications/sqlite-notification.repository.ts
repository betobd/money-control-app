import { and, eq } from 'drizzle-orm';

import { database } from '@/database/client';
import {
  budgetNotificationState,
  notificationSettings,
  scheduledNotifications,
} from '@/database/schema';
import type { BudgetNotificationStateRepository } from './budget-notification-state.repository';
import type { NotificationSchedulingRepository } from './notification-scheduling.repository';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import {
  NOTIFICATION_SETTINGS_ID,
  NOTIFICATION_SETTINGS_VERSION,
  type BudgetNotificationState,
  type NotificationSettings,
  type NotificationSettingsUpdate,
  type ScheduledNotificationKey,
  type ScheduledNotificationRecord,
} from './notification.types';

function defaultSettings(now: string): NotificationSettings {
  return {
    id: NOTIFICATION_SETTINGS_ID,
    settingsVersion: NOTIFICATION_SETTINGS_VERSION,
    notificationsEnabled: false,
    recurringRemindersEnabled: false,
    recurringReminderTime: '09:00',
    recurringAdvanceDays: 0,
    budgetAlertsEnabled: false,
    dailyReminderEnabled: false,
    dailyReminderTime: '19:00',
    creditCardRemindersEnabled: false,
    creditCardClosingReminderEnabled: true,
    creditCardDueThreeDaysEnabled: true,
    creditCardDueOneDayEnabled: true,
    creditCardDueTodayEnabled: true,
    notificationContentMode: 'private',
    permissionPrompted: false,
    lastErrorCode: null,
    lastErrorAt: null,
    updatedAt: now,
  };
}

function mapSettings(row: typeof notificationSettings.$inferSelect): NotificationSettings {
  return {
    ...row,
    id: NOTIFICATION_SETTINGS_ID,
    settingsVersion: NOTIFICATION_SETTINGS_VERSION,
    recurringAdvanceDays: row.recurringAdvanceDays as 0 | 1 | 2 | 3,
    notificationContentMode: row.notificationContentMode as NotificationSettings['notificationContentMode'],
    lastErrorCode: row.lastErrorCode as NotificationSettings['lastErrorCode'],
  };
}

export class SQLiteNotificationRepository implements NotificationSettingsRepository {
  constructor(private readonly now = () => new Date().toISOString()) {}

  async get(): Promise<NotificationSettings> {
    await database.insert(notificationSettings).values(defaultSettings(this.now())).onConflictDoNothing();
    const [row] = await database.select().from(notificationSettings).where(eq(notificationSettings.id, NOTIFICATION_SETTINGS_ID)).limit(1);
    if (!row) throw new Error('Notification settings could not be initialized.');
    return mapSettings(row);
  }

  async update(update: NotificationSettingsUpdate, updatedAt: string): Promise<NotificationSettings> {
    await this.get();
    await database.update(notificationSettings).set({ ...update, updatedAt }).where(eq(notificationSettings.id, NOTIFICATION_SETTINGS_ID));
    return this.get();
  }

  async recordError(code: NotificationSettings['lastErrorCode'], occurredAt: string): Promise<void> {
    await this.get();
    await database.update(notificationSettings).set({ lastErrorCode: code, lastErrorAt: occurredAt, updatedAt: occurredAt }).where(eq(notificationSettings.id, NOTIFICATION_SETTINGS_ID));
  }

  async clearError(updatedAt: string): Promise<void> {
    await this.get();
    await database.update(notificationSettings).set({ lastErrorCode: null, lastErrorAt: null, updatedAt }).where(eq(notificationSettings.id, NOTIFICATION_SETTINGS_ID));
  }

  async listScheduled(): Promise<ScheduledNotificationRecord[]> {
    const rows = await database.select().from(scheduledNotifications);
    return rows.map((row) => ({ ...row, domainType: row.domainType as ScheduledNotificationRecord['domainType'] }));
  }

  async find(key: ScheduledNotificationKey): Promise<ScheduledNotificationRecord | null> {
    const [row] = await database.select().from(scheduledNotifications).where(and(
      eq(scheduledNotifications.domainType, key.domainType),
      eq(scheduledNotifications.domainId, key.domainId),
      eq(scheduledNotifications.notificationKind, key.notificationKind),
    )).limit(1);
    return row ? { ...row, domainType: row.domainType as ScheduledNotificationRecord['domainType'] } : null;
  }

  async save(record: ScheduledNotificationRecord): Promise<void> {
    await database.insert(scheduledNotifications).values(record).onConflictDoUpdate({
      target: [scheduledNotifications.domainType, scheduledNotifications.domainId, scheduledNotifications.notificationKind],
      set: {
        scheduledNotificationId: record.scheduledNotificationId,
        scheduledAt: record.scheduledAt,
        triggerAt: record.triggerAt,
        revision: record.revision,
        updatedAt: record.updatedAt,
      },
    });
  }

  async remove(key: ScheduledNotificationKey): Promise<void> {
    await database.delete(scheduledNotifications).where(and(
      eq(scheduledNotifications.domainType, key.domainType),
      eq(scheduledNotifications.domainId, key.domainId),
      eq(scheduledNotifications.notificationKind, key.notificationKind),
    ));
  }

  async clearScheduled(): Promise<void> {
    await database.delete(scheduledNotifications);
  }

  async listBudgetStates(): Promise<BudgetNotificationState[]> {
    return database.select().from(budgetNotificationState);
  }

  async findBudgetState(budgetId: string, month: string): Promise<BudgetNotificationState | null> {
    const [row] = await database.select().from(budgetNotificationState).where(and(
      eq(budgetNotificationState.budgetId, budgetId),
      eq(budgetNotificationState.month, month),
    )).limit(1);
    return row ?? null;
  }

  async saveBudgetState(state: BudgetNotificationState): Promise<void> {
    await database.insert(budgetNotificationState).values(state).onConflictDoUpdate({
      target: [budgetNotificationState.budgetId, budgetNotificationState.month],
      set: {
        threshold80Notified: state.threshold80Notified,
        threshold100Notified: state.threshold100Notified,
        updatedAt: state.updatedAt,
      },
    });
  }

  async removeBudgetState(budgetId: string, month?: string): Promise<void> {
    await database.delete(budgetNotificationState).where(month
      ? and(eq(budgetNotificationState.budgetId, budgetId), eq(budgetNotificationState.month, month))
      : eq(budgetNotificationState.budgetId, budgetId));
  }

  async clearBudgetStates(): Promise<void> {
    await database.delete(budgetNotificationState);
  }
}

export class SQLiteNotificationSchedulingRepository implements NotificationSchedulingRepository {
  constructor(private readonly repository = new SQLiteNotificationRepository()) {}
  list() { return this.repository.listScheduled(); }
  find(key: ScheduledNotificationKey) { return this.repository.find(key); }
  save(record: ScheduledNotificationRecord) { return this.repository.save(record); }
  remove(key: ScheduledNotificationKey) { return this.repository.remove(key); }
  clear() { return this.repository.clearScheduled(); }
}

export class SQLiteBudgetNotificationStateRepository implements BudgetNotificationStateRepository {
  constructor(private readonly repository = new SQLiteNotificationRepository()) {}
  list() { return this.repository.listBudgetStates(); }
  find(budgetId: string, month: string) { return this.repository.findBudgetState(budgetId, month); }
  save(state: BudgetNotificationState) { return this.repository.saveBudgetState(state); }
  remove(budgetId: string, month?: string) { return this.repository.removeBudgetState(budgetId, month); }
  clear() { return this.repository.clearBudgetStates(); }
}
