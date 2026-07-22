import type { RecurringTransactionService } from '@/features/recurring-transactions/recurring-transaction.service';
import type {
  RecurringOccurrenceListItem,
  RecurringRuleListItem,
} from '@/features/recurring-transactions/recurring-transaction.types';
import { nextScheduledDate } from '@/features/recurring-transactions/recurring-schedule';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { NOTIFICATION_CHANNELS } from './local-notification.adapter';
import { recurringReminderContent } from './notification-content';
import type { NotificationPermissionService } from './notification-permission.service';
import { notificationRevision } from './notification-revision';
import type { NotificationScheduler, DesiredNotification } from './notification-scheduler';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import { deviceLocalDateTime, deviceTimeZone, shiftCalendarDate } from './notification-time';

export const RECURRING_REMINDER_HORIZON_DAYS = 60;
const MAX_DATES_PER_RULE = 120;
const CATCH_UP_DELAY_MS = 10_000;

type ReminderSource = RecurringOccurrenceListItem | RecurringRuleListItem;

export class RecurringReminderCoordinator {
  constructor(
    private readonly recurring: Pick<RecurringTransactionService, 'listRules' | 'listPendingThrough'>,
    private readonly settingsRepository: NotificationSettingsRepository,
    private readonly permissions: NotificationPermissionService,
    private readonly scheduler: NotificationScheduler,
    private readonly now = () => new Date(),
    private readonly today = () => bogotaToday(),
  ) {}

  async reconcile(): Promise<void> {
    const settings = await this.settingsRepository.get();
    const active = settings.notificationsEnabled
      && settings.recurringRemindersEnabled
      && await this.permissions.getStatus() === 'granted';
    if (!active) {
      await this.scheduler.reconcile([], ['recurring-occurrence']);
      return;
    }

    const today = this.today();
    const horizon = shiftCalendarDate(today, RECURRING_REMINDER_HORIZON_DAYS);
    const [rules, pending] = await Promise.all([
      this.recurring.listRules(),
      this.recurring.listPendingThrough(horizon),
    ]);
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
    const desired = new Map<string, DesiredNotification>();

    for (const occurrence of pending) {
      const rule = rulesById.get(occurrence.recurringTransactionId);
      if (!rule?.isActive || rule.endedAt) continue;
      const item = this.desiredFor(occurrence, rule, occurrence.scheduledDate, settings, today, occurrence.id);
      desired.set(item.domainId, item);
    }

    for (const rule of rules) {
      if (!rule.isActive || rule.endedAt) continue;
      let scheduledDate = rule.nextOccurrenceDate;
      let count = 0;
      while (scheduledDate <= horizon && (!rule.endDate || scheduledDate <= rule.endDate) && count < MAX_DATES_PER_RULE) {
        const domainId = `${rule.id}:${scheduledDate}`;
        if (!desired.has(domainId)) {
          desired.set(domainId, this.desiredFor(rule, rule, scheduledDate, settings, today));
        }
        scheduledDate = nextScheduledDate(scheduledDate, rule.startDate, rule.frequency, rule.interval);
        count += 1;
      }
    }

    await this.scheduler.reconcile([...desired.values()], ['recurring-occurrence']);
  }

  private desiredFor(
    source: ReminderSource,
    rule: RecurringRuleListItem,
    scheduledDate: string,
    settings: Awaited<ReturnType<NotificationSettingsRepository['get']>>,
    today: string,
    occurrenceId?: string,
  ): DesiredNotification {
    const reminderDate = shiftCalendarDate(scheduledDate, -settings.recurringAdvanceDays);
    const intended = deviceLocalDateTime(reminderDate, settings.recurringReminderTime);
    const now = this.now();
    const missed = intended.getTime() <= now.getTime();
    const triggerDate = missed ? new Date(now.getTime() + CATCH_UP_DELAY_MS) : intended;
    const timing = scheduledDate < today
      ? 'overdue'
      : settings.recurringAdvanceDays > 0 && reminderDate < scheduledDate
        ? 'upcoming'
        : 'due';
    const revision = notificationRevision([
      source.type,
      source.amount,
      source.accountId,
      source.destinationAccountId,
      source.categoryId,
      source.note,
      scheduledDate,
      settings.recurringReminderTime,
      settings.recurringAdvanceDays,
      settings.notificationContentMode,
      deviceTimeZone(),
    ]);
    return {
      domainType: 'recurring-occurrence',
      domainId: `${rule.id}:${scheduledDate}`,
      notificationKind: `advance-${settings.recurringAdvanceDays}`,
      content: recurringReminderContent(source, settings.notificationContentMode, timing, occurrenceId),
      trigger: { type: 'date', date: triggerDate, channelId: NOTIFICATION_CHANNELS.recurring },
      triggerAt: triggerDate.toISOString(),
      revision,
      replaceIfTriggerChanges: !missed,
    };
  }
}
