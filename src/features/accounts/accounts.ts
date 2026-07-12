import { randomUUID } from 'expo-crypto';

import { SQLiteAccountRepository } from './sqlite-account.repository';
import { AccountService } from './account.service';

export const accountService = new AccountService(new SQLiteAccountRepository(), {
  createId: randomUUID,
});
