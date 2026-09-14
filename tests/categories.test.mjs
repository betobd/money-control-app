import assert from 'node:assert/strict';
import test from 'node:test';
import { CategoryActionError, CategoryService, CategoryValidationError } from '../src/features/categories/category.service.ts';
import { categoryIconKeys, fallbackCategoryIcon, getCategoryIcon, isCategoryIcon, searchCategoryIcons } from '../src/features/categories/category-icons.ts';

const NOW = '2026-07-12T12:00:00.000Z';
class MemoryRepository {
  categories = []; references = new Set();
  async seedIfEmpty(values) { if (this.categories.length) return false; this.categories.push(...values.map((value) => ({ ...value }))); return true; }
  async list(type, includeArchived) { return this.categories.filter((item) => item.type === type && (includeArchived || !item.isArchived)); }
  async listSubcategories(parentCategoryId, includeArchived) { return this.categories.filter((item) => item.parentCategoryId === parentCategoryId && (includeArchived || !item.isArchived)); }
  async hasSubcategories(id) { return this.categories.some((item) => item.parentCategoryId === id); }
  async findById(id) { return this.categories.find((item) => item.id === id) ?? null; }
  async findActiveByNormalizedName(type, parentCategoryId, name, excludingId) { return this.categories.find((item) => item.type === type && (item.parentCategoryId ?? null) === parentCategoryId && !item.isArchived && item.id !== excludingId && item.name.trim().toLocaleLowerCase('es-CO') === name) ?? null; }
  async hasFinancialReferences(id) { return this.references.has(id); }
  async create(value) { this.categories.push({ ...value }); }
  async update(id, value) { Object.assign(this.categories.find((item) => item.id === id), value); }
  async archiveWithSubcategories(id, timestamp) {
    const archived = { isArchived: true, archivedAt: timestamp, updatedAt: timestamp };
    for (const item of this.categories) if (item.id === id || item.parentCategoryId === id) Object.assign(item, archived);
  }
  async restore(id, timestamp) { Object.assign(this.categories.find((item) => item.id === id), { isArchived: false, archivedAt: null, updatedAt: timestamp }); }
  async permanentlyDelete(id) { this.categories = this.categories.filter((item) => item.id !== id); }
}
function setup() { const repository = new MemoryRepository(); let id = 0; return { repository, service: new CategoryService(repository, () => `category-${++id}`, () => NOW) }; }
const expense = { name: 'Food', type: 'expense', icon: 'food' };

test('seeds all default categories once and is idempotent', async () => { const { repository, service } = setup(); assert.equal(await service.seedDefaults(), true); assert.equal(repository.categories.length, 14); assert.equal(await service.seedDefaults(), false); assert.equal(repository.categories.length, 14); assert.equal(repository.categories.filter((item) => item.type === 'expense').length, 8); assert.equal(repository.categories.filter((item) => item.type === 'income').length, 6); });
test('does not recreate a renamed or archived default set', async () => { const { repository, service } = setup(); await service.seedDefaults(); repository.categories[0].name = 'Meals'; repository.categories[1].isArchived = true; await service.seedDefaults(); assert.equal(repository.categories.length, 14); assert.equal(repository.categories[0].name, 'Meals'); assert.equal(repository.categories[1].isArchived, true); });
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
test('offers a curated searchable icon catalog', () => { assert.ok(categoryIconKeys.length >= 200 && categoryIconKeys.length <= 400); assert.ok(searchCategoryIcons('coffee').includes('coffee')); assert.ok(searchCategoryIcons('pets').includes('pets')); assert.ok(searchCategoryIcons('airline').includes('flight')); assert.ok(searchCategoryIcons('barber').includes('haircut')); assert.ok(searchCategoryIcons('mecato').includes('snacks')); assert.ok(searchCategoryIcons('administracion').includes('condo-fees')); });

// Icon keys are stored on `categories.icon`, so removing or renaming one turns
// every category that used it into the fallback. The catalog only ever grows.
test('keeps every previously shipped icon key', () => {
  // Every key in a build that reached a device: 48 originals plus the 68 added
  // with the first expansion. Append here whenever a build ships new keys.
  const shipped = [
    'food', 'groceries', 'restaurant', 'coffee', 'bar', 'dessert', 'food-delivery', 'bills',
    'home', 'rent', 'mortgage', 'electricity', 'water', 'gas', 'internet', 'phone', 'furniture',
    'appliances', 'maintenance', 'cleaning', 'garden', 'waste', 'home-security', 'transport',
    'bus', 'train', 'taxi', 'bike', 'ferry', 'fuel', 'ev-charging', 'parking', 'toll',
    'car-service', 'shopping', 'cart', 'clothing', 'electronics', 'online-shopping', 'mall',
    'jewelry', 'health', 'doctor', 'pharmacy', 'lab', 'dental', 'vision', 'therapy', 'fitness',
    'haircut', 'beauty', 'spa', 'laundry', 'education', 'tuition', 'books', 'courses',
    'school-supplies', 'entertainment', 'movies', 'streaming', 'subscriptions', 'tv', 'music',
    'concerts', 'theater', 'nightlife', 'hobbies', 'photography', 'news', 'sports', 'travel',
    'flight', 'hotel', 'car-rental', 'luggage', 'beach', 'camping', 'hiking', 'sightseeing',
    'bank', 'credit-card', 'savings', 'investment', 'crypto', 'dividends', 'loan', 'fees', 'taxes',
    'insurance', 'atm', 'wallet', 'exchange', 'refund', 'salary', 'freelance', 'business',
    'office', 'bonus', 'tips', 'rental-income', 'pension', 'family', 'friends', 'childcare',
    'baby', 'toys', 'pets', 'vet', 'gift', 'celebration', 'wedding', 'charity', 'tag',
    'uncategorized', 'other'
  ];
  for (const key of shipped) assert.ok(isCategoryIcon(key), `icon key ${key} was removed`);
});

