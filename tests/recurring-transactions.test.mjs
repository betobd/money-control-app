import assert from 'node:assert/strict';
import test from 'node:test';

import {
  collectDueDates,
  firstScheduledOnOrAfter,
  nextScheduledDate,
} from '../src/features/recurring-transactions/recurring-schedule.ts';
import {
  RecurringActionError,
  RecurringRuleValidationError,
  RecurringTransactionService,
} from '../src/features/recurring-transactions/recurring-transaction.service.ts';
import {
  TransactionService,
  TransactionValidationError,
} from '../src/features/transactions/transaction.service.ts';
import { subscribeToFinancialDataChanges } from '../src/features/transactions/financial-data-events.ts';

const NOW = '2026-07-16T15:00:00.000Z';

class Accounts {
  values = new Map([
    ['checking', { id: 'checking', type: 'checking', balance: 1_000_000, isArchived: false }],
    ['savings', { id: 'savings', type: 'savings', balance: 500_000, isArchived: false }],
    ['archived', { id: 'archived', type: 'cash', balance: 0, isArchived: true }],
  ]);
  async findById(id) { return this.values.get(id) ?? null; }
  async list(includeArchived) {
    return [...this.values.values()].filter((account) => includeArchived || !account.isArchived);
  }
}

class Categories {
  values = new Map([
    ['food', { id: 'food', type: 'expense', isArchived: false }],
    ['salary', { id: 'salary', type: 'income', isArchived: false }],
    ['archived', { id: 'archived', type: 'expense', isArchived: true }],
  ]);
  async findById(id) { return this.values.get(id) ?? null; }
}

class TransactionRepo {
  records = [];
  async create(transaction) { this.records.push(transaction); }
  async findById() { return null; }
  async hasAny() { return this.records.length > 0; }
  async list() { return { items: [], nextCursor: null }; }
  async listFilterOptions() { return { accounts: [], categories: [] }; }
  async recent() { return []; }
  async summarizeMonth() { return { income: 0, expenses: 0, net: 0 }; }
  async updatePosted() { return false; }
  async voidPosted() { return false; }
}

class RecurringRepo {
  rules = [];
  occurrences = [];
  transactions = [];
  async createRule(rule) { this.rules.push({ ...rule }); }
  async updateRule(id, rule) {
    const index = this.rules.findIndex((candidate) => candidate.id === id);
    this.rules[index] = { ...rule };
  }
  decorateRule(rule) {
    return rule ? {
      ...rule,
      accountName: rule.accountId,
      destinationAccountName: rule.destinationAccountId,
      categoryName: rule.categoryId,
    } : null;
  }
  decorateOccurrence(value) {
    return value ? {
      ...value,
      accountName: value.accountId,
      destinationAccountName: value.destinationAccountId,
      categoryName: value.categoryId,
    } : null;
  }
  async findRule(id) { return this.decorateRule(this.rules.find((rule) => rule.id === id)); }
  async listRules() { return this.rules.map((rule) => this.decorateRule(rule)); }
  async listDueRules(throughDate) {
    return this.rules.filter((rule) => rule.isActive && !rule.endedAt && rule.nextOccurrenceDate <= throughDate);
  }
  async findLatestScheduledDate(ruleId) {
    return this.occurrences
      .filter((occurrence) => occurrence.recurringTransactionId === ruleId)
      .map((occurrence) => occurrence.scheduledDate)
      .sort()
      .at(-1) ?? null;
  }
  async insertOccurrencesAndAdvance(ruleId, occurrences, nextOccurrenceDate, updatedAt) {
    for (const occurrence of occurrences) {
      if (!this.occurrences.some((candidate) =>
        candidate.recurringTransactionId === occurrence.recurringTransactionId
        && candidate.scheduledDate === occurrence.scheduledDate)) {
        this.occurrences.push({ ...occurrence });
      }
    }
    const rule = this.rules.find((candidate) => candidate.id === ruleId);
    Object.assign(rule, { nextOccurrenceDate, updatedAt });
  }
  async updateRuleLifecycle(id, state) {
    const rule = this.rules.find((candidate) => candidate.id === id);
    if (!rule) return false;
    Object.assign(rule, state);
    return true;
  }
  async findOccurrence(id) {
    return this.decorateOccurrence(this.occurrences.find((occurrence) => occurrence.id === id));
  }
  async listPendingDue(throughDate) {
    return this.occurrences
      .filter((occurrence) => occurrence.status === 'pending' && occurrence.scheduledDate <= throughDate)
      .map((occurrence) => this.decorateOccurrence(occurrence));
  }
  async listRecentOccurrences(limit) {
    return this.occurrences.filter((occurrence) => occurrence.status !== 'pending').slice(0, limit).map((value) => this.decorateOccurrence(value));
  }
  async updatePendingOccurrence(id, update) {
    const occurrence = this.occurrences.find((candidate) => candidate.id === id && candidate.status === 'pending');
    if (!occurrence) return false;
    Object.assign(occurrence, update);
    return true;
  }
  async skipPendingOccurrence(id, updatedAt) {
    const occurrence = this.occurrences.find((candidate) => candidate.id === id && candidate.status === 'pending');
    if (!occurrence) return false;
    Object.assign(occurrence, { status: 'skipped', updatedAt });
    return true;
  }
  async postPendingOccurrence(id, transaction, updatedAt) {
    const occurrence = this.occurrences.find((candidate) => candidate.id === id && candidate.status === 'pending');
    if (!occurrence) return false;
    this.transactions.push(transaction);
    Object.assign(occurrence, { status: 'posted', transactionId: transaction.id, updatedAt });
    return true;
  }
}

