import { bogotaToday, monthFromDate } from '@/features/transactions/transaction-date';

export function isValidBudgetMonth(value: string): boolean {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[2]);
  return month >= 1 && month <= 12;
}

export function shiftBudgetMonth(value: string, offset: number): string {
  if (!isValidBudgetMonth(value) || !Number.isInteger(offset)) return value;
  const [year, month] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1 + offset, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

export function nextBudgetMonth(value: string): string {
  return shiftBudgetMonth(value, 1);
}

export function budgetMonthLabel(value: string): string {
  if (!isValidBudgetMonth(value)) return value;
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}-01T00:00:00Z`));
}

export function currentBudgetMonth(now = new Date()): string {
  return monthFromDate(bogotaToday(now));
}
