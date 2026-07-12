import assert from 'node:assert/strict';
import test from 'node:test';

import { AccountActionError, AccountService, AccountValidationError } from '../src/features/accounts/account.service.ts';

const NOW = '2026-07-12T12:00:00.000Z';
const validInput = { name: 'Main Checking', type: 'checking', openingBalance: 100000, creditLimit: null };

class MemoryAccountRepository {
  accounts = [];
  postedActivity = new Set();
  voidedActivity = new Set();
  balanceOverrides = new Map();

  async create(account) { this.accounts.push({ ...account }); }
  async findById(id) { return this.accounts.find((account) => account.id === id) ?? null; }
  async findActiveByNormalizedName(name, excludingId) {
    return this.accounts.find((account) => !account.isArchived && account.id !== excludingId && account.name.trim().toLocaleLowerCase('es-CO') === name) ?? null;
  }
  async hasPostedTransactions(id) { return this.postedActivity.has(id); }
  async getDeletionEligibility(id) {
    const account = this.accounts.find((candidate) => candidate.id === id);
    return {
      account: account ? { ...account, balance: this.balanceOverrides.get(id) ?? account.openingBalance } : null,
      hasFinancialReferences: this.postedActivity.has(id) || this.voidedActivity.has(id),
    };
  }
  async update(id, update) { Object.assign(this.accounts.find((account) => account.id === id), update); }
  async archive(id, archivedAt) { Object.assign(this.accounts.find((account) => account.id === id), { isArchived: true, archivedAt, updatedAt: archivedAt }); }
  async restore(id, restoredAt) { Object.assign(this.accounts.find((account) => account.id === id), { isArchived: false, archivedAt: null, updatedAt: restoredAt }); }
  async permanentlyDelete(id) { this.accounts = this.accounts.filter((account) => account.id !== id); }
  async list(includeArchived) {
    return this.accounts.filter((account) => includeArchived || !account.isArchived).map((account) => ({ ...account, balance: account.openingBalance }));
  }
}

function setup() {
  const repository = new MemoryAccountRepository();
  let id = 0;
  const service = new AccountService(repository, { createId: () => `id-${++id}`, now: () => NOW });
  return { repository, service };
}

async function validationFields(action) {
  await assert.rejects(action, (error) => {
    assert.ok(error instanceof AccountValidationError);
    return true;
  });
  try { await action(); } catch (error) { return error.fields; }
  throw new Error('Expected validation failure.');
}

test('creates a valid account and trims its name', async () => {
  const { service } = setup();
  const account = await service.create({ ...validInput, name: '  Main Checking  ' });
  assert.equal(account.name, 'Main Checking');
  assert.equal(account.currency, 'COP');
  assert.equal(account.openingBalance, 100000);
});

test('rejects duplicate active names case-insensitively', async () => {
  const { service } = setup();
  await service.create(validInput);
  const fields = await validationFields(() => service.create({ ...validInput, name: ' main checking ' }));
  assert.match(fields.name, /active account/i);
});

test('allows a historical duplicate after archival', async () => {
  const { service } = setup();
  const original = await service.create(validInput);
  await service.archive(original.id);
  const replacement = await service.create({ ...validInput, name: 'MAIN CHECKING' });
  assert.equal(replacement.name, 'MAIN CHECKING');
});

test('rejects unsafe integer monetary values', async () => {
  const { service } = setup();
  const fields = await validationFields(() => service.create({ ...validInput, openingBalance: Number.MAX_SAFE_INTEGER + 1 }));
  assert.match(fields.openingBalance, /safe/i);
});

test('validates credit-card limits and clears limits for other account types', async () => {
  const { service } = setup();
  const fields = await validationFields(() => service.create({ ...validInput, type: 'credit_card', creditLimit: -1 }));
  assert.match(fields.creditLimit, /non-negative/i);
  const checking = await service.create({ ...validInput, creditLimit: null });
  assert.equal(checking.creditLimit, null);
  const credit = await service.create({ ...validInput, name: 'Visa', type: 'credit_card', creditLimit: null });
  assert.equal(credit.creditLimit, null);
});

test('edits opening balance before posted activity', async () => {
  const { service } = setup();
  const account = await service.create(validInput);
  await service.update(account.id, { ...validInput, openingBalance: 250000 });
  assert.equal((await service.get(account.id)).openingBalance, 250000);
});

test('prevents opening-balance changes after posted activity', async () => {
  const { repository, service } = setup();
  const account = await service.create(validInput);
  repository.postedActivity.add(account.id);
  const fields = await validationFields(() => service.update(account.id, { ...validInput, openingBalance: 250000 }));
  assert.match(fields.openingBalance, /posted account activity/i);
});

test('archives instead of deleting and exposes archived accounts only when requested', async () => {
  const { service } = setup();
  const account = await service.create(validInput);
  await service.archive(account.id);
  assert.equal((await service.get(account.id)).isArchived, true);
  assert.equal((await service.list(false)).length, 0);
  assert.equal((await service.list(true)).length, 1);
});

