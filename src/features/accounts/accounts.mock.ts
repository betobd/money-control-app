export type AccountKind = 'checking' | 'savings' | 'credit' | 'cash';

export type AccountMock = {
  id: string;
  name: string;
  typeLabel: string;
  balanceLabel: 'Available balance' | 'Current balance' | 'Amount owed';
  amount: string;
  currency: 'COP';
  kind: AccountKind;
  balanceTone: 'asset' | 'debt';
  archived?: boolean;
};

export const accountsOverviewMock = {
  netWorth: {
    amount: '$24.530.000',
    currency: 'COP' as const,
  },
  accounts: [
    {
      id: 'main-checking',
      name: 'Main Checking',
      typeLabel: 'Checking account',
      balanceLabel: 'Available balance',
      amount: '$6.500.000',
      currency: 'COP',
      kind: 'checking',
      balanceTone: 'asset',
    },
    {
      id: 'savings',
      name: 'Savings',
      typeLabel: 'Savings account',
      balanceLabel: 'Available balance',
      amount: '$18.780.000',
      currency: 'COP',
      kind: 'savings',
      balanceTone: 'asset',
    },
    {
      id: 'credit-card',
      name: 'Credit Card',
      typeLabel: 'Credit account',
      balanceLabel: 'Amount owed',
      amount: '-$1.200.000',
      currency: 'COP',
      kind: 'credit',
      balanceTone: 'debt',
    },
    {
      id: 'cash',
      name: 'Cash',
      typeLabel: 'Cash account',
      balanceLabel: 'Current balance',
      amount: '$450.000',
      currency: 'COP',
      kind: 'cash',
      balanceTone: 'asset',
    },
  ] satisfies AccountMock[],
} as const;

export const archivedAccountMock: AccountMock = {
  id: 'archived-long-name',
  name: 'Archived Long-Term Savings Account With A Long Name',
  typeLabel: 'Savings account',
  balanceLabel: 'Current balance',
  amount: '$125.450.000',
  currency: 'COP',
  kind: 'savings',
  balanceTone: 'asset',
  archived: true,
};
