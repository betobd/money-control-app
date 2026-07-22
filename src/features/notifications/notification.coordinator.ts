import type { FinancialDataChange } from '@/features/transactions/financial-data-events';
import type { BudgetNotificationStateRepository } from './budget-notification-state.repository';
import type { BudgetAlertCoordinator } from './budget-alert.coordinator';
import type { DailyReminderCoordinator } from './daily-reminder.coordinator';
import type { LocalNotificationAdapter } from './local-notification.adapter';
import type { NotificationScheduler } from './notification-scheduler';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import type { NotificationSettings } from './notification.types';
import type { RecurringReminderCoordinator } from './recurring-reminder.coordinator';
import type { CreditCardReminderCoordinator } from './credit-card-reminder.coordinator';

export class NotificationCoordinator {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly adapter: LocalNotificationAdapter,
    private readonly settings: NotificationSettingsRepository,
    private readonly scheduler: NotificationScheduler,
    private readonly budgetStates: BudgetNotificationStateRepository,
    private readonly recurring: RecurringReminderCoordinator,
    private readonly daily: DailyReminderCoordinator,
    private readonly budgets: BudgetAlertCoordinator,
    private readonly creditCards: CreditCardReminderCoordinator,
    private readonly now = () => new Date().toISOString(),
  ) {}

  start(): Promise<void> {
    this.adapter.configureForegroundPresentation();
    return this.run('channel-creation-failed', () => this.adapter.ensureAndroidChannels()).then(() =>
      this.run('schedule-failed', async () => {
        await this.recurring.reconcile();
        await this.daily.reconcile();
        await this.creditCards.reconcile();
        await this.budgets.baselineIfEmpty();
      }));
  }

  settingsChanged(settings: NotificationSettings): Promise<void> {
    return this.run('schedule-failed', async () => {
      await this.recurring.reconcile();
      await this.daily.reconcile();
      await this.creditCards.reconcile();
      if (settings.notificationsEnabled && settings.budgetAlertsEnabled) await this.budgets.baseline();
    });
  }

  recurringChanged(): Promise<void> {
    return this.run('schedule-failed', () => this.recurring.reconcile());
  }

  financialChanged(change: FinancialDataChange): Promise<void> {
    if (change.kind === 'restore') return Promise.resolve();
    return this.run('schedule-failed', async () => {
      await this.budgets.evaluate(change);
      if (change.kind === 'transaction' || change.kind === 'account') await this.creditCards.reconcile();
    });
  }

  creditCardChanged(): Promise<void> {
    return this.run('schedule-failed', () => this.creditCards.reconcile());
  }

  appBecameActive(): Promise<void> {
    return this.run('schedule-failed', async () => {
      await this.recurring.reconcile();
      await this.daily.reconcile();
      await this.creditCards.reconcile();
    });
  }

  afterRestore(): Promise<void> {
    return this.run('restore-reconciliation-failed', async () => {
      await this.scheduler.cancelAllKnown(true);
      await this.budgetStates.clear();
      await this.recurring.reconcile();
      await this.daily.reconcile();
      await this.creditCards.reconcile();
      await this.budgets.baseline();
    });
  }

  private run(code: NonNullable<NotificationSettings['lastErrorCode']>, work: () => Promise<void>): Promise<void> {
    const operation = this.queue.then(async () => {
      try {
        await work();
      } catch {
        console.error(`[notifications] ${code}`);
        await this.settings.recordError(code, this.now()).catch(() => {
          console.error('[notifications] metadata-failed');
        });
      }
    });
    this.queue = operation.catch(() => undefined);
    return operation;
  }
}
