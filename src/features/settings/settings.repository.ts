import type { CurrencyCode } from '@/features/currency/currency';
import type { AppSettings } from './settings.types';

/** Persistence for the `app_settings` singleton. */
export interface SettingsRepository {
  /** The settings row, or null on a database that predates it. */
  find(): Promise<AppSettings | null>;
  setBaseCurrency(code: CurrencyCode, timestamp: string): Promise<void>;
  /** Counts that decide whether the base currency is still changeable. */
  countBaseCurrencyDependents(): Promise<{ transactions: number; budgets: number }>;
}
