import type { CurrencyCode } from '@/features/currency/currency';

/** The `app_settings` singleton row id. There is one settings row per install. */
export const APP_SETTINGS_ID = 'device';

export type AppSettings = {
  id: string;
  baseCurrencyCode: CurrencyCode;
  createdAt: string;
  updatedAt: string;
};

/**
 * Why the base currency can no longer be changed.
 *
 * `history` — transactions exist, and each one stores a `base_amount_minor`
 * snapshot denominated in the current base. Restating them would need a
 * historical rate for every transaction date, which the app deliberately does not
 * keep (see ADR 0005); converting them at today's rate would rewrite months that
 * are already closed.
 *
 * `budgets` — budget limits are amounts in the base currency, so the same
 * restatement problem applies with no snapshot to fall back on.
 */
export type BaseCurrencyLockReason = 'history' | 'budgets' | null;

export type BaseCurrencyLock = {
  reason: BaseCurrencyLockReason;
  transactionCount: number;
  budgetCount: number;
};
