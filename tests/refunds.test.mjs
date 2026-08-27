import assert from 'node:assert/strict';
import test from 'node:test';

import {
  RefundActionError,
  RefundService,
  RefundValidationError,
} from '../src/features/refunds/refund.service.ts';
import { subscribeToFinancialDataChanges } from '../src/features/transactions/financial-data-events.ts';

import { testBaseCurrency } from './support/base-currency.mjs';



const NOW = '2026-07-24T12:00:00.000Z';

function expense(overrides = {}) {
  return {
    id: 'expense-1',
    type: 'expense',
    status: 'posted',
    amount: 100_000,
    currency: 'COP',
    accountId: 'checking',
    destinationAccountId: null,
    categoryId: 'food',
    originalTransactionId: null,
    note: 'Groceries',
    transactionDate: '2026-07-20',
    createdAt: NOW,
    updatedAt: NOW,
    accountName: 'Checking',
    destinationAccountName: null,
    categoryName: 'Food',
    categoryIcon: 'food',
    originalTransactionDate: null,
    originalTransactionNote: null,
    ...overrides,
  };
}

function refund(id, amount, status = 'posted') {
  return {
    ...expense(),
    id,
    type: 'refund',
    status,
    amount,
    categoryId: null,
    originalTransactionId: 'expense-1',
    note: null,
    transactionDate: '2026-07-24',
    categoryName: 'Food',
    originalTransactionDate: '2026-07-20',
    originalTransactionNote: 'Groceries',
  };
}

class Repository {
  created;
  voided;
  async createAtomic(record, today) {
    this.created = { record, today };
    return refund(record.id, record.amount);
  }
  async voidAtomic(id, updatedAt) {
    this.voided = { id, updatedAt };
    return refund(id, 20_000, 'voided');
  }
}

class Transactions {
  original = expense();
  refunds = [];
  async get() { return this.original; }
  async list(query) {
    return {
      items: this.refunds.filter((row) => row.originalTransactionId === query.originalTransactionId),
      nextCursor: null,
    };
  }
}

function setup() {
  const repository = new Repository();
  const transactions = new Transactions();
  return {
    repository,
    transactions,
    service: new RefundService(
      repository,
      transactions,
      () => 'refund-1',
      () => NOW,
      () => '2026-07-24',
      testBaseCurrency,
    ),
  };
}

test('creates through the atomic repository with normalized input', async () => {
  const { repository, service } = setup();
  const value = await service.create({
    originalTransactionId: ' expense-1 ',
    amount: 25_000,
    transactionDate: '2026-07-24',
    note: ' merchant credit ',
  });
  assert.equal(value.type, 'refund');
  assert.deepEqual(repository.created, {
    record: {
      id: 'refund-1',
      originalTransactionId: 'expense-1',
      amount: 25_000,
      currency: 'COP',
      baseAmountMinor: 25_000,
      baseCurrencyCode: 'COP',
      exchangeRate: null,
      transactionDate: '2026-07-24',
      note: 'merchant credit',
      createdAt: NOW,
      updatedAt: NOW,
    },
    today: '2026-07-24',
  });
});

test('rejects invalid amounts, dates, and notes before persistence', async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.create({
      originalTransactionId: 'expense-1',
      amount: 0,
      transactionDate: '2026-02-30',
      note: 'x'.repeat(201),
    }),
    (error) => error instanceof RefundValidationError
      && Boolean(error.fields.amount)
      && Boolean(error.fields.transactionDate)
      && Boolean(error.fields.note),
  );
});

test('summarizes multiple partial refunds, ignores voided amounts, and reaches full status', async () => {
  const { service, transactions } = setup();
  transactions.refunds = [
    refund('refund-1', 30_000),
    refund('refund-2', 20_000),
    refund('refund-voided', 10_000, 'voided'),
  ];
  const partial = await service.summarize('expense-1');
  assert.equal(partial.refundedAmount, 50_000);
  assert.equal(partial.netExpense, 50_000);
  assert.equal(partial.refundableRemaining, 50_000);
  assert.equal(partial.refundStatus, 'partial');

  transactions.refunds.push(refund('refund-3', 50_000));
  const full = await service.summarize('expense-1');
  assert.equal(full.refundedAmount, 100_000);
  assert.equal(full.netExpense, 0);
  assert.equal(full.refundStatus, 'full');
});

test('void delegates to the atomic repository', async () => {
  const { repository, service } = setup();
  const value = await service.void('refund-1');
  assert.equal(value.status, 'voided');
  assert.deepEqual(repository.voided, { id: 'refund-1', updatedAt: NOW });
});

test('notification listener failures never fail a persisted refund', async () => {
  const remove = subscribeToFinancialDataChanges(() => {
    throw new Error('notification refresh failed');
  });
  try {
    const { service } = setup();
    assert.equal((await service.create({
      originalTransactionId: 'expense-1',
      amount: 1,
      transactionDate: '2026-07-24',
      note: null,
    })).id, 'refund-1');
  } finally {
    remove();
  }
});

test('surfaces user-safe atomic stale-state errors', async () => {
  const { repository, service } = setup();
  repository.createAtomic = async () => {
    throw new RefundActionError(
      'original_not_posted_expense',
      'Refunds can only be added to a posted expense.',
    );
  };
  await assert.rejects(
    () => service.create({
      originalTransactionId: 'expense-1',
      amount: 1,
      transactionDate: '2026-07-24',
      note: null,
    }),
    (error) => error instanceof RefundActionError
      && error.code === 'original_not_posted_expense',
  );
});
