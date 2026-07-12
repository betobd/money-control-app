import type { AccountType } from './account.types';

export const accountTypeLabels: Record<AccountType, string> = {
  checking: 'Checking account',
  savings: 'Savings account',
  cash: 'Cash account',
  credit_card: 'Credit card',
};

export function formatCop(amount: number): string {
  const absolute = Math.abs(amount).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  return `${amount < 0 ? '-' : ''}$${absolute}`;
}
