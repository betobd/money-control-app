import type { Account, AccountWithBalance } from './account.types';

export type NewAccountRecord = Account;

export type AccountUpdateRecord = Pick<
  Account,
  'name' | 'type' | 'openingBalance' | 'creditLimit' | 'statementClosingDay' | 'paymentDueDay' | 'updatedAt'
>;

export type AccountDeletionEligibility = {
  account: AccountWithBalance | null;
  hasFinancialReferences: boolean;
};

export interface AccountRepository {
  archive(id: string, archivedAt: string): Promise<void>;
  create(account: NewAccountRecord): Promise<void>;
  getDeletionEligibility(id: string): Promise<AccountDeletionEligibility>;
  findActiveByNormalizedName(normalizedName: string, excludingId?: string): Promise<Account | null>;
  findById(id: string): Promise<Account | null>;
  hasPostedTransactions(id: string): Promise<boolean>;
  hasCreditCardStatements(id: string): Promise<boolean>;
  list(includeArchived: boolean): Promise<AccountWithBalance[]>;
  permanentlyDelete(id: string): Promise<void>;
  restore(id: string, restoredAt: string): Promise<void>;
  update(id: string, account: AccountUpdateRecord): Promise<void>;
}