test('restores an archived account while preserving its ID, history, and balance', async () => {
  const { repository, service } = setup();
  const account = await service.create(validInput);
  repository.postedActivity.add(account.id);
  repository.balanceOverrides.set(account.id, 175000);
  await service.archive(account.id);

  await service.restore(account.id);

  const restored = await service.get(account.id);
  assert.equal(restored.id, account.id);
  assert.equal(restored.isArchived, false);
  assert.equal(restored.archivedAt, null);
  assert.equal(repository.postedActivity.has(account.id), true);
  assert.equal((await repository.getDeletionEligibility(account.id)).account.balance, 175000);
  assert.equal((await service.list(false)).some((candidate) => candidate.id === account.id), true);
});

test('rejects restoration when an active account has the same normalized name', async () => {
  const { service } = setup();
  const archived = await service.create(validInput);
  await service.archive(archived.id);
  await service.create({ ...validInput, name: ' main checking ' });

  await assert.rejects(
    () => service.restore(archived.id),
    (error) => error instanceof AccountActionError && error.code === 'restore_name_conflict' && /rename/i.test(error.message),
  );
});

test('allows renaming an archived account and then restoring it', async () => {
  const { service } = setup();
  const archived = await service.create(validInput);
  await service.archive(archived.id);
  await service.create({ ...validInput, name: 'MAIN CHECKING' });
  await service.update(archived.id, { ...validInput, name: 'Restored Checking' });
  await service.restore(archived.id);
  assert.equal((await service.get(archived.id)).name, 'Restored Checking');
  assert.equal((await service.get(archived.id)).isArchived, false);
});

test('rejects restoration of an already-active account', async () => {
  const { service } = setup();
  const account = await service.create(validInput);
  await assert.rejects(
    () => service.restore(account.id),
    (error) => error instanceof AccountActionError && error.code === 'account_not_archived',
  );
});

test('permanently deletes an unused zero-balance account', async () => {
  const { service } = setup();
  const account = await service.create({ ...validInput, openingBalance: 0 });
  assert.equal(await service.canPermanentlyDelete(account.id), true);
  await service.permanentlyDelete(account.id);
  assert.equal(await service.get(account.id), null);
});

test('rejects permanent deletion when opening balance is non-zero', async () => {
  const { service } = setup();
  const account = await service.create(validInput);
  await assert.rejects(
    () => service.permanentlyDelete(account.id),
    (error) => error instanceof AccountActionError && error.code === 'deletion_non_zero_balance',
  );
});

test('rejects permanent deletion when derived balance is non-zero', async () => {
  const { repository, service } = setup();
  const account = await service.create({ ...validInput, openingBalance: 0 });
  repository.balanceOverrides.set(account.id, 50000);
  await assert.rejects(
    () => service.permanentlyDelete(account.id),
    (error) => error instanceof AccountActionError && error.code === 'deletion_non_zero_balance',
  );
});

for (const status of ['posted', 'voided']) {
  test(`rejects permanent deletion when ${status} transactions exist`, async () => {
    const { repository, service } = setup();
    const account = await service.create({ ...validInput, openingBalance: 0 });
    repository[`${status}Activity`].add(account.id);
    await assert.rejects(
      () => service.permanentlyDelete(account.id),
      (error) => error instanceof AccountActionError && error.code === 'deletion_has_activity',
    );
    assert.notEqual(await service.get(account.id), null);
  });
}

test('sums signed balances for assets, debt, and archived accounts', async () => {
  const { service } = setup();
  const accounts = [
    { balance: 600000, isArchived: false, type: 'checking' },
    { balance: -1000000, isArchived: false, type: 'credit_card' },
    { balance: 1500000, isArchived: true, type: 'savings' },
  ];
  assert.equal(service.calculateNetWorth(accounts), 1100000);
});

test('calculates reported post-expense balances and net worth', () => {
  const { service } = setup();
  const accounts = [
    { balance: 9850000, isArchived: false, type: 'checking' },
    { balance: 5000000, isArchived: false, type: 'checking' },
  ];
  assert.equal(service.calculateNetWorth(accounts), 14850000);
});

test('a credit card with zero debt has no net-worth effect', () => {
  const { service } = setup();
  assert.equal(service.calculateNetWorth([{ balance: 0, isArchived: false, type: 'credit_card' }]), 0);
});

test('multiple credit-card debts are each subtracted once', () => {
  const { service } = setup();
  const accounts = [
    { balance: 2500000, isArchived: false, type: 'checking' },
    { balance: -400000, isArchived: false, type: 'credit_card' },
    { balance: -600000, isArchived: false, type: 'credit_card' },
  ];
  assert.equal(service.calculateNetWorth(accounts), 1500000);
});

test('an archived credit card with debt still reduces net worth', () => {
  const { service } = setup();
  const accounts = [
    { balance: 1000000, isArchived: false, type: 'savings' },
    { balance: -300000, isArchived: true, type: 'credit_card' },
  ];
  assert.equal(service.calculateNetWorth(accounts), 700000);
});

test('stores credit-card opening debt as negative without double-negating it', async () => {
  const { service } = setup();
  const positiveMagnitude = await service.create({
    ...validInput,
    name: 'Visa',
    type: 'credit_card',
    openingBalance: 1000000,
  });
  const alreadySigned = await service.create({
    ...validInput,
    name: 'Mastercard',
    type: 'credit_card',
    openingBalance: -500000,
  });
  assert.equal(positiveMagnitude.openingBalance, -1000000);
  assert.equal(alreadySigned.openingBalance, -500000);
});
