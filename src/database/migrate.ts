import { migrate } from 'drizzle-orm/expo-sqlite/migrator';

import migrations from './migrations/migrations';
import { checkDatabaseHealth } from './health';
import { database, sqlite } from './client';
import { categoryService } from '@/features/categories/categories';

let initialization: Promise<void> | undefined;

async function initialize(): Promise<void> {
  await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await migrate(database, migrations);
  await categoryService.seedDefaults();

  const health = await checkDatabaseHealth(sqlite);
  if (!health.foreignKeysEnabled || health.integrity !== 'ok') {
    throw new Error(`Database health check failed: ${JSON.stringify(health)}`);
  }

  if (__DEV__) {
    console.info('[database] initialized', health);
  }
}

export function initializeDatabase(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}