function expenseRule(overrides = {}) {
  return {
    type: 'expense',
    amount: 50_000,
    accountId: 'checking',
    destinationAccountId: null,
    categoryId: 'food',
    note: 'Internet',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-01-31',
    endDate: null,
    ...overrides,
  };
}

function setup(today = '2026-07-16') {
  const accounts = new Accounts();
  const categories = new Categories();
  const recurring = new RecurringRepo();
  const transactionRepo = new TransactionRepo();
  let sequence = 0;
  const transactionService = new TransactionService(
    transactionRepo,
    accounts,
    categories,
    () => `tx-${++sequence}`,
    () => NOW,
  );
  const service = new RecurringTransactionService(
    recurring,
    transactionService,
    () => `id-${++sequence}`,
    () => NOW,
    () => today,
  );
  return { accounts, categories, recurring, service, transactionRepo };
}

test('monthly schedules preserve the anchor day across short months', () => {
  assert.equal(nextScheduledDate('2026-01-31', '2026-01-31', 'monthly', 1), '2026-02-28');
  assert.equal(nextScheduledDate('2026-02-28', '2026-01-31', 'monthly', 1), '2026-03-31');
});

test('yearly schedules clamp leap day and restore it in leap years', () => {
  assert.equal(nextScheduledDate('2024-02-29', '2024-02-29', 'yearly', 1), '2025-02-28');
  assert.equal(nextScheduledDate('2027-02-28', '2024-02-29', 'yearly', 1), '2028-02-29');
});

test('biweekly schedules use a 14-day calendar interval', () => {
  assert.equal(nextScheduledDate('2026-07-01', '2026-07-01', 'weekly', 2), '2026-07-15');
  assert.equal(firstScheduledOnOrAfter('2026-07-01', '2026-07-16', 'weekly', 2), '2026-07-29');
});

test('daily, weekly, and yearly schedules advance by their calendar units', () => {
  assert.equal(nextScheduledDate('2026-07-16', '2026-07-16', 'daily', 1), '2026-07-17');
  assert.equal(nextScheduledDate('2026-07-16', '2026-07-16', 'weekly', 1), '2026-07-23');
  assert.equal(nextScheduledDate('2026-07-16', '2026-07-16', 'yearly', 1), '2027-07-16');
});

test('end dates are inclusive and stop later occurrences', () => {
  const result = collectDueDates({
    frequency: 'daily',
    interval: 1,
    startDate: '2026-07-14',
    nextOccurrenceDate: '2026-07-14',
    endDate: '2026-07-15',
  }, '2026-07-16', 100);
  assert.deepEqual(result.dates, ['2026-07-14', '2026-07-15']);
  assert.equal(result.nextDate, '2026-07-16');
});

test('catch-up generation is bounded and leaves a continuation cursor', () => {
  const result = collectDueDates({
    frequency: 'daily',
    interval: 1,
    startDate: '2026-01-01',
    nextOccurrenceDate: '2026-01-01',
    endDate: null,
  }, '2026-07-16', 100);
  assert.equal(result.dates.length, 100);
  assert.equal(result.nextDate, '2026-04-11');
  assert.equal(result.limited, true);
});

