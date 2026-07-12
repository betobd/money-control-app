import assert from 'node:assert/strict';
import test from 'node:test';
import { CategoryActionError, CategoryService, CategoryValidationError } from '../src/features/categories/category.service.ts';
import { categoryIconKeys, fallbackCategoryIcon, getCategoryIcon, isCategoryIcon, searchCategoryIcons } from '../src/features/categories/category-icons.ts';

const NOW = '2026-07-12T12:00:00.000Z';
class MemoryRepository {
  categories = []; references = new Set();
  async seedIfEmpty(values) { if (this.categories.length) return false; this.categories.push(...values.map((value) => ({ ...value }))); return true; }
  async list(type, includeArchived) { return this.categories.filter((item) => item.type === type && (includeArchived || !item.isArchived)); }
  async findById(id) { return this.categories.find((item) => item.id === id) ?? null; }
  async findActiveByNormalizedName(type, name, excludingId) { return this.categories.find((item) => item.type === type && !item.isArchived && item.id !== excludingId && item.name.trim().toLocaleLowerCase('es-CO') === name) ?? null; }
  async hasFinancialReferences(id) { return this.references.has(id); }
  async create(value) { this.categories.push({ ...value }); }
  async update(id, value) { Object.assign(this.categories.find((item) => item.id === id), value); }
  async archive(id, timestamp) { Object.assign(this.categories.find((item) => item.id === id), { isArchived: true, archivedAt: timestamp, updatedAt: timestamp }); }
  async restore(id, timestamp) { Object.assign(this.categories.find((item) => item.id === id), { isArchived: false, archivedAt: null, updatedAt: timestamp }); }
  async permanentlyDelete(id) { this.categories = this.categories.filter((item) => item.id !== id); }
}
function setup() { const repository = new MemoryRepository(); let id = 0; return { repository, service: new CategoryService(repository, () => `category-${++id}`, () => NOW) }; }
const expense = { name: 'Food', type: 'expense', icon: 'food' };

test('seeds all default categories once and is idempotent', async () => { const { repository, service } = setup(); assert.equal(await service.seedDefaults(), true); assert.equal(repository.categories.length, 13); assert.equal(await service.seedDefaults(), false); assert.equal(repository.categories.length, 13); assert.equal(repository.categories.filter((item) => item.type === 'expense').length, 8); assert.equal(repository.categories.filter((item) => item.type === 'income').length, 5); });
test('does not recreate a renamed or archived default set', async () => { const { repository, service } = setup(); await service.seedDefaults(); repository.categories[0].name = 'Meals'; repository.categories[1].isArchived = true; await service.seedDefaults(); assert.equal(repository.categories.length, 13); assert.equal(repository.categories[0].name, 'Meals'); assert.equal(repository.categories[1].isArchived, true); });
test('creates expense and income categories and trims names', async () => { const { service } = setup(); const one = await service.create({ ...expense, name: '  Food  ' }); const two = await service.create({ name: 'Salary', type: 'income', icon: 'salary' }); assert.equal(one.name, 'Food'); assert.equal(two.type, 'income'); });
test('allows the same normalized name across different types', async () => { const { service } = setup(); await service.create(expense); await service.create({ ...expense, type: 'income' }); });
test('rejects duplicate active names within one type', async () => { const { service } = setup(); await service.create(expense); await assert.rejects(() => service.create({ ...expense, name: ' food ' }), CategoryValidationError); });
test('archives and restores a category', async () => { const { service } = setup(); const category = await service.create(expense); await service.archive(category.id); assert.equal((await service.get(category.id)).isArchived, true); await service.restore(category.id); assert.equal((await service.get(category.id)).isArchived, false); });
test('blocks restore conflicts and allows rename then restore', async () => { const { service } = setup(); const old = await service.create(expense); await service.archive(old.id); await service.create({ ...expense, name: 'FOOD' }); await assert.rejects(() => service.restore(old.id), (error) => error instanceof CategoryActionError && error.code === 'restore_conflict'); await service.update(old.id, { ...expense, name: 'Dining' }); await service.restore(old.id); assert.equal((await service.get(old.id)).name, 'Dining'); });
test('permanently deletes an unused category', async () => { const { service } = setup(); const category = await service.create(expense); await service.permanentlyDelete(category.id); assert.equal(await service.get(category.id), null); });
test('blocks deletion and type changes after historical use', async () => { const { repository, service } = setup(); const category = await service.create(expense); repository.references.add(category.id); await assert.rejects(() => service.permanentlyDelete(category.id), (error) => error instanceof CategoryActionError && error.code === 'has_history'); await assert.rejects(() => service.update(category.id, { ...expense, type: 'income' }), CategoryValidationError); });
test('allows type changes before historical use', async () => { const { service } = setup(); const category = await service.create(expense); await service.update(category.id, { ...expense, type: 'income' }); assert.equal((await service.get(category.id)).type, 'income'); });
test('excludes archived categories from new-transaction selection but preserves historical lookup', async () => { const { service } = setup(); const category = await service.create(expense); await service.archive(category.id); assert.equal((await service.listSelectable('expense')).length, 0); assert.equal((await service.get(category.id)).id, category.id); });
test('filters Add Transaction choices by expense and income type', async () => { const { service } = setup(); await service.create(expense); await service.create({ name: 'Salary', type: 'income', icon: 'salary' }); assert.deepEqual((await service.listSelectable('expense')).map((item) => item.name), ['Food']); assert.deepEqual((await service.listSelectable('income')).map((item) => item.name), ['Salary']); });
test('keeps legacy icon identifiers and a stable unknown-icon fallback', () => { for (const id of ['food', 'bills', 'transport', 'shopping', 'entertainment', 'health', 'education', 'salary', 'freelance', 'gift', 'refund', 'other']) assert.equal(isCategoryIcon(id), true); assert.equal(fallbackCategoryIcon, 'other'); assert.deepEqual(getCategoryIcon('unknown-saved-value'), getCategoryIcon('other')); });
test('offers a curated searchable icon catalog', () => { assert.ok(categoryIconKeys.length >= 30 && categoryIconKeys.length <= 50); assert.ok(searchCategoryIcons('coffee').includes('coffee')); assert.ok(searchCategoryIcons('pets').includes('pets')); assert.ok(searchCategoryIcons('airline').includes('flight')); });
