import type { CurrencyCode } from '@/features/currency/currency';

// Types offered in the account form. `other` is intentionally excluded: it is a
// schema/backup-permitted legacy value the UI can display but never creates.
export const accountTypes = ['checking', 'savings', 'cash', 'credit_card'] as const;

export type CreatableAccountType = (typeof accountTypes)[number];

export type AccountType = CreatableAccountType | 'other';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  /** The account's native currency. All of its amounts are in this currency. */
  currency: CurrencyCode;
  openingBalance: number;
  creditLimit: number | null;
  statementClosingDay: number | null;
  paymentDueDay: number | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type AccountWithBalance = Account & {
  /** Derived balance in the account's native currency (minor units). */
  balance: number;
};

export type AccountInput = {
  name: string;
  type: AccountType;
  currency: CurrencyCode;
  openingBalance: number;
  creditLimit: number | null;
  statementClosingDay: number | null;
  paymentDueDay: number | null;
};

export type AccountField = 'name' | 'type' | 'currency' | 'openingBalance' | 'creditLimit' | 'statementClosingDay' | 'paymentDueDay';

export type AccountValidationErrors = Partial<Record<AccountField, string>>;
