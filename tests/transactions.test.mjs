import assert from 'node:assert/strict';
import test from 'node:test';

import {
  groupTransactions,
  signedTransactionAmount,
  transactionAccountLabel,
} from '../src/features/transactions/transaction-presentation.ts';
import { bogotaToday, isValidCalendarDate } from '../src/features/transactions/transaction-date.ts';
import {
  TransactionService,
  TransactionValidationError,
} from '../src/features/transactions/transaction.service.ts';
import { subscribeToFinancialDataChanges } from '../src/features/transactions/financial-data-events.ts';

const NOW = '2026-07-12T15:30:00.000Z';

class Repo {
  records = [];
  async create(value) { this.records.push({ ...value }); }
  async list() { return this.records; }
  async recent(limit) { return this.records.slice(0, limit); }
  async summarizeMonth() {
    const posted = this.records.filter((record) => record.status === 'posted');
    const income = posted.filter((record) => record.type === 'income').reduce((sum, record) => sum + record.amount, 0);
    const expenses = posted.filter((record) => record.type === 'expense').reduce((sum, record) => sum + record.amount, 0);
    return { income, expenses, net: income - expenses };
  }
}

function account(id, type, balance, isArchived = false) {
  return { id, type, balance, isArchived };
}

class Accounts {
  values = new Map([
    ['active', account('active', 'checking', 1_000_000)],
    ['savings', account('savings', 'savings', 500_000)],
    ['cash', account('cash', 'cash', 100_000)],
    ['archived', account('archived', 'savings', 800_000, true)],
    ['card', account('card', 'credit_card', -1_050_000)],
  ]);
  async findById(id) { return this.values.get(id) ?? null; }
  async list(includeArchived) {
    return [...this.values.values()].filter((value) => includeArchived || !value.isArchived);
  }
}

class Categories {
  values = new Map([
    ['expense', { id: 'expense', type: 'expense', isArchived: false }],
    ['income', { id: 'income', type: 'income', isArchived: false }],
    ['archived', { id: 'archived', type: 'expense', isArchived: true }],
  ]);
  async findById(id) { return this.values.get(id) ?? null; }
}

function setup() {
  const repository = new Repo();
  return {
    repository,
    service: new TransactionService(repository, new Accounts(), new Categories(), () => 'tx-1', () => NOW),
  };
}

const valid = {
  type: 'expense',
  amount: 50_000,
  accountId: 'active',
  categoryId: 'expense',
  transactionDate: '2026-07-12',
  note: ' lunch ',
};
const validTransfer = {
  type: 'transfer',
  amount: 400_000,
  accountId: 'active',
  destinationAccountId: 'savings',
  categoryId: null,
  transactionDate: '2026-07-12',
  note: ' savings goal ',
};

async function fields(action) {
  try {
    await action();
  } catch (error) {
    assert.ok(error instanceof TransactionValidationError);
    return error.fields;
  }
  throw new Error('Expected validation error');
}

test('creates a posted expense with positive magnitude and trimmed note', async () => {
  const { service } = setup();
  const value = await service.create(valid);
  assert.equal(value.type, 'expense');
  assert.equal(value.amount, 50_000);
  assert.equal(value.note, 'lunch');
  assert.equal(value.status, 'posted');
  assert.equal(value.destinationAccountId, null);
  assert.equal(value.createdAt, NOW);
  assert.equal(value.updatedAt, NOW);
});

test('creates a valid income', async () => {
  const { service } = setup();
  assert.equal((await service.create({ ...valid, type: 'income', categoryId: 'income' })).type, 'income');
});

test('creates one posted transfer row with source, destination, no category, and trimmed note', async () => {
  const { repository, service } = setup();
  const transfer = await service.create(validTransfer);
  assert.equal(repository.records.length, 1);
  assert.equal(transfer.type, 'transfer');
  assert.equal(transfer.status, 'posted');
  assert.equal(transfer.amount, 400_000);
  assert.equal(transfer.accountId, 'active');
  assert.equal(transfer.destinationAccountId, 'savings');
  assert.equal(transfer.categoryId, null);
  assert.equal(transfer.note, 'savings goal');
});

test('permits checking-to-card payments and credit-card-to-checking transfers', async () => {
  const { service } = setup();
  const payment = await service.create({ ...validTransfer, amount: 500_000, destinationAccountId: 'card' });
  const cardSource = await service.create({ ...validTransfer, accountId: 'card', destinationAccountId: 'active', amount: 2_000_000 });
  assert.equal(payment.destinationAccountId, 'card');
  assert.equal(cardSource.accountId, 'card');
});

