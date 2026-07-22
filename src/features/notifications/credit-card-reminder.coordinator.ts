import type { CreditCardService } from '@/features/credit-cards/credit-card.service';
import { shiftCalendarDate } from '@/features/credit-cards/credit-card-cycle.service';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { creditCardReminderContent } from './notification-content';
import { NOTIFICATION_CHANNELS } from './local-notification.adapter';
import type { NotificationPermissionService } from './notification-permission.service';
import { notificationRevision } from './notification-revision';
import type { DesiredNotification, NotificationScheduler } from './notification-scheduler';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import { deviceLocalDateTime, deviceTimeZone } from './notification-time';

const CARD_REMINDER_TIME = '09:00';

export class CreditCardReminderCoordinator {
  constructor(
    private readonly cards: Pick<CreditCardService, 'listDetails'>,
    private readonly settingsRepository: NotificationSettingsRepository,
    private readonly permissions: NotificationPermissionService,
    private readonly scheduler: NotificationScheduler,
    private readonly now = () => new Date(),
    private readonly today = () => bogotaToday(),
  ) {}

  async reconcile(): Promise<void> {
    const settings = await this.settingsRepository.get();
    const active = settings.notificationsEnabled
      && settings.creditCardRemindersEnabled
      && await this.permissions.getStatus() === 'granted';
    if (!active) {
      await this.scheduler.reconcile([], ['credit-card-reminder']);
      return;
    }
    const today = this.today();
    const now = this.now();
    const desired: DesiredNotification[] = [];
    for (const card of await this.cards.listDetails(today)) {
      if (card.account.isArchived || !card.setupComplete || !card.cycle) continue;
      if (settings.creditCardClosingReminderEnabled) {
        const reminderDate = shiftCalendarDate(card.cycle.nextClosingDate, -1);
        const trigger = deviceLocalDateTime(reminderDate, CARD_REMINDER_TIME);
        if (trigger.getTime() > now.getTime()) {
          desired.push({
            domainType: 'credit-card-reminder',
            domainId: `${card.account.id}:${card.cycle.nextClosingDate}`,
            notificationKind: 'closing-1-day',
            content: creditCardReminderContent(card, settings.notificationContentMode, 'closing', card.cycle.nextClosingDate),
            trigger: { type: 'date', date: trigger, channelId: NOTIFICATION_CHANNELS.creditCards },
            triggerAt: trigger.toISOString(),
            revision: notificationRevision([card.account.name, card.cycle.nextClosingDate, settings.notificationContentMode, deviceTimeZone()]),
          });
        }
      }
      const statement = card.latestStatement;
      if (!statement || statement.remainingStatement === 0 || statement.dueDate < today) continue;
      const offsets = [
        { days: 3 as const, enabled: settings.creditCardDueThreeDaysEnabled },
        { days: 1 as const, enabled: settings.creditCardDueOneDayEnabled },
        { days: 0 as const, enabled: settings.creditCardDueTodayEnabled },
      ];
      for (const offset of offsets) {
        if (!offset.enabled) continue;
        const reminderDate = shiftCalendarDate(statement.dueDate, -offset.days);
        const trigger = deviceLocalDateTime(reminderDate, CARD_REMINDER_TIME);
        if (trigger.getTime() <= now.getTime()) continue;
        desired.push({
          domainType: 'credit-card-reminder',
          domainId: statement.id,
          notificationKind: `due-${offset.days}-days`,
          content: creditCardReminderContent(card, settings.notificationContentMode, 'due', statement.dueDate),
          trigger: { type: 'date', date: trigger, channelId: NOTIFICATION_CHANNELS.creditCards },
          triggerAt: trigger.toISOString(),
          revision: notificationRevision([card.account.name, statement.id, statement.dueDate, statement.remainingStatement, offset.days, settings.notificationContentMode, deviceTimeZone()]),
        });
      }
    }
    await this.scheduler.reconcile(desired, ['credit-card-reminder']);
  }
}
