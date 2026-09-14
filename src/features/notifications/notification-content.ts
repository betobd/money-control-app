import { formatMoneyWithSymbol } from '@/features/currency/currency';
import { budgetMonthLabel } from '@/features/budgets/budget-month';
import type { BudgetView } from '@/features/budgets/budget.types';
import type { RecurringOccurrenceListItem, RecurringRuleListItem } from '@/features/recurring-transactions/recurring-transaction.types';
import { getMessages } from '@/i18n/messages';
import type { LocalNotificationContent, NotificationContentMode } from './notification.types';
import type { CreditCardDetails } from '@/features/credit-cards/credit-card.types';

// Content is built in the active language when a notification is scheduled.
// NotificationCoordinator.languageChanged re-schedules pending work after a
// language change so its text follows.

type RecurringContentSource = Pick<
  RecurringOccurrenceListItem | RecurringRuleListItem,
  'type' | 'amount' | 'categoryName' | 'currency'
>;

export function recurringReminderContent(
  source: RecurringContentSource,
  mode: NotificationContentMode,
  timing: 'upcoming' | 'due' | 'overdue',
  occurrenceId?: string,
): LocalNotificationContent {
  const t = getMessages().notifications.content;
  const amount = formatMoneyWithSymbol(source.amount, source.currency);
  const detail = source.type === 'transfer'
    ? t.recurringTransfer(amount, timing)
    : t.recurringCategory(source.categoryName ?? null, amount, timing);
  return {
    title: t.reminderTitle,
    body: mode === 'private' ? t.recurringPrivate(timing) : detail,
    data: { version: 1, target: 'recurring', ...(occurrenceId ? { occurrenceId } : {}) },
    priority: timing === 'upcoming' ? 'default' : 'high',
  };
}

export function budgetAlertContent(
  budget: BudgetView,
  threshold: 80 | 100,
  mode: NotificationContentMode,
): LocalNotificationContent {
  const t = getMessages().notifications.content;
  const over = threshold === 100;
  const privateBody = over ? t.budgetReachedPrivate : t.budgetNearingPrivate;
  const month = budgetMonthLabel(budget.month);
  // A subcategory budget names its parent: two categories may each have an
  // "Otros", and "Otros has reached its budget" would say nothing.
  const label = budget.categoryParentName
    ? `${budget.categoryParentName} › ${budget.categoryName}`
    : budget.categoryName;
  const detailedBody = over
    ? t.budgetReachedDetail(label, month)
    : t.budgetNearingDetail(label, Math.round(budget.percentageUsed), month);
  return {
    title: over ? t.budgetReachedTitle : t.budgetNearingTitle,
    body: mode === 'private' ? privateBody : detailedBody,
    data: { version: 1, target: 'budgets' },
    priority: over ? 'high' : 'default',
  };
}

export function dailyReminderContent(): LocalNotificationContent {
  const messages = getMessages();
  return {
    title: messages.common.appName,
    body: messages.notifications.content.dailyBody,
    data: { version: 1, target: 'home' },
    priority: 'low',
  };
}

export function testNotificationContent(): LocalNotificationContent {
  const t = getMessages().notifications.content;
  return {
    title: t.testTitle,
    body: t.testBody,
    data: { version: 1, target: 'home' },
    priority: 'default',
  };
}

export function creditCardReminderContent(
  card: CreditCardDetails,
  mode: NotificationContentMode,
  kind: 'closing' | 'due',
  date: string,
): LocalNotificationContent {
  const t = getMessages().notifications.content;
  const privateBody = kind === 'closing' ? t.cardClosingPrivate : t.cardDuePrivate;
  const remaining = card.latestStatement?.remainingStatement ?? 0;
  const detailedBody = kind === 'closing'
    ? t.cardClosingDetail(card.account.name, date)
    : t.cardDueDetail(card.account.name, formatMoneyWithSymbol(remaining, card.account.currency), date);
  return {
    title: kind === 'closing' ? t.cardClosingTitle : t.cardDueTitle,
    body: mode === 'private' ? privateBody : detailedBody,
    data: { version: 1, target: 'credit-card', cardId: card.account.id },
    priority: kind === 'due' ? 'high' : 'default',
  };
}
