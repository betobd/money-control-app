import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BudgetActionError,
  BudgetService,
  BudgetValidationError,
  calculateBudget,
  calculateBudgetSummary,
} from '../src/features/budgets/budget.service.ts';
import { shiftBudgetMonth } from '../src/features/budgets/budget-month.ts';

const NOW = '2026-07-13T12:00:00.000Z';
const categories = [
  { id: 'food', name: 'Food & Dining', type: 'expense', icon: 'food', isArchived: false },
  { id: 'travel', name: 'Travel', type: 'expense', icon: 'travel', isArchived: false },
  { id: 'other', name: 'Other', type: 'expense', icon: 'other', isArchived: false },
  { id: 'archived', name: 'Old household', type: 'expense', icon: 'home', isArchived: true },
  { id: 'salary', name: 'Salary', type: 'income', icon: 'salary', isArchived: false },
];

class MemoryCategoryRepository {
  async findById(id) { return categories.find((category) => category.id === id) ?? null; }
}

class MemoryBudgetRepository {
  records = [];
  spending = new Map();

  category(id) { return categories.find((category) => category.id === id); }
  record(value) {
    const category = this.category(value.categoryId);
    return category ? {
      ...value,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryIsArchived: category.isArchived,
    } : null;
  }
  async create(value) { this.records.push({ ...value }); }
  async findById(id) { const value = this.records.find((record) => record.id === id); return value ? this.record(value) : null; }
  async findDuplicate(categoryId, month, excludingId) {
    const value = this.records.find((record) => record.categoryId === categoryId && record.month === month && record.id !== excludingId);
    return value ? this.record(value) : null;
  }
  async listMonth(month) {
    return this.records
      .filter((record) => record.month === month)
      .map((record) => ({ ...this.record(record), spent: this.spending.get(record.id) ?? 0 }));
  }
  async update(id, update) { Object.assign(this.records.find((record) => record.id === id), update); }
  async remove(id) { this.records = this.records.filter((record) => record.id !== id); }
}

function setup() {
  const repository = new MemoryBudgetRepository();
  let changed = 0;
  let id = 0;
  const service = new BudgetService(repository, new MemoryCategoryRepository(), {
    createId: () => `budget-${++id}`,
    now: () => NOW,
    notifyChanged: () => { changed += 1; },
  });
  return { repository, service, changed: () => changed };
}

async function validationFields(action) {
  try {
    await action();
  } catch (error) {
    assert.ok(error instanceof BudgetValidationError);
    return error.fields;
  }
  throw new Error('Expected BudgetValidationError.');
}

const valid = { categoryId: 'food', month: '2026-07', limitAmount: 600000 };

test('creates a valid monthly budget and publishes invalidation after persistence', async () => {
  const { repository, service, changed } = setup();
  const budget = await service.create({ ...valid, categoryId: ' food ', month: ' 2026-07 ' });
  assert.deepEqual(repository.records[0], budget);
  assert.equal(budget.categoryId, 'food');
  assert.equal(budget.limitAmount, 600000);
  assert.equal(changed(), 1);
});

for (const [label, input, field] of [
  ['missing category', { ...valid, categoryId: '' }, 'categoryId'],
  ['unknown category', { ...valid, categoryId: 'missing' }, 'categoryId'],
  ['income category', { ...valid, categoryId: 'salary' }, 'categoryId'],
  ['archived category', { ...valid, categoryId: 'archived' }, 'categoryId'],
  ['invalid month', { ...valid, month: '2026-13' }, 'month'],
  ['zero limit', { ...valid, limitAmount: 0 }, 'limitAmount'],
  ['negative limit', { ...valid, limitAmount: -1 }, 'limitAmount'],
  ['fractional limit', { ...valid, limitAmount: 1.5 }, 'limitAmount'],
  ['unsafe limit', { ...valid, limitAmount: Number.MAX_SAFE_INTEGER + 1 }, 'limitAmount'],
]) {
  test(`rejects ${label}`, async () => {
    const { service, changed } = setup();
    const fields = await validationFields(() => service.create(input));
    assert.ok(fields[field]);
    assert.equal(changed(), 0);
  });
}

