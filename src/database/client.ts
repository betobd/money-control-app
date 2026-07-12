import { drizzle } from 'drizzle-orm/expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import * as schema from './schema';

export const DATABASE_NAME = 'money-control.db';

export const sqlite = openDatabaseSync(DATABASE_NAME);
export const database = drizzle(sqlite, { schema });