test('creates a transfer rule without reserving funds', async () => {
  const { service } = setup();
  const rule = await service.createRule({
    type: 'transfer',
    amount: 900_000,
    accountId: 'checking',
    destinationAccountId: 'savings',
    categoryId: null,
    note: 'Savings',
    frequency: 'weekly',
    interval: 2,
    startDate: '2026-07-16',
    endDate: null,
  });
  assert.equal(rule.type, 'transfer');
  assert.equal(rule.nextOccurrenceDate, '2026-07-16');
});

test('creates valid expense and income rules', async () => {
  const { service } = setup();
  assert.equal((await service.createRule(expenseRule())).type, 'expense');
  assert.equal((await service.createRule(expenseRule({
    type: 'income',
    categoryId: 'salary',
    note: 'Salary',
  }))).type, 'income');
});

test('rejects archived references and category type mismatches in rules', async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.createRule(expenseRule({ accountId: 'archived' })),
    (error) => error instanceof RecurringRuleValidationError && Boolean(error.fields.accountId),
  );
  await assert.rejects(
    () => service.createRule(expenseRule({ categoryId: 'salary' })),
    (error) => error instanceof RecurringRuleValidationError && Boolean(error.fields.categoryId),
  );
});

test('rejects invalid rule amount, dates, and same-account transfers', async () => {
  const { service } = setup();
  await assert.rejects(
    () => service.createRule(expenseRule({ amount: 0 })),
    (error) => error instanceof RecurringRuleValidationError && Boolean(error.fields.amount),
  );
  await assert.rejects(
    () => service.createRule(expenseRule({ startDate: '2026-02-30' })),
    (error) => error instanceof RecurringRuleValidationError && Boolean(error.fields.startDate),
  );
  await assert.rejects(
    () => service.createRule(expenseRule({ endDate: '2025-12-31' })),
    (error) => error instanceof RecurringRuleValidationError && Boolean(error.fields.endDate),
  );
  await assert.rejects(
    () => service.createRule({
      type: 'transfer',
      amount: 1_000,
      accountId: 'checking',
      destinationAccountId: 'checking',
      categoryId: null,
      note: null,
      frequency: 'monthly',
      interval: 1,
      startDate: '2026-07-16',
      endDate: null,
    }),
    (error) => error instanceof RecurringRuleValidationError && Boolean(error.fields.destinationAccountId),
  );
});

test('generates missed occurrences idempotently and advances the rule', async () => {
  const { recurring, service } = setup('2026-03-31');
  await service.createRule(expenseRule());
  const first = await service.generateDueOccurrences();
  const second = await service.generateDueOccurrences();
  assert.equal(first.generated, 3);
  assert.equal(second.generated, 0);
  assert.deepEqual(
    recurring.occurrences.map((occurrence) => occurrence.scheduledDate),
    ['2026-01-31', '2026-02-28', '2026-03-31'],
  );
  assert.equal(recurring.rules[0].nextOccurrenceDate, '2026-04-30');
});

test('pausing stops generation and resuming skips the paused interval', async () => {
  const context = setup('2026-07-16');
  const rule = await context.service.createRule(expenseRule({ startDate: '2026-01-31' }));
  await context.service.pauseRule(rule.id);
  assert.equal((await context.service.generateDueOccurrences()).generated, 0);
  await context.service.resumeRule(rule.id);
  assert.equal(context.recurring.rules[0].nextOccurrenceDate, '2026-07-31');
});

test('editing one occurrence does not mutate its rule', async () => {
  const { recurring, service } = setup('2026-01-31');
  await service.createRule(expenseRule());
  await service.generateDueOccurrences();
  const occurrence = recurring.occurrences[0];
  await service.updateOccurrence(occurrence.id, {
    type: 'expense',
    amount: 75_000,
    accountId: 'checking',
    destinationAccountId: null,
    categoryId: 'food',
    note: 'Edited once',
    scheduledDate: '2026-02-01',
  });
  assert.equal(recurring.occurrences[0].amount, 75_000);
  assert.equal(recurring.rules[0].amount, 50_000);
});

test('confirming posts exactly once through TransactionService and links the occurrence', async () => {
  const { recurring, service } = setup('2026-01-31');
  await service.createRule(expenseRule());
  await service.generateDueOccurrences();
  const occurrence = recurring.occurrences[0];
  const transaction = await service.confirmOccurrence(occurrence.id);
  assert.equal(transaction.status, 'posted');
  assert.equal(transaction.transactionDate, '2026-01-31');
  assert.equal(recurring.transactions.length, 1);
  assert.equal(recurring.occurrences[0].status, 'posted');
  assert.equal(recurring.occurrences[0].transactionId, transaction.id);
  await assert.rejects(
    () => service.confirmOccurrence(occurrence.id),
    (error) => error instanceof RecurringActionError && error.code === 'occurrence_not_pending',
  );
  assert.equal(recurring.transactions.length, 1);
});

