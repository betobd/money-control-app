import assert from 'node:assert/strict';
import test from 'node:test';

import {
  InvestmentService,
  InvestmentValidationError,
  validateInvestmentInput,
} from '../src/features/investments/investment.service.ts';
import {
  InvestmentValuationError,
  InvestmentValuationService,
} from '../src/features/investments/investment-valuation.service.ts';

const NOW = '2026-07-12T12:00:00.000Z';
const TODAY = '2026-07-12';

const validInput = {
  name: 'Trii',
  currency: 'COP',
  openingBalanceMinor: 0,
  investmentType: 'brokerage',
  liquidity: 'liquid',
  providerName: null,
  startDate: null,
  maturityDate: null,
  note: null,
};

function makeDb() {
  return { accounts: [], metadata: new Map(), valuations: [] };
}

class MemoryAccountRepo {
  constructor(db) {
    this.db = db;
  }
  async findById(id) {
    const a = this.db.accounts.find((x) => x.id === id);
    return a ? { ...a } : null;
  }
  async findActiveByNormalizedName(name, excludingId) {
    return (
      this.db.accounts.find(
        (a) => !a.isArchived && a.id !== excludingId && a.name.trim().toLocaleLowerCase('es-CO') === name,
      ) ?? null
    );
  }
  async getDeletionEligibility(id) {
    const a = this.db.accounts.find((x) => x.id === id);
    return { account: a ? { ...a } : null, hasFinancialReferences: Boolean(a?._hasRefs) };
  }
  async hasPostedTransactions(id) {
    return Boolean(this.db.accounts.find((x) => x.id === id)?._posted);
  }
  async list(includeArchived) {
    return this.db.accounts.filter((a) => includeArchived || !a.isArchived).map((a) => ({ ...a }));
  }
}

class MemoryInvestmentRepo {
  constructor(db) {
    this.db = db;
  }
  async createInvestmentAccount(account, metadata) {
    this.db.accounts.push({ ...account, balance: account.openingBalance });
    this.db.metadata.set(account.id, { ...metadata });
  }
  async updateInvestmentAccount(id, account, metadata) {
    Object.assign(
      this.db.accounts.find((x) => x.id === id),
      { name: account.name, currency: account.currency, openingBalance: account.openingBalance, updatedAt: account.updatedAt },
    );
    Object.assign(this.db.metadata.get(id), metadata);
  }
  async findMetadata(id) {
    const m = this.db.metadata.get(id);
    return m ? { ...m } : null;
  }
  async listMetadata() {
    return [...this.db.metadata.values()].map((m) => ({ ...m }));
  }
  async createValuation(v) {
    this.db.valuations.push({ ...v });
  }
  async updateValuation(id, u) {
    Object.assign(this.db.valuations.find((v) => v.id === id), u);
  }
  async deleteValuation(id) {
    this.db.valuations = this.db.valuations.filter((v) => v.id !== id);
  }
  async findValuationById(id) {
    const v = this.db.valuations.find((x) => x.id === id);
    return v ? { ...v } : null;
  }
  async findValuationByDate(accountId, date) {
    const v = this.db.valuations.find((x) => x.investmentAccountId === accountId && x.valuationDate === date);
    return v ? { ...v } : null;
  }
  async findLatestValuation(accountId) {
    const [v] = this.db.valuations
      .filter((x) => x.investmentAccountId === accountId)
      .sort((a, b) => b.valuationDate.localeCompare(a.valuationDate));
    return v ? { ...v } : null;
  }
  async listValuations(accountId) {
    return this.db.valuations
      .filter((x) => x.investmentAccountId === accountId)
      .sort((a, b) => b.valuationDate.localeCompare(a.valuationDate))
      .map((v) => ({ ...v }));
  }
  async listLatestValuations() {
    const byAccount = new Map();
    for (const v of this.db.valuations) {
      const current = byAccount.get(v.investmentAccountId);
      if (!current || v.valuationDate > current.valuationDate) byAccount.set(v.investmentAccountId, v);
    }
    return [...byAccount.values()].map((v) => ({ ...v }));
  }
  async getContributionSummary(accountId) {
    const a = this.db.accounts.find((x) => x.id === accountId);
    return { investmentAccountId: accountId, totalContributionsMinor: a ? a.balance : 0, totalWithdrawalsMinor: 0 };
  }
  async listContributionSummaries() {
    return this.db.accounts
      .filter((a) => a.type === 'investment')
      .map((a) => ({ investmentAccountId: a.id, totalContributionsMinor: a.balance, totalWithdrawalsMinor: 0 }));
  }
}