test('transfers do not change monthly income, expenses, or net cash flow', async () => {
  const { service } = setup();
  await service.create(validTransfer);
  assert.deepEqual(await service.summarizeMonth('2026-07'), { income: 0, expenses: 0, net: 0 });
});

test('rejects unsupported transaction types', async () => {
  assert.ok((await fields(() => setup().service.create({ ...valid, type: 'split' }))).type);
});

for (const amount of [0, -1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
  test(`rejects invalid amount ${amount}`, async () => {
    assert.ok((await fields(() => setup().service.create({ ...valid, amount }))).amount);
    assert.ok((await fields(() => setup().service.create({ ...validTransfer, amount }))).amount);
  });
}

test('rejects missing and archived accounts for categorized transactions', async () => {
  assert.ok((await fields(() => setup().service.create({ ...valid, accountId: '' }))).accountId);
  assert.ok((await fields(() => setup().service.create({ ...valid, accountId: 'archived' }))).accountId);
});

test('rejects missing, archived, and identical transfer accounts', async () => {
  assert.ok((await fields(() => setup().service.create({ ...validTransfer, accountId: '' }))).accountId);
  assert.ok((await fields(() => setup().service.create({ ...validTransfer, destinationAccountId: '' }))).destinationAccountId);
  assert.ok((await fields(() => setup().service.create({ ...validTransfer, accountId: 'archived' }))).accountId);
  assert.ok((await fields(() => setup().service.create({ ...validTransfer, destinationAccountId: 'archived' }))).destinationAccountId);
  assert.match(
    (await fields(() => setup().service.create({ ...validTransfer, destinationAccountId: 'active' }))).destinationAccountId,
    /different/i,
  );
});

test('rejects insufficient funds for asset accounts but not credit cards', async () => {
  assert.match(
    (await fields(() => setup().service.create({ ...validTransfer, amount: 1_000_001 }))).amount,
    /available balance/i,
  );
  const { service } = setup();
  const transfer = await service.create({
    ...validTransfer,
    accountId: 'card',
    destinationAccountId: 'active',
    amount: 2_000_000,
  });
  assert.equal(transfer.amount, 2_000_000);
});

test('rejects missing and archived categories', async () => {
  assert.ok((await fields(() => setup().service.create({ ...valid, categoryId: '' }))).categoryId);
  assert.ok((await fields(() => setup().service.create({ ...valid, categoryId: 'archived' }))).categoryId);
});

test('rejects category type mismatches', async () => {
  assert.ok((await fields(() => setup().service.create({ ...valid, categoryId: 'income' }))).categoryId);
  assert.ok((await fields(() => setup().service.create({ ...valid, type: 'income', categoryId: 'expense' }))).categoryId);
});

test('validates and preserves Bogotá-local calendar dates', async () => {
  const { service } = setup();
  assert.equal((await service.create(valid)).transactionDate, '2026-07-12');
  assert.equal(isValidCalendarDate('2026-02-30'), false);
  assert.equal(bogotaToday(new Date('2026-07-13T02:00:00Z')), '2026-07-12');
  assert.ok((await fields(() => service.create({ ...validTransfer, transactionDate: '2026-02-30' }))).transactionDate);
});

test('normalizes blank notes to null and enforces length for transfers', async () => {
  const { service } = setup();
  assert.equal((await service.create({ ...validTransfer, note: '   ' })).note, null);
  assert.ok((await fields(() => service.create({ ...validTransfer, note: 'x'.repeat(201) }))).note);
});

test('formats transfer history without a plus or minus sign', () => {
  const item = {
    ...validTransfer,
    amount: 500_000,
    accountName: 'Checking',
    destinationAccountName: 'Card',
  };
  assert.equal(signedTransactionAmount(item), '$500.000');
  assert.equal(transactionAccountLabel(item), 'Checking → Card');
});

test('groups already-sorted transactions by financial date', () => {
  const items = [
    { id: 'new', transactionDate: '2026-07-12' },
    { id: 'older', transactionDate: '2026-07-11' },
  ];
  const groups = groupTransactions(items);
  assert.deepEqual(groups.map((group) => group.id), ['2026-07-12', '2026-07-11']);
});

test('notifies financial views only after transfer persistence succeeds', async () => {
  const { service } = setup();
  let refreshes = 0;
  const unsubscribe = subscribeToFinancialDataChanges(() => { refreshes += 1; });
  await service.create(validTransfer);
  unsubscribe();
  assert.equal(refreshes, 1);
});
