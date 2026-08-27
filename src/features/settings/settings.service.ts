/**
 * Application settings, currently the device's base currency.
 *
 * The base currency is what every consolidated total, budget limit and
 * `base_amount_minor` snapshot is denominated in. It is freely changeable while
 * the install has nothing denominated in it, and locked afterwards — see
 * {@link SettingsService.baseCurrencyLock} for why.
 */
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { primeBaseCurrency } from './base-currency';
import type { SettingsRepository } from './settings.repository';
import type { AppSettings, BaseCurrencyLock, BaseCurrencyLockReason } from './settings.types';

export type SettingsErrorCode = 'unsupported_currency' | 'base_currency_locked' | 'settings_missing';

export class SettingsError extends Error {
  /**
   * Stable brand. Cross-module `instanceof` compares constructor identity, which
   * only holds while every importer shares one module instance.
   */
  readonly isSettingsError = true;

  constructor(
    public readonly code: SettingsErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export function isSettingsError(value: unknown): value is SettingsError {
  return value instanceof Error && (value as SettingsError).isSettingsError === true;
}

type SettingsServiceOptions = {
  now?: () => string;
};

export class SettingsService {
  private readonly now: () => string;

  constructor(
    private readonly repository: SettingsRepository,
    options: SettingsServiceOptions = {},
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async get(): Promise<AppSettings> {
    const settings = await this.repository.find();
    if (!settings) {
      throw new SettingsError('settings_missing', 'Application settings are missing from the database.');
    }
    return settings;
  }

  /**
   * Load the base currency and prime the synchronous cache. Called once during
   * database initialization, before any screen renders.
   */
  async loadBaseCurrency(): Promise<CurrencyCode> {
    const { baseCurrencyCode } = await this.get();
    primeBaseCurrency(baseCurrencyCode);
    return baseCurrencyCode;
  }

  /**
   * Whether the base currency can still be changed, and if not, why.
   *
   * Changing it after the fact is not a display preference: `base_amount_minor` on
   * every transaction, and every budget limit, are amounts *in* the old base. To
   * restate them honestly the app would need the exchange rate on each original
   * transaction date, which it deliberately does not store. Converting them at
   * today's rate instead would silently rewrite closed months, which is the
   * failure mode this rule exists to avoid.
   */
  async baseCurrencyLock(): Promise<BaseCurrencyLock> {
    const counts = await this.repository.countBaseCurrencyDependents();
    let reason: BaseCurrencyLockReason = null;
    if (counts.transactions > 0) reason = 'history';
    else if (counts.budgets > 0) reason = 'budgets';
    return { reason, transactionCount: counts.transactions, budgetCount: counts.budgets };
  }

  async canChangeBaseCurrency(): Promise<boolean> {
    return (await this.baseCurrencyLock()).reason === null;
  }

  async setBaseCurrency(code: string): Promise<CurrencyCode> {
    if (!isSupportedCurrency(code)) {
      throw new SettingsError('unsupported_currency', 'Select a supported currency.');
    }
    const current = await this.get();
    if (current.baseCurrencyCode === code) return current.baseCurrencyCode;

    const lock = await this.baseCurrencyLock();
    if (lock.reason !== null) {
      throw new SettingsError('base_currency_locked', baseCurrencyLockMessage(lock));
    }

    await this.repository.setBaseCurrency(code, this.now());
    primeBaseCurrency(code);
    notifyFinancialDataChanged({ kind: 'exchange-rate', operation: 'update' });
    return code;
  }
}

/** User-facing explanation of a base-currency lock. */
export function baseCurrencyLockMessage(lock: BaseCurrencyLock): string {
  if (lock.reason === null) return '';
  if (lock.reason === 'history') {
    const count = lock.transactionCount;
    return `Every one of your ${count} ${count === 1 ? 'transaction' : 'transactions'} stores its value in the current base currency. Changing it would require restating them at historical exchange rates, which are not kept.`;
  }
  const count = lock.budgetCount;
  return `Your ${count} ${count === 1 ? 'budget is' : 'budgets are'} set in the current base currency. Delete them to choose a different base currency.`;
}
