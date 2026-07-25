// Types offered in the account form. `other` is intentionally excluded: it is a
// schema/backup-permitted legacy value the UI can display but never creates.
export const accountTypes = ['checking', 'savings', 'cash', 'credit_card'] as const;

export type CreatableAccountType = (typeof accountTypes)[number];

export type AccountType = CreatableAccountType | 'other';

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: 'COP';
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
  balance: number;
};

export type AccountInput = {
  name: string;
  type: AccountType;
  openingBalance: number;
  creditLimit: number | null;
  statementClosingDay: number | null;
  paymentDueDay: number | null;
};

export type AccountField = 'name' | 'type' | 'openingBalance' | 'creditLimit' | 'statementClosingDay' | 'paymentDueDay';

export type AccountValidationErrors = Partial<Record<AccountField, string>>;
