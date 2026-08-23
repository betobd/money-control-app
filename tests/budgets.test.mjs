import assert from 'node:assert/strict';
import test from 'node:test';

import {
  BudgetActionError,
  BudgetService,
  BudgetValidationError,
  calculateBudget,
  calculateBudgetSummary,
  groupBudgets,
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
  async materialize(value) {
    if (this.records.some((record) => record.categoryId === value.categoryId && record.month === value.month)) return;
    this.records.push({ ...value });
  }
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
  async listAll() {
    return this.records.map((record) => ({ ...this.record(record), spent: this.spending.get(record.id) ?? 0 }));
  }
  async update(id, update) { Object.assign(this.records.find((record) => record.id === id), update); }
  async updateForRuleFromMonth(ruleId, month, patch) {
    for (const record of this.records) if (record.ruleId === ruleId && record.month >= month) Object.assign(record, patch);
  }
  async deleteForRuleFromMonth(ruleId, month) {
    this.records = this.records.filter((record) => !(record.ruleId === ruleId && record.month >= month));
  }
  async remove(id) { this.records = this.records.filter((record) => record.id !== id); }
}

class MemoryBudgetRuleRepository {
  rules = [];
  async create(rule) { this.rules.push({ ...rule }); }
  async findById(id) { return this.rules.find((rule) => rule.id === id) ?? null; }
  async findActiveByCategory(categoryId) { return this.rules.find((rule) => rule.categoryId === categoryId && rule.isActive) ?? null; }
  async listActiveForMonth(month) { return this.rules.filter((rule) => rule.isActive && rule.startMonth <= month); }
  async update(id, patch) { Object.assign(this.rules.find((rule) => rule.id === id), patch); }
  async deactivate(id, updatedAt) { const rule = this.rules.find((candidate) => candidate.id === id); rule.isActive = false; rule.updatedAt = updatedAt; }
}

function setup() {
  const repository = new MemoryBudgetRepository();
  const rules = new MemoryBudgetRuleRepository();
  let changed = 0;
  let id = 0;
  const service = new BudgetService(repository, new MemoryCategoryRepository(), rules, {
    createId: () => `budget-${++id}`,
    now: () => NOW,
    notifyChanged: () => { changed += 1; },
  });
  return { repository, rules, service, changed: () => changed };
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
  categoryParentId: null,
  categoryParentName: null,
  month: '2026-07',
  limitAmount: 1000,
  createdAt: NOW,
  updatedAt: NOW,
};

