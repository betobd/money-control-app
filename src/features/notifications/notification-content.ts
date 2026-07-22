import { formatCop } from '@/features/accounts/account-format';
import { budgetMonthLabel } from '@/features/budgets/budget-month';
import type { BudgetView } from '@/features/budgets/budget.types';
import type { RecurringOccurrenceListItem, RecurringRuleListItem } from '@/features/recurring-transactions/recurring-transaction.types';
import type { LocalNotificationContent, NotificationContentMode } from './notification.types';

type RecurringContentSource = Pick<
  RecurringOccurrenceListItem | RecurringRuleListItem,
  'type' | 'amount' | 'categoryName'
>;

export function recurringReminderContent(
  source: RecurringContentSource,
  mode: NotificationContentMode,
  timing: 'upcoming' | 'due' | 'overdue',
  occurrenceId?: string,
): LocalNotificationContent {
  const privateBody = timing === 'upcoming'
    ? 'You have an upcoming recurring transaction to review.'
    : timing === 'overdue'
      ? 'You have an overdue recurring transaction to review.'
      : 'You have a recurring transaction to review.';
  const timingText = timing === 'upcoming' ? 'is coming up' : timing === 'overdue' ? 'is overdue' : 'is due today';
  const detail = source.type === 'transfer'
    ? `A recurring transfer of ${formatCop(source.amount)} ${timingText}.`
    : `${source.categoryName ?? 'A recurring transaction'} for ${formatCop(source.amount)} ${timingText}.`;
  return {
    title: 'Money Control reminder',
    body: mode === 'private' ? privateBody : detail,
    data: { version: 1, target: 'recurring', ...(occurrenceId ? { occurrenceId } : {}) },
    priority: timing === 'upcoming' ? 'default' : 'high',
  };
}

export function budgetAlertContent(
  budget: BudgetView,
  threshold: 80 | 100,
  mode: NotificationContentMode,
): LocalNotificationContent {
  const over = threshold === 100;
  const privateBody = over ? 'A budget has reached its limit.' : 'A budget is close to its limit.';
  const month = budgetMonthLabel(budget.month);
  const detailedBody = over
    ? `${budget.categoryName} has reached its ${month} budget.`
    : `${budget.categoryName} has used ${Math.round(budget.percentageUsed)}% of its ${month} budget.`;
  return {
    title: over ? 'Budget limit reached' : 'Budget nearing limit',
    body: mode === 'private' ? privateBody : detailedBody,
    data: { version: 1, target: 'budgets' },
    priority: over ? 'high' : 'default',
  };
}

export function dailyReminderContent(): LocalNotificationContent {
  return {
    title: 'Money Control',
    body: 'Take a moment to review your finances.',
    data: { version: 1, target: 'home' },
    priority: 'low',
  };
}

export function testNotificationContent(): LocalNotificationContent {
  return {
    title: 'Money Control test',
    body: 'Local reminders are ready on this device.',
    data: { version: 1, target: 'home' },
    priority: 'default',
  };
}
