import type { RecurringTransactionService } from '@/features/recurring-transactions/recurring-transaction.service';
import type { LocalNotificationResponse, SafeNotificationTarget } from './notification.types';
import type { CreditCardService } from '@/features/credit-cards/credit-card.service';

export type NotificationRoute =
  | '/'
  | '/budgets'
  | '/recurring'
  | { pathname: '/accounts/[id]'; params: { id: string } }
  | { pathname: '/recurring-occurrence'; params: { id: string } };

export class NotificationNavigationService {
  private readonly handled = new Set<string>();

  constructor(
    private readonly recurring: Pick<RecurringTransactionService, 'getOccurrence' | 'getRule'>,
    private readonly cards?: Pick<CreditCardService, 'getDetails'>,
  ) {}

  async resolve(response: LocalNotificationResponse): Promise<NotificationRoute | null> {
    if (this.handled.has(response.responseId)) return null;
    this.remember(response.responseId);
    const target = parseTarget(response.data);
    if (!target) return null;
    if (target.target === 'home') return '/';
    if (target.target === 'budgets') return '/budgets';
    if (target.target === 'credit-card') {
      const card = await this.cards?.getDetails(target.cardId);
      return card ? { pathname: '/accounts/[id]', params: { id: card.account.id } } : '/';
    }
    if (!target.occurrenceId) return '/recurring';
    const occurrence = await this.recurring.getOccurrence(target.occurrenceId);
    if (!occurrence || occurrence.status !== 'pending') return '/recurring';
    const rule = await this.recurring.getRule(occurrence.recurringTransactionId);
    if (!rule?.isActive || rule.endedAt) return '/recurring';
    return { pathname: '/recurring-occurrence', params: { id: occurrence.id } };
  }

  private remember(id: string): void {
    this.handled.add(id);
    if (this.handled.size > 100) {
      const oldest = this.handled.values().next().value as string | undefined;
      if (oldest) this.handled.delete(oldest);
    }
  }
}

export function parseTarget(data: Record<string, unknown>): SafeNotificationTarget | null {
  if (data.version !== 1) return null;
  if (data.target === 'home' || data.target === 'budgets') {
    return { version: 1, target: data.target };
  }
  if (data.target === 'credit-card') {
    return typeof data.cardId === 'string' && data.cardId
      ? { version: 1, target: 'credit-card', cardId: data.cardId }
      : null;
  }
  if (data.target !== 'recurring') return null;
  if (data.occurrenceId !== undefined && typeof data.occurrenceId !== 'string') return null;
  return {
    version: 1,
    target: 'recurring',
    ...(typeof data.occurrenceId === 'string' ? { occurrenceId: data.occurrenceId } : {}),
  };
}
