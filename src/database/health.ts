import type { SQLiteDatabase } from 'expo-sqlite';

export type DatabaseHealth = {
  foreignKeysEnabled: boolean;
  integrity: string;
  sqliteVersion: string;
};

export async function checkDatabaseHealth(sqlite: SQLiteDatabase): Promise<DatabaseHealth> {
  const foreignKeys = await sqlite.getFirstAsync<{ foreign_keys: number }>('PRAGMA foreign_keys');
  const integrity = await sqlite.getFirstAsync<{ integrity_check: string }>('PRAGMA integrity_check');
  const version = await sqlite.getFirstAsync<{ sqlite_version: string }>('SELECT sqlite_version() AS sqlite_version');

  return {
    foreignKeysEnabled: foreignKeys?.foreign_keys === 1,
    integrity: integrity?.integrity_check ?? 'unknown',
    sqliteVersion: version?.sqlite_version ?? 'unknown',
  };
}
