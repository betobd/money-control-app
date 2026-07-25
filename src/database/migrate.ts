import migrationsBundle from './migrations/migrations';
import { checkDatabaseHealth } from './health';
import { sqlite } from './client';
import { categoryService } from '@/features/categories/categories';

type MigrationJournalEntry = {
  idx: number;
  when: number;
  tag: string;
  breakpoints: boolean;
};

type MigrationsBundle = {
  journal: { entries: MigrationJournalEntry[] };
  migrations: Record<string, string>;
};

const MIGRATIONS_TABLE = '__drizzle_migrations';

let initialization: Promise<void> | undefined;

/**
 * Applies pending Drizzle migrations using expo-sqlite's batch `execAsync`.
 *
 * The bundled Drizzle expo-sqlite migrator prepares every statement with
 * `prepareSync` and never finalizes it. The create-copy-swap migrations drop a
 * table immediately after backing it up with `CREATE TABLE ... AS SELECT * FROM
 * <table>`; on the native driver the leaked read statement keeps that table open,
 * so the following `DROP TABLE` fails with "database table is locked". Desktop
 * SQLite (`executescript`/`sqlite3_exec`) finalizes each statement inline, which
 * is why the migration passes in tests but fails on device. `execAsync` uses the
 * same one-shot exec path, finalizing each statement before the next runs.
 *
 * Migration bookkeeping stays byte-compatible with Drizzle's own migrator: the
 * `__drizzle_migrations` table and its `created_at` = journal `when` values are
 * preserved, so databases already migrated by Drizzle skip every applied entry.
 */
async function runMigrations(): Promise<void> {
  const bundle = migrationsBundle as MigrationsBundle;

  await sqlite.execAsync(
    `CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash text NOT NULL,
      created_at numeric
    );`,
  );

  const latest = await sqlite.getFirstAsync<{ created_at: number | null }>(
    `SELECT created_at FROM ${MIGRATIONS_TABLE} ORDER BY created_at DESC LIMIT 1`,
  );
  const lastAppliedAt = latest?.created_at ?? -1;

  for (const entry of bundle.journal.entries) {
    if (entry.when <= lastAppliedAt) {
      continue;
    }

    const key = `m${entry.idx.toString().padStart(4, '0')}`;
    const source = bundle.migrations[key];
    if (source === undefined) {
      throw new Error(`Missing migration SQL for "${entry.tag}"`);
    }

    const batch = source.replaceAll('--> statement-breakpoint', '');

    await sqlite.withTransactionAsync(async () => {
      await sqlite.execAsync(batch);
      await sqlite.runAsync(
        `INSERT INTO ${MIGRATIONS_TABLE} ("hash", "created_at") VALUES (?, ?)`,
        '',
        entry.when,
      );
    });
  }
}

async function initialize(): Promise<void> {
  await sqlite.execAsync('PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;');
  await runMigrations();
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
