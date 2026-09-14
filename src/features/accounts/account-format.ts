import { getMessages } from '@/i18n/messages';
import type { AccountType } from './account.types';

// Getters read the active catalog each time a label is shown, so the language is
// never frozen at import time.
export const accountTypeLabels: Record<AccountType, string> = {
  get checking() { return getMessages().accounts.types.checking; },
  get savings() { return getMessages().accounts.types.savings; },
  get cash() { return getMessages().accounts.types.cash; },
  get credit_card() { return getMessages().accounts.types.creditCard; },
  get investment() { return getMessages().accounts.types.investment; },
  get other() { return getMessages().accounts.types.other; },
};

export function formatBase(amount: number): string {
  const absolute = Math.abs(amount).toLocaleString('es-CO', { maximumFractionDigits: 0 });
  return `${amount < 0 ? '-' : ''}$${absolute}`;
}
