import type { AccountWithBalance } from './account.types';

/**
 * The Accounts overview groups: money you hold, and money you owe on cards.
 * Investment accounts are excluded — they are listed from the portfolio at their
 * current valuation, not their transaction-derived balance.
 */
export type AccountGroups = {
  /** Checking, savings, cash and other accounts. */
  banks: AccountWithBalance[];
  creditCards: AccountWithBalance[];
};

/** Active, non-investment accounts split by group, keeping their order. */
export function groupActiveAccounts(accounts: readonly AccountWithBalance[]): AccountGroups {
  const groups: AccountGroups = { banks: [], creditCards: [] };
  for (const account of accounts) {
    if (account.isArchived || account.type === 'investment') continue;
    if (account.type === 'credit_card') groups.creditCards.push(account);
    else groups.banks.push(account);
  }
  return groups;
}
