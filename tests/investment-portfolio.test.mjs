import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InvestmentPortfolioService,
  computeCurrentValueMinor,
  computeEstimatedReturn,
  roundHalfAwayFromZero,
} from '../src/features/investments/investment-portfolio.service.ts';

const RATE = { rateScaled: 41_000_000, rateScale: 10_000 }; // USD 1 = COP 4,100

function valuation(accountId, valueMinor, basisMinor, valuationDate = '2026-03-31') {
  return { id: `v-${accountId}`, investmentAccountId: accountId, valueMinor, basisMinor, currencyCode: 'COP', valuationDate, note: null, createdAt: 'x', updatedAt: 'x' };
}

function metadata(accountId, { investmentType = 'brokerage', liquidity = 'liquid' } = {}) {
  return { accountId, investmentType, trackingMode: 'balance', liquidity, providerName: null, startDate: null, maturityDate: null, note: null, createdAt: 'x', updatedAt: 'x' };
}

function investmentAccount(id, { currency = 'COP', balance = 0, isArchived = false } = {}) {
  return { id, name: id, type: 'investment', currency, openingBalance: 0, creditLimit: null, statementClosingDay: null, paymentDueDay: null, isArchived, archivedAt: null, createdAt: 'x', updatedAt: 'x', balance };
}

class FakeAccountRepo {
  constructor(accounts) {
    this.accounts = accounts;
  }
  async list() {
    return this.accounts.map((a) => ({ ...a }));
  }
}

class FakeInvestmentRepo {
  constructor({ metadata = [], latest = [] }) {
    this.metadata = metadata;
    this.latest = latest;
  }
  async listMetadata() {
    return this.metadata;
  }
  async listLatestValuations() {
    return this.latest;
  }
  async listContributionSummaries() {
    return this.metadata.map((m) => ({ investmentAccountId: m.accountId, totalContributionsMinor: 0, totalWithdrawalsMinor: 0 }));
  }
}

test('roundHalfAwayFromZero rounds symmetrically away from zero', () => {
  assert.equal(roundHalfAwayFromZero(5n, 2n), 3n);
  assert.equal(roundHalfAwayFromZero(-5n, 2n), -3n);
  assert.equal(roundHalfAwayFromZero(4n, 2n), 2n);
  assert.equal(roundHalfAwayFromZero(1n, 3n), 0n);
});

test('current value equals net contributions when there is no valuation', () => {
  assert.equal(computeCurrentValueMinor(10_000_000, null), 10_000_000);
});

test('current value adds post-valuation flows on top of the last mark', () => {
  // Valuation 12,500 recorded at basis 10,000; then 1,000 more contributed → 11,000.
  const latest = valuation('ibkr', 12_500, 10_000);
  assert.equal(computeCurrentValueMinor(11_000, latest), 13_500);
});

test('estimated return is unavailable when net contributions are not positive', () => {
  assert.deepEqual(computeEstimatedReturn(500, 0), { available: false });
  assert.deepEqual(computeEstimatedReturn(500, -100), { available: false });
});

test('estimated return is signed basis points for positive contributions', () => {
  assert.deepEqual(computeEstimatedReturn(700_000, 10_000_000), { available: true, basisPoints: 700 });
  assert.deepEqual(computeEstimatedReturn(-500_000, 10_000_000), { available: true, basisPoints: -500 });
});

test('portfolio consolidates COP and USD current values at the valuation rate', async () => {
  const service = new InvestmentPortfolioService(
    new FakeAccountRepo([
      investmentAccount('trii', { currency: 'COP', balance: 8_000_000 }),
      investmentAccount('ibkr', { currency: 'USD', balance: 1_000_000 }),
      { id: 'checking', type: 'checking', currency: 'COP', balance: 5_000_000, isArchived: false },
    ]),
    new FakeInvestmentRepo({
      metadata: [metadata('trii'), metadata('ibkr')],
      latest: [valuation('trii', 8_500_000, 8_000_000), valuation('ibkr', 1_250_000, 1_000_000)],
    }),
  );

  const summary = await service.getPortfolio(RATE);
  assert.equal(summary.investmentAccountCount, 2); // the checking account is excluded
  assert.equal(summary.totalCurrentValueCopMinor, 59_750_000); // 8,500,000 + 51,250,000
  assert.equal(summary.netContributionsCopMinor, 49_000_000); // 8,000,000 + 41,000,000
  assert.equal(summary.estimatedGainLossCopMinor, 10_750_000);
  assert.deepEqual(summary.estimatedReturn, { available: true, basisPoints: 2194 });
  assert.equal(summary.incomplete, false);
  assert.equal(summary.lockedOrRestrictedValueCopMinor, 0);
});

test('portfolio is incomplete (null totals) when a USD account has no rate', async () => {
  const service = new InvestmentPortfolioService(
    new FakeAccountRepo([
      investmentAccount('trii', { currency: 'COP', balance: 8_000_000 }),
      investmentAccount('ibkr', { currency: 'USD', balance: 1_000_000 }),
    ]),
    new FakeInvestmentRepo({ metadata: [metadata('trii'), metadata('ibkr')], latest: [] }),
  );

  const summary = await service.getPortfolio(null);
  assert.equal(summary.incomplete, true);
  assert.equal(summary.totalCurrentValueCopMinor, null);
  assert.equal(summary.netContributionsCopMinor, null);
  assert.deepEqual(summary.estimatedReturn, { available: false });
  assert.deepEqual(summary.allocationByType, []);
});

test('an internal transfer between two investment accounts is portfolio neutral', async () => {
  // Before: A 10,000,000, B 10,000,000. After A -> B of 1,000,000: A 9M, B 11M.
  const service = new InvestmentPortfolioService(
    new FakeAccountRepo([
      investmentAccount('a', { currency: 'COP', balance: 9_000_000 }),
      investmentAccount('b', { currency: 'COP', balance: 11_000_000 }),
    ]),
    new FakeInvestmentRepo({ metadata: [metadata('a'), metadata('b')], latest: [] }),
  );

  const summary = await service.getPortfolio(null);
  // Net contributions and total value are unchanged at 20,000,000 regardless of the split.
  assert.equal(summary.netContributionsCopMinor, 20_000_000);
  assert.equal(summary.totalCurrentValueCopMinor, 20_000_000);
  assert.equal(summary.estimatedGainLossCopMinor, 0);
});

test('locked and restricted current value is subtotaled separately', async () => {
  const service = new InvestmentPortfolioService(
    new FakeAccountRepo([
      investmentAccount('cdt', { currency: 'COP', balance: 10_000_000 }),
      investmentAccount('trii', { currency: 'COP', balance: 8_000_000 }),
    ]),
    new FakeInvestmentRepo({
      metadata: [metadata('cdt', { investmentType: 'fixed_term_deposit', liquidity: 'locked' }), metadata('trii')],
      latest: [valuation('cdt', 10_500_000, 10_000_000)],
    }),
  );

  const summary = await service.getPortfolio(null);
  assert.equal(summary.lockedOrRestrictedValueCopMinor, 10_500_000); // only the CDT
  assert.equal(summary.totalCurrentValueCopMinor, 18_500_000);
});