test('rejects a duplicate category and month but allows another month', async () => {
  const { service } = setup();
  await service.create(valid);
  const fields = await validationFields(() => service.create(valid));
  assert.match(fields.categoryId, /already has a budget/i);
  await service.create({ ...valid, month: '2026-08' });
});

test('edits a budget limit and preserves its identity', async () => {
  const { repository, service, changed } = setup();
  const budget = await service.create(valid);
  await service.update(budget.id, { ...valid, limitAmount: 750000 });
  assert.equal(repository.records[0].id, budget.id);
  assert.equal(repository.records[0].limitAmount, 750000);
  assert.equal(repository.records[0].createdAt, NOW);
  assert.equal(changed(), 2);
});

test('allows an unchanged archived historical category but rejects switching to it', async () => {
  const { repository, service } = setup();
  repository.records.push({ id: 'historical', categoryId: 'archived', month: '2026-06', limitAmount: 100000, createdAt: NOW, updatedAt: NOW });
  await service.update('historical', { categoryId: 'archived', month: '2026-06', limitAmount: 120000 });
  const active = await service.create(valid);
  const fields = await validationFields(() => service.update(active.id, { ...valid, categoryId: 'archived' }));
  assert.ok(fields.categoryId);
});

test('removes only the budget plan and reports a missing budget', async () => {
  const { repository, service, changed } = setup();
  const budget = await service.create(valid);
  await service.remove(budget.id);
  assert.equal(repository.records.length, 0);
  assert.equal(changed(), 2);
  await assert.rejects(() => service.remove('missing'), (error) => error instanceof BudgetActionError && error.code === 'not_found');
});

const baseRecord = {
  id: 'food-july',
  categoryId: 'food',
  categoryName: 'Food & Dining',
  categoryIcon: 'food',
  categoryIsArchived: false,
  month: '2026-07',
  limitAmount: 1000,
  createdAt: NOW,
  updatedAt: NOW,
};

for (const [spent, status, percentage, width, remaining] of [
  [799, 'on-track', 79.9, '79.9%', 201],
  [800, 'near-limit', 80, '80%', 200],
  [1000, 'fully-used', 100, '100%', 0],
  [1150, 'over-budget', 115, '100%', -150],
]) {
  test(`calculates ${status} status and progress safely`, () => {
    const budget = calculateBudget({ ...baseRecord, spent });
    assert.equal(budget.status, status);
    assert.equal(budget.percentageUsed, percentage);
    assert.equal(budget.progressWidth, width);
    assert.equal(budget.remaining, remaining);
  });
}

test('calculates monthly summary from budgeted categories without double counting', () => {
  const first = calculateBudget({ ...baseRecord, limitAmount: 600000, spent: 250000 });
  const second = calculateBudget({ ...baseRecord, id: 'travel', categoryId: 'travel', categoryName: 'Travel', limitAmount: 400000, spent: 100000 });
  const summary = calculateBudgetSummary([first, second]);
  assert.deepEqual(summary, {
    totalBudget: 1000000,
    totalSpent: 350000,
    totalRemaining: 650000,
    percentageUsed: 35,
    progressWidth: '35%',
  });
});

test('listMonth exposes the same summary used by Budgets and Home', async () => {
  const { repository, service } = setup();
  const food = await service.create(valid);
  const travel = await service.create({ ...valid, categoryId: 'travel', limitAmount: 400000 });
  repository.spending.set(food.id, 250000);
  repository.spending.set(travel.id, 100000);
  const view = await service.listMonth('2026-07');
  assert.equal(view.budgets.length, 2);
  assert.equal(view.summary.totalBudget, 1000000);
  assert.equal(view.summary.totalSpent, 350000);
});

test('supports deterministic budget month navigation', () => {
  assert.equal(shiftBudgetMonth('2026-12', 1), '2027-01');
  assert.equal(shiftBudgetMonth('2026-01', -1), '2025-12');
});