for (const [spent, status, percentage, width, remaining] of [
  [-200, 'on-track', -20, '0%', 1200],
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
    nestedCount: 0,
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

test('recurring budget materializes future months automatically', async () => {
  const { repository, rules, service } = setup();
  await service.create(valid, { recurring: true });
  assert.equal(rules.rules.length, 1);
  assert.equal(rules.rules[0].isActive, true);
  const august = await service.listMonth('2026-08');
  assert.equal(august.budgets.length, 1);
  assert.equal(august.budgets[0].limitAmount, 600000);
  assert.equal(august.budgets[0].isRecurring, true);
  assert.equal(repository.records.filter((record) => record.month === '2026-08').length, 1);
});

test('editing a recurring budget applies from this month onward, leaving the past intact', async () => {
  const { repository, rules, service } = setup();
  await service.create(valid, { recurring: true });
  await service.listMonth('2026-08');
  await service.listMonth('2026-09');
  const augustId = repository.records.find((record) => record.month === '2026-08').id;
  await service.update(augustId, { categoryId: 'food', month: '2026-08', limitAmount: 800000 }, { recurring: true });
  assert.equal(rules.rules[0].limitAmount, 800000);
  assert.equal(repository.records.find((record) => record.month === '2026-07').limitAmount, 600000);
  assert.equal(repository.records.find((record) => record.month === '2026-08').limitAmount, 800000);
  assert.equal(repository.records.find((record) => record.month === '2026-09').limitAmount, 800000);
  const october = await service.listMonth('2026-10');
  assert.equal(october.budgets[0].limitAmount, 800000);
});

test('turning off recurrence stops future materialization', async () => {
  const { rules, service } = setup();
  const july = await service.create(valid, { recurring: true });
  await service.update(july.id, { ...valid, limitAmount: 600000 }, { recurring: false });
  assert.equal(rules.rules[0].isActive, false);
  const august = await service.listMonth('2026-08');
  assert.equal(august.budgets.length, 0);
});

test('removing a recurring budget stops the plan and drops this and future months', async () => {
  const { repository, rules, service } = setup();
  const july = await service.create(valid, { recurring: true });
  await service.listMonth('2026-08');
  await service.remove(july.id);
  assert.equal(rules.rules[0].isActive, false);
  assert.equal(repository.records.some((record) => record.month === '2026-07'), false);
  assert.equal(repository.records.some((record) => record.month === '2026-08'), false);
});

test('rejects a second recurring budget for the same category', async () => {
  const { service } = setup();
  await service.create(valid, { recurring: true });
  const fields = await validationFields(() => service.create({ ...valid, month: '2026-09' }, { recurring: true }));
  assert.match(fields.categoryId, /already has a recurring budget/i);
});

test('supports deterministic budget month navigation', () => {
  assert.equal(shiftBudgetMonth('2026-12', 1), '2027-01');
  assert.equal(shiftBudgetMonth('2026-01', -1), '2025-12');
});

/* ------------------------------------------------- nested subcategory budgets */

function budgetFor(id, categoryId, { parentId = null, limitAmount, spent }) {
  return calculateBudget({
    ...baseRecord,
    id,
    categoryId,
    categoryName: categoryId,
    categoryParentId: parentId,
    categoryParentName: parentId,
    limitAmount,
    spent,
  });
}

test('a sub-limit inside a budgeted category is counted once, not twice', () => {
  // Hogar 500k covers its whole subtree, including the 200k of Mercado inside it.
  const hogar = budgetFor('hogar-july', 'hogar', { limitAmount: 500_000, spent: 300_000 });
  const mercado = budgetFor('mercado-july', 'mercado', { parentId: 'hogar', limitAmount: 200_000, spent: 120_000 });
  const summary = calculateBudgetSummary([hogar, mercado]);
  assert.equal(summary.totalBudget, 500_000);
  assert.equal(summary.totalSpent, 300_000);
  assert.equal(summary.nestedCount, 1);
  // Each budget keeps its own numbers; only the totals collapse.
  assert.equal(mercado.limitAmount, 200_000);
  assert.equal(mercado.spent, 120_000);
});

test('a subcategory budget with no parent budget is a budget in its own right', () => {
  const mercado = budgetFor('mercado-july', 'mercado', { parentId: 'hogar', limitAmount: 200_000, spent: 120_000 });
  const travel = budgetFor('travel-july', 'travel', { limitAmount: 300_000, spent: 50_000 });
  const summary = calculateBudgetSummary([mercado, travel]);
  assert.equal(summary.totalBudget, 500_000);
  assert.equal(summary.totalSpent, 170_000);
  assert.equal(summary.nestedCount, 0);
});

test('nesting does not distort the overall percentage', () => {
  const hogar = budgetFor('hogar-july', 'hogar', { limitAmount: 400_000, spent: 200_000 });
  const mercado = budgetFor('mercado-july', 'mercado', { parentId: 'hogar', limitAmount: 100_000, spent: 100_000 });
  const summary = calculateBudgetSummary([hogar, mercado]);
  // 200k of 400k, not 300k of 500k: Mercado's spending is already inside Hogar's.
  assert.equal(summary.percentageUsed, 50);
});

test('grouping nests sub-limits under their category and leaves the rest at top level', () => {
  const hogar = budgetFor('hogar-july', 'hogar', { limitAmount: 500_000, spent: 300_000 });
  const mercado = budgetFor('mercado-july', 'mercado', { parentId: 'hogar', limitAmount: 200_000, spent: 120_000 });
  const servicios = budgetFor('servicios-july', 'servicios', { parentId: 'hogar', limitAmount: 100_000, spent: 40_000 });
  const taxi = budgetFor('taxi-july', 'taxi', { parentId: 'transporte', limitAmount: 80_000, spent: 10_000 });

  const groups = groupBudgets([hogar, mercado, servicios, taxi]);
  assert.deepEqual(groups.map((group) => group.budget.id), ['hogar-july', 'taxi-july']);
  assert.deepEqual(groups[0].children.map((child) => child.id), ['mercado-july', 'servicios-july']);
  // Transporte has no budget, so Taxi is not nested anywhere.
  assert.deepEqual(groups[1].children, []);
});

test('grouping and the summary agree on what is nested', () => {
  const hogar = budgetFor('hogar-july', 'hogar', { limitAmount: 500_000, spent: 300_000 });
  const mercado = budgetFor('mercado-july', 'mercado', { parentId: 'hogar', limitAmount: 200_000, spent: 120_000 });
  const taxi = budgetFor('taxi-july', 'taxi', { parentId: 'transporte', limitAmount: 80_000, spent: 10_000 });
  const all = [hogar, mercado, taxi];
  const groups = groupBudgets(all);
  const nested = groups.reduce((count, group) => count + group.children.length, 0);
  assert.equal(nested, calculateBudgetSummary(all).nestedCount);
  // Every budget appears exactly once in the grouping.
  const shown = groups.flatMap((group) => [group.budget.id, ...group.children.map((child) => child.id)]);
  assert.equal(shown.length, all.length);
  assert.deepEqual(new Set(shown), new Set(all.map((budget) => budget.id)));
});
