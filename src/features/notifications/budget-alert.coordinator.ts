import type { BudgetService } from '@/features/budgets/budget.service';
import type { BudgetView } from '@/features/budgets/budget.types';
import type { FinancialDataChange } from '@/features/transactions/financial-data-events';
import type { BudgetNotificationStateRepository } from './budget-notification-state.repository';
import { NOTIFICATION_CHANNELS, type LocalNotificationAdapter } from './local-notification.adapter';
import { budgetAlertContent } from './notification-content';
import type { NotificationPermissionService } from './notification-permission.service';
import type { NotificationSettingsRepository } from './notification-settings.repository';
import type { BudgetNotificationState } from './notification.types';

export class BudgetAlertCoordinator {
  constructor(
    private readonly budgets: Pick<BudgetService, 'listAll'>,
    private readonly states: BudgetNotificationStateRepository,
    private readonly settingsRepository: NotificationSettingsRepository,
    private readonly permissions: NotificationPermissionService,
    private readonly adapter: LocalNotificationAdapter,
    private readonly now = () => new Date().toISOString(),
  ) {}

  shouldEvaluate(change: FinancialDataChange): boolean {
    if (change.kind === 'budget') return true;
    if (change.kind !== 'transaction') return false;
    return change.before?.type === 'expense' || change.after?.type === 'expense';
  }

  async evaluate(change: FinancialDataChange): Promise<void> {
    if (!this.shouldEvaluate(change)) return;
    if (change.kind === 'budget') {
      if (change.operation === 'remove') {
        await this.states.remove(change.budgetId);
        return;
      }
      await this.baseline(change.budgetId);
      return;
    }

    const settings = await this.settingsRepository.get();
    if (!settings.notificationsEnabled || !settings.budgetAlertsEnabled) return;
    if (await this.permissions.getStatus() !== 'granted') return;
    await this.evaluateBudgets(await this.budgets.listAll(), settings.notificationContentMode);
  }

  async baseline(onlyBudgetId?: string): Promise<void> {
    const budgets = await this.budgets.listAll();
    const selected = onlyBudgetId ? budgets.filter((budget) => budget.id === onlyBudgetId) : budgets;
    const timestamp = this.now();
    for (const budget of selected) {
      const level = thresholdLevel(budget);
      await this.states.save({
        budgetId: budget.id,
        month: budget.month,
        threshold80Notified: level >= 80,
        threshold100Notified: level >= 100,
        updatedAt: timestamp,
      });
    }
    if (!onlyBudgetId) {
      const currentKeys = new Set(budgets.map((budget) => `${budget.id}\u0000${budget.month}`));
      for (const state of await this.states.list()) {
        if (!currentKeys.has(`${state.budgetId}\u0000${state.month}`)) {
          await this.states.remove(state.budgetId, state.month);
        }
      }
    }
  }

  async baselineIfEmpty(): Promise<void> {
    if ((await this.states.list()).length === 0) await this.baseline();
  }

  private async evaluateBudgets(
    budgets: BudgetView[],
    contentMode: Awaited<ReturnType<NotificationSettingsRepository['get']>>['notificationContentMode'],
  ): Promise<void> {
    for (const budget of budgets) {
      const current = await this.states.find(budget.id, budget.month) ?? emptyState(budget, this.now);
      const level = thresholdLevel(budget);
      if (level < 80) {
        await this.saveIfChanged(current, false, false);
      } else if (level < 100) {
        if (!current.threshold80Notified) {
          await this.adapter.schedule(
            budgetAlertContent(budget, 80, contentMode),
            { type: 'immediate', channelId: NOTIFICATION_CHANNELS.budgets },
          );
        }
        await this.saveIfChanged(current, true, false);
      } else {
        if (!current.threshold100Notified) {
          await this.adapter.schedule(
            budgetAlertContent(budget, 100, contentMode),
            { type: 'immediate', channelId: NOTIFICATION_CHANNELS.budgets },
          );
        }
        await this.saveIfChanged(current, true, true);
      }
    }
  }

  private async saveIfChanged(
    current: BudgetNotificationState,
    threshold80Notified: boolean,
    threshold100Notified: boolean,
  ): Promise<void> {
    if (
      current.threshold80Notified === threshold80Notified
      && current.threshold100Notified === threshold100Notified
    ) return;
    await this.states.save({
      ...current,
      threshold80Notified,
      threshold100Notified,
      updatedAt: this.now(),
    });
  }
}

function thresholdLevel(budget: Pick<BudgetView, 'spent' | 'limitAmount'>): 0 | 80 | 100 {
  const spent = BigInt(budget.spent);
  const limit = BigInt(budget.limitAmount);
  if (spent * 100n >= limit * 100n) return 100;
  if (spent * 100n >= limit * 80n) return 80;
  return 0;
}

function emptyState(budget: Pick<BudgetView, 'id' | 'month'>, now: () => string): BudgetNotificationState {
  return {
    budgetId: budget.id,
    month: budget.month,
    threshold80Notified: false,
    threshold100Notified: false,
    updatedAt: now(),
  };
}