function setup() {
  const db = makeDb();
  const accountRepository = new MemoryAccountRepo(db);
  const investmentRepository = new MemoryInvestmentRepo(db);
  let id = 0;
  const service = new InvestmentService(accountRepository, investmentRepository, {
    createId: () => `inv-${++id}`,
    now: () => NOW,
  });
  const valuationService = new InvestmentValuationService(accountRepository, investmentRepository, {
    createId: () => `val-${++id}`,
    now: () => NOW,
    today: () => TODAY,
  });
  return { db, service, valuationService };
}

async function validationFields(action) {
  try {
    await action();
  } catch (error) {
    assert.ok(error instanceof InvestmentValidationError);
    return error.fields;
  }
  throw new Error('Expected validation failure.');
}

test('creates an investment account with metadata atomically', async () => {
  const { db, service } = setup();
  const { account, metadata } = await service.create({
    ...validInput,
    name: '  Interactive Brokers  ',
    currency: 'USD',
    investmentType: 'brokerage',
    liquidity: 'liquid',
    providerName: '  IBKR  ',
  });
  assert.equal(account.type, 'investment');
  assert.equal(account.name, 'Interactive Brokers');
  assert.equal(account.currency, 'USD');
  assert.equal(metadata.trackingMode, 'balance');
  assert.equal(metadata.providerName, 'IBKR');
  assert.equal(db.accounts.length, 1);
  assert.equal(db.metadata.get(account.id).liquidity, 'liquid');
});

test('rejects a duplicate active investment name', async () => {
  const { service } = setup();
  await service.create({ ...validInput, name: 'Trii' });
  const fields = await validationFields(() => service.create({ ...validInput, name: 'trii' }));
  assert.equal(fields.name, 'An active account already uses this name.');
});

test('validateInvestmentInput flags bad type, liquidity, negative value and maturity order', () => {
  const { errors } = validateInvestmentInput({
    ...validInput,
    name: 'X',
    investmentType: 'crypto',
    liquidity: 'semi',
    openingBalanceMinor: -1,
    startDate: '2027-01-15',
    maturityDate: '2026-01-15',
  });
  assert.ok(errors.investmentType);
  assert.ok(errors.liquidity);
  assert.ok(errors.openingBalance);
  assert.equal(errors.maturityDate, 'Maturity date cannot be before the start date.');
});

test('records a valuation snapshotting current net contributions as basis', async () => {
  const { db, service, valuationService } = setup();
  const { account } = await service.create({ ...validInput, name: 'IBKR', currency: 'USD' });
  // Simulate USD 10,000.00 net contributions via transfers.
  db.accounts.find((a) => a.id === account.id).balance = 1_000_000;

  const valuation = await valuationService.record(account.id, {
    valueMinor: 1_250_000,
    valuationDate: '2026-03-31',
    note: '  Q1 statement  ',
  });
  assert.equal(valuation.valueMinor, 1_250_000);
  assert.equal(valuation.basisMinor, 1_000_000);
  assert.equal(valuation.currencyCode, 'USD');
  assert.equal(valuation.note, 'Q1 statement');
});

test('recording on an existing date replaces rather than duplicates', async () => {
  const { db, service, valuationService } = setup();
  const { account } = await service.create({ ...validInput, name: 'Trii' });
  db.accounts.find((a) => a.id === account.id).balance = 8_000_000;

  await valuationService.record(account.id, { valueMinor: 8_100_000, valuationDate: '2026-02-28', note: null });
  await valuationService.record(account.id, { valueMinor: 8_250_000, valuationDate: '2026-02-28', note: null });

  const list = await valuationService.list(account.id);
  assert.equal(list.length, 1);
  assert.equal(list[0].valueMinor, 8_250_000);
});

test('rejects a future valuation date and revaluing an archived investment', async () => {
  const { db, service, valuationService } = setup();
  const { account } = await service.create({ ...validInput, name: 'Trii' });

  await assert.rejects(
    () => valuationService.record(account.id, { valueMinor: 100, valuationDate: '2026-07-13', note: null }),
    (error) => error instanceof InvestmentValuationError && error.code === 'date_in_future',
  );

  db.accounts.find((a) => a.id === account.id).isArchived = true;
  await assert.rejects(
    () => valuationService.record(account.id, { valueMinor: 100, valuationDate: TODAY, note: null }),
    (error) => error instanceof InvestmentValuationError && error.code === 'investment_archived',
  );
});
