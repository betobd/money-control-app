export const NOTIFICATION_SETTINGS_VERSION = 1 as const;
export const NOTIFICATION_SETTINGS_ID = 'device' as const;

export type NotificationContentMode = 'private' | 'detailed';

export type NotificationSettings = {
  id: typeof NOTIFICATION_SETTINGS_ID;
  settingsVersion: typeof NOTIFICATION_SETTINGS_VERSION;
  notificationsEnabled: boolean;
  recurringRemindersEnabled: boolean;
  recurringReminderTime: string;
  recurringAdvanceDays: 0 | 1 | 2 | 3;
  budgetAlertsEnabled: boolean;
  dailyReminderEnabled: boolean;
  dailyReminderTime: string;
  creditCardRemindersEnabled: boolean;
  creditCardClosingReminderEnabled: boolean;
  creditCardDueThreeDaysEnabled: boolean;
  creditCardDueOneDayEnabled: boolean;
  creditCardDueTodayEnabled: boolean;
  notificationContentMode: NotificationContentMode;
  permissionPrompted: boolean;
  lastErrorCode: NotificationErrorCode | null;
  lastErrorAt: string | null;
  updatedAt: string;
};

export type NotificationSettingsUpdate = Partial<Pick<
  NotificationSettings,
  | 'notificationsEnabled'
  | 'recurringRemindersEnabled'
  | 'recurringReminderTime'
  | 'recurringAdvanceDays'
  | 'budgetAlertsEnabled'
  | 'dailyReminderEnabled'
  | 'dailyReminderTime'
  | 'creditCardRemindersEnabled'
  | 'creditCardClosingReminderEnabled'
  | 'creditCardDueThreeDaysEnabled'
  | 'creditCardDueOneDayEnabled'
  | 'creditCardDueTodayEnabled'
  | 'notificationContentMode'
  | 'permissionPrompted'
>>;

export type NotificationPermissionState =
  | 'not-determined'
  | 'granted'
  | 'denied-requestable'
  | 'denied-permanent'
  | 'unavailable';

export type NotificationErrorCode =
  | 'permission-unavailable'
  | 'channel-creation-failed'
  | 'schedule-failed'
  | 'cancel-failed'
  | 'metadata-failed'
  | 'restore-reconciliation-failed'
  | 'navigation-failed';

export type ScheduledNotificationDomainType =
  | 'recurring-occurrence'
  | 'daily-reminder'
  | 'test-notification'
  | 'credit-card-reminder';

export type ScheduledNotificationRecord = {
  id: string;
  domainType: ScheduledNotificationDomainType;
  domainId: string;
  notificationKind: string;
  scheduledNotificationId: string;
  scheduledAt: string;
  triggerAt: string;
  revision: string;
  createdAt: string;
  updatedAt: string;
};

export type ScheduledNotificationKey = Pick<
  ScheduledNotificationRecord,
  'domainType' | 'domainId' | 'notificationKind'
>;

export type BudgetNotificationState = {
  budgetId: string;
  month: string;
  threshold80Notified: boolean;
  threshold100Notified: boolean;
  updatedAt: string;
};

export type SafeNotificationTarget =
  | { version: 1; target: 'home' }
  | { version: 1; target: 'budgets' }
  | { version: 1; target: 'credit-card'; cardId: string }
  | { version: 1; target: 'recurring'; occurrenceId?: string };

export type LocalNotificationContent = {
  title: string;
  body: string;
  data: SafeNotificationTarget;
  priority?: 'low' | 'default' | 'high';
};

export type LocalNotificationTrigger =
  | { type: 'date'; date: Date; channelId: string }
  | { type: 'daily'; hour: number; minute: number; channelId: string }
  | { type: 'immediate'; channelId: string };

export type LocalNotificationResponse = {
  responseId: string;
  data: Record<string, unknown>;
};

export function isValidTime(value: string): boolean {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  return Boolean(match);
}

export function hasEnabledCategory(settings: NotificationSettings): boolean {
  return settings.recurringRemindersEnabled
    || settings.budgetAlertsEnabled
    || settings.dailyReminderEnabled
    || settings.creditCardRemindersEnabled;
}
