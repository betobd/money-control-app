export const accountTypes = ['checking', 'savings', 'cash', 'credit_card'] as const;

export type AccountType = (typeof accountTypes)[number];

export type Account = {
  id: string;
  name: string;
  type: AccountType;
  currency: 'COP';
  openingBalance: number;
  creditLimit: number | null;
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
};

export type AccountField = 'name' | 'type' | 'openingBalance' | 'creditLimit';

export type AccountValidationErrors = Partial<Record<AccountField, string>>;
