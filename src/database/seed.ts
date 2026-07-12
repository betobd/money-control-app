import type { ExpoSQLiteDatabase } from 'drizzle-orm/expo-sqlite';

import type * as schema from './schema';

/**
 * Development-only seed entry point. Intentionally empty and never called by app startup.
 */
export async function seedDevelopmentDatabase(
  _database: ExpoSQLiteDatabase<typeof schema>,
): Promise<void> {
  if (!__DEV__) {
    throw new Error('Development seed cannot run in production.');
  }
}