test('confirms income and transfer occurrences through the normal transaction flow', async () => {
  const incomeContext = setup('2026-07-16');
  await incomeContext.service.createRule(expenseRule({
    type: 'income',
    categoryId: 'salary',
    startDate: '2026-07-16',
    note: 'Salary',
  }));
  await incomeContext.service.generateDueOccurrences();
  const income = await incomeContext.service.confirmOccurrence(incomeContext.recurring.occurrences[0].id);
  assert.equal(income.type, 'income');

  const transferContext = setup('2026-07-16');
  await transferContext.service.createRule({
    type: 'transfer',
    amount: 100_000,
    accountId: 'checking',
    destinationAccountId: 'savings',
    categoryId: null,
    note: 'Move savings',
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-07-16',
    endDate: null,
  });
  await transferContext.service.generateDueOccurrences();
  const transfer = await transferContext.service.confirmOccurrence(transferContext.recurring.occurrences[0].id);
  assert.equal(transfer.type, 'transfer');
  assert.equal(transfer.destinationAccountId, 'savings');
});

test('confirmation revalidates current account state and transfer funds', async () => {
  const context = setup('2026-07-16');
  await context.service.createRule({
    type: 'transfer',
    amount: 900_000,
    accountId: 'checking',
    destinationAccountId: 'savings',
    categoryId: null,
    note: null,
    frequency: 'monthly',
    interval: 1,
    startDate: '2026-07-16',
    endDate: null,
  });
  await context.service.generateDueOccurrences();
  context.accounts.values.get('checking').balance = 100_000;
  await assert.rejects(
    () => context.service.confirmOccurrence(context.recurring.occurrences[0].id),
    (error) => error instanceof TransactionValidationError
      && /insufficient funds/i.test(error.fields.amount),
  );
  assert.equal(context.recurring.occurrences[0].status, 'pending');
  assert.equal(context.recurring.transactions.length, 0);
});

test('skipping has no financial effect and cannot be repeated', async () => {
  const { recurring, service } = setup('2026-01-31');
  await service.createRule(expenseRule());
  await service.generateDueOccurrences();
  const occurrence = recurring.occurrences[0];
  await service.skipOccurrence(occurrence.id);
  assert.equal(recurring.occurrences[0].status, 'skipped');
  assert.equal(recurring.transactions.length, 0);
  await assert.rejects(
    () => service.skipOccurrence(occurrence.id),
    (error) => error instanceof RecurringActionError && error.code === 'occurrence_not_pending',
  );
});

test('successful confirmation invalidates financial views while failed confirmation does not', async () => {
  const context = setup('2026-07-16');
  await context.service.createRule(expenseRule({ startDate: '2026-07-16' }));
  await context.service.generateDueOccurrences();
  let refreshes = 0;
  const unsubscribe = subscribeToFinancialDataChanges(() => { refreshes += 1; });
  await context.service.confirmOccurrence(context.recurring.occurrences[0].id);
  assert.equal(refreshes, 1);

  const failure = setup('2026-07-16');
  await failure.service.createRule(expenseRule({ startDate: '2026-07-16' }));
  await failure.service.generateDueOccurrences();
  failure.accounts.values.get('checking').isArchived = true;
  await assert.rejects(() => failure.service.confirmOccurrence(failure.recurring.occurrences[0].id));
  unsubscribe();
  assert.equal(refreshes, 1);
});

test('editing future behavior preserves generated history and ending is terminal', async () => {
  const context = setup('2026-01-31');
  const rule = await context.service.createRule(expenseRule());
  await context.service.generateDueOccurrences();
  const posted = await context.service.confirmOccurrence(context.recurring.occurrences[0].id);
  await context.service.updateRule(rule.id, expenseRule({ amount: 80_000, frequency: 'weekly', startDate: '2026-01-31' }));
  assert.equal(context.recurring.occurrences[0].amount, 50_000);
  assert.equal(context.recurring.occurrences[0].transactionId, posted.id);
  assert.equal(context.recurring.rules[0].amount, 80_000);
  await context.service.endRule(rule.id);
  assert.ok(context.recurring.rules[0].endedAt);
  await assert.rejects(
    () => context.service.resumeRule(rule.id),
    (error) => error instanceof RecurringActionError && error.code === 'rule_ended',
  );
});
