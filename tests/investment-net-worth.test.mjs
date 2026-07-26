import assert from 'node:assert/strict';
import test from 'node:test';

import { AccountService } from '../src/features/accounts/account.service.ts';
import {
  buildInvestmentAccountView,
  withInvestmentCurrentValues,
} from '../src/features/investments/investment-portfolio.service.ts';

// estimateNetWorth only reads its arguments, so a stub repository is fine.
const accountService = new AccountService({}, { createId: () => 'x' });
const RATE = (whole) => ({ rateScaled: whole * 10_000, rateScale: 10_000 });

function account(id, { type, currency = 'COP', balance }) {
  return { id, name: id, type, currency, openingBalance: 0, creditLimit: null, statementClosingDay: null, paymentDueDay: null, isArchived: false, archivedAt: null, createdAt: 'x', updatedAt: 'x', balance };
}

function investmentView(id, { currency = 'COP', netContributionsMinor, latest = null, liquidity = 'liquid' }) {
  const acc = account(id, { type: 'investment', currency, balance: netContributionsMinor });
  const metadata = { accountId: id, investmentType: 'brokerage', trackingMode: 'balance', liquidity, providerName: null, startDate: null, maturityDate: null, note: null, createdAt: 'x', updatedAt: 'x' };
  return buildInvestmentAccountView({
    account: acc,
    metadata,
    latestValuation: latest,
    totalContributionsMinor: netContributionsMinor,
    totalWithdrawalsMinor: 0,
    rate: null,
  });
}

function valuation(id, valueMinor, basisMinor) {
  return { id: `v-${id}`, investmentAccountId: id, valueMinor, basisMinor, currencyCode: 'COP', valuationDate: '2026-03-31', note: null, createdAt: 'x', updatedAt: 'x' };
}

function netWorth(accounts, views, rate = null) {
  return accountService.estimateNetWorth(withInvestmentCurrentValues(accounts, views), rate).totalCopMinor;
}

test('a contribution from a bank account leaves net worth unchanged', () => {
  // Before: Savings 50M, Trii 0 (no valuation).
  const before = netWorth(
    [account('savings', { type: 'savings', balance: 50_000_000 }), account('trii', { type: 'investment', balance: 0 })],
    [investmentView('trii', { netContributionsMinor: 0 })],
  );
  // After transferring 10M into Trii: Savings 40M, Trii net contributions 10M.
  const after = netWorth(
    [account('savings', { type: 'savings', balance: 40_000_000 }), account('trii', { type: 'investment', balance: 10_000_000 })],
    [investmentView('trii', { netContributionsMinor: 10_000_000 })],
  );
  assert.equal(before, 50_000_000);
  assert.equal(after, 50_000_000);
});

test('a withdrawal to a bank account leaves net worth unchanged', () => {
  const before = netWorth(
    [account('savings', { type: 'savings', balance: 40_000_000 }), account('trii', { type: 'investment', balance: 10_000_000 })],
    [investmentView('trii', { netContributionsMinor: 10_000_000 })],
  );
  const after = netWorth(
    [account('savings', { type: 'savings', balance: 43_000_000 }), account('trii', { type: 'investment', balance: 7_000_000 })],
    [investmentView('trii', { netContributionsMinor: 7_000_000 })],
  );
  assert.equal(before, 50_000_000);
  assert.equal(after, 50_000_000);
});

test('a valuation increase raises net worth; a decrease lowers it', () => {
  const accounts = [account('savings', { type: 'savings', balance: 40_000_000 }), account('trii', { type: 'investment', balance: 10_000_000 })];
  const flat = netWorth(accounts, [investmentView('trii', { netContributionsMinor: 10_000_000 })]);
  const up = netWorth(accounts, [investmentView('trii', { netContributionsMinor: 10_000_000, latest: valuation('trii', 10_700_000, 10_000_000) })]);
  const down = netWorth(accounts, [investmentView('trii', { netContributionsMinor: 10_000_000, latest: valuation('trii', 9_500_000, 10_000_000) })]);
  assert.equal(flat, 50_000_000);
  assert.equal(up, 50_700_000);
  assert.equal(down, 49_500_000);
});

test('net worth uses current value for investments without double counting other balances', () => {
  const worth = netWorth(
    [
      account('checking', { type: 'checking', balance: 40_000_000 }),
      account('card', { type: 'credit_card', balance: -1_000_000 }),
      account('trii', { type: 'investment', balance: 10_000_000 }),
    ],
    [investmentView('trii', { netContributionsMinor: 10_000_000, latest: valuation('trii', 10_700_000, 10_000_000) })],
  );
  // 40,000,000 - 1,000,000 + 10,700,000 (current value, not the 10,000,000 ledger balance)
  assert.equal(worth, 49_700_000);
});

test('a USD/COP rate change moves estimated net worth without any transaction', () => {
  const accounts = [account('savings', { type: 'savings', balance: 10_000_000 }), account('ibkr', { type: 'investment', currency: 'USD', balance: 1_000_000 })];
  const views = [investmentView('ibkr', { currency: 'USD', netContributionsMinor: 1_000_000, latest: { id: 'v', investmentAccountId: 'ibkr', valueMinor: 1_250_000, basisMinor: 1_000_000, currencyCode: 'USD', valuationDate: '2026-03-31', note: null, createdAt: 'x', updatedAt: 'x' } })];
  // USD 12,500.00 current value at 4,000 and 4,100 COP/USD.
  assert.equal(netWorth(accounts, views, RATE(4_000)), 10_000_000 + 50_000_000);
  assert.equal(netWorth(accounts, views, RATE(4_100)), 10_000_000 + 51_250_000);
});

test('reinvested income raises current value as realized basis, not unrealized gain', () => {
  // Trii: 10M contributed, valued at 10.7M (0.7M unrealized gain).
  const beforeIncome = investmentView('trii', { netContributionsMinor: 10_000_000, latest: valuation('trii', 10_700_000, 10_000_000) });
  assert.equal(beforeIncome.currentValueMinor, 10_700_000);
  assert.equal(beforeIncome.estimatedGainLossMinor, 700_000);

  // Recording 0.5M investment income INTO Trii raises net contributions to 10.5M.
  const afterIncome = investmentView('trii', { netContributionsMinor: 10_500_000, latest: valuation('trii', 10_700_000, 10_000_000) });
  // Current value (and net worth) rises by the income; estimated gain is unchanged
  // because the income is realized basis, not additional unrealized gain.
  assert.equal(afterIncome.currentValueMinor, 11_200_000);
  assert.equal(afterIncome.estimatedGainLossMinor, 700_000);
});
