import { count, eq } from 'drizzle-orm';

import { database } from '@/database/client';
import { appSettings, budgets, transactions } from '@/database/schema';
import { isSupportedCurrency, type CurrencyCode } from '@/features/currency/currency';
import type { SettingsRepository } from './settings.repository';
import { APP_SETTINGS_ID, type AppSettings } from './settings.types';

export class SQLiteSettingsRepository implements SettingsRepository {
  async find(): Promise<AppSettings | null> {
    const row = await database.query.appSettings.findFirst({
      where: eq(appSettings.id, APP_SETTINGS_ID),
    });
    if (!row) return null;
    // The column is a three-letter shape check, not an enumeration, so a code the
    // registry no longer knows is possible after a downgrade. Surfacing it as a
    // failed read is better than handing an unknown code to the formatter.
    if (!isSupportedCurrency(row.baseCurrencyCode)) {
      throw new Error(`The saved base currency "${row.baseCurrencyCode}" is not a supported currency.`);
    }
    return {
      id: row.id,
      baseCurrencyCode: row.baseCurrencyCode,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  async setBaseCurrency(code: CurrencyCode, timestamp: string): Promise<void> {
    await database
      .insert(appSettings)
      .values({
        id: APP_SETTINGS_ID,
        baseCurrencyCode: code,
        createdAt: timestamp,
        updatedAt: timestamp,
      })
      .onConflictDoUpdate({
        target: appSettings.id,
        set: { baseCurrencyCode: code, updatedAt: timestamp },
      });
  }

  async countBaseCurrencyDependents(): Promise<{ transactions: number; budgets: number }> {
    const [transactionRows, budgetRows] = await Promise.all([
      database.select({ value: count() }).from(transactions),
      database.select({ value: count() }).from(budgets),
    ]);
    return {
      transactions: transactionRows[0]?.value ?? 0,
      budgets: budgetRows[0]?.value ?? 0,
    };
  }
}