/* ----------------------------------------------------------- subcategories */

const home = { name: 'Hogar', type: 'expense', icon: 'other' };

async function withTree() {
  const context = setup();
  const parent = await context.service.create(home);
  const market = await context.service.create({ name: 'Mercado', type: 'expense', icon: 'cart', parentCategoryId: parent.id });
  return { ...context, parent, market };
}

test('creates a subcategory under a parent and reports the hierarchy', async () => {
  const { service, parent, market } = await withTree();
  assert.equal(market.parentCategoryId, parent.id);
  const [tree] = await service.listTree('expense');
  assert.equal(tree.id, parent.id);
  assert.deepEqual(tree.subcategories.map((item) => item.name), ['Mercado']);
});

test('selecting a subcategory infers its parent, selecting a parent leaves none', async () => {
  const { service, parent, market } = await withTree();
  assert.deepEqual(await service.resolveSelection(market.id), { categoryId: parent.id, subcategoryId: market.id });
  assert.deepEqual(await service.resolveSelection(parent.id), { categoryId: parent.id, subcategoryId: null });
});

test('the same subcategory name is allowed under different parents', async () => {
  const { service, parent } = await withTree();
  const transport = await service.create({ name: 'Transporte', type: 'expense', icon: 'transport' });
  await service.create({ name: 'Otros', type: 'expense', icon: 'other', parentCategoryId: parent.id });
  await service.create({ name: 'Otros', type: 'expense', icon: 'other', parentCategoryId: transport.id });
  await assert.rejects(
    () => service.create({ name: ' otros ', type: 'expense', icon: 'other', parentCategoryId: parent.id }),
    CategoryValidationError,
  );
});

test('a subcategory cannot nest further, change type, or hang off an archived parent', async () => {
  const { service, parent, market } = await withTree();
  await assert.rejects(
    () => service.create({ name: 'Deeper', type: 'expense', icon: 'other', parentCategoryId: market.id }),
    CategoryValidationError,
  );
  await assert.rejects(
    () => service.create({ name: 'Wrong', type: 'income', icon: 'other', parentCategoryId: parent.id }),
    CategoryValidationError,
  );
  await service.archive(parent.id);
  await assert.rejects(
    () => service.create({ name: 'Late', type: 'expense', icon: 'other', parentCategoryId: parent.id }),
    CategoryValidationError,
  );
});

test('archiving a parent archives its subcategories', async () => {
  const { service, parent, market } = await withTree();
  assert.equal(await service.countActiveSubcategories(parent.id), 1);
  await service.archive(parent.id);
  assert.equal((await service.get(market.id)).isArchived, true);
  assert.equal((await service.listSelectable('expense')).length, 0);
});

test('restore does not cascade and needs an active parent', async () => {
  const { service, parent, market } = await withTree();
  await service.archive(parent.id);
  await assert.rejects(
    () => service.restore(market.id),
    (error) => error instanceof CategoryActionError && error.code === 'parent_archived',
  );
  await service.restore(parent.id);
  assert.equal((await service.get(market.id)).isArchived, true, 'the subcategory stays archived');
  await service.restore(market.id);
  assert.equal((await service.get(market.id)).isArchived, false);
});

test('a subcategory cannot be re-parented once it has financial history', async () => {
  const { repository, service, market } = await withTree();
  const transport = await service.create({ name: 'Transporte', type: 'expense', icon: 'transport' });
  repository.references.add(market.id);
  await assert.rejects(
    () => service.update(market.id, { name: 'Mercado', type: 'expense', icon: 'cart', parentCategoryId: transport.id }),
    CategoryValidationError,
  );
  await service.update(market.id, { name: 'Supermercado', type: 'expense', icon: 'cart', parentCategoryId: market.parentCategoryId });
  assert.equal((await service.get(market.id)).name, 'Supermercado');
});

test('a category with subcategories cannot become a subcategory', async () => {
  const { service, parent } = await withTree();
  const transport = await service.create({ name: 'Transporte', type: 'expense', icon: 'transport' });
  await assert.rejects(
    () => service.update(parent.id, { ...home, parentCategoryId: transport.id }),
    CategoryValidationError,
  );
});

test('a category with subcategories cannot be permanently deleted', async () => {
  const { service, parent, market } = await withTree();
  assert.equal(await service.canPermanentlyDelete(parent.id), false);
  await assert.rejects(
    () => service.permanentlyDelete(parent.id),
    (error) => error instanceof CategoryActionError && error.code === 'has_subcategories',
  );
  await service.permanentlyDelete(market.id);
  assert.equal(await service.canPermanentlyDelete(parent.id), true);
});

test('a subcategory used only as a subcategory still counts as referenced', async () => {
  const { repository, service, market } = await withTree();
  repository.references.add(market.id);
  assert.equal(await service.canPermanentlyDelete(market.id), false);
});

test('exposes financial history and child checks the form uses to lock the parent field', async () => {
  const { repository, service, parent, market } = await withTree();
  // A category with subcategories cannot become one, whatever its history.
  assert.equal(await service.hasSubcategories(parent.id), true);
  assert.equal(await service.hasSubcategories(market.id), false);
  assert.equal(await service.hasFinancialHistory(market.id), false);
  repository.references.add(market.id);
  assert.equal(await service.hasFinancialHistory(market.id), true);
});
