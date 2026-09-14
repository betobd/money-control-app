import assert from 'node:assert/strict';
import test from 'node:test';

import { suggestBaseCurrency } from '../src/features/onboarding/device-currency.ts';
import { SettingsService, isSettingsError } from '../src/features/settings/settings.service.ts';

const NOW = '2026-09-14T12:00:00.000Z';

class MemorySettingsRepository {
  constructor({ base = 'USD', onboardingCompletedAt = null, transactions = 0, budgets = 0 } = {}) {
    this.row = { id: 'device', baseCurrencyCode: base, onboardingCompletedAt, createdAt: NOW, updatedAt: NOW };
    this.counts = { transactions, budgets };
  }

  async find() {
    return { ...this.row };
  }

  async setBaseCurrency(code, timestamp) {
    this.row.baseCurrencyCode = code;
    this.row.updatedAt = timestamp;
  }

  async completeOnboarding(timestamp) {
    this.row.onboardingCompletedAt ??= timestamp;
    this.row.updatedAt = timestamp;
  }

  async countBaseCurrencyDependents() {
    return { ...this.counts };
  }
}

/** Records what the service primes, standing in for the global caches. */
function setup(options) {
  const repository = new MemorySettingsRepository(options);
  const caches = { base: undefined, onboarding: undefined };
  const service = new SettingsService(repository, {
    now: () => NOW,
    primeBaseCurrency: (code) => { caches.base = code; },
    primeOnboardingStatus: (completed) => { caches.onboarding = completed; },
  });
  return { caches, repository, service };
}

test('suggests the currency of the first device locale that has a supported one', () => {
  assert.equal(suggestBaseCurrency([{ currencyCode: 'COP' }, { currencyCode: 'USD' }]), 'COP');
  assert.equal(suggestBaseCurrency([{ currencyCode: null }, { currencyCode: 'eur' }]), 'EUR');
  assert.equal(suggestBaseCurrency([{ currencyCode: 'XYZ' }, { currencyCode: 'BRL' }]), 'BRL');
});

test('falls back to USD when no locale names a supported currency', () => {
  assert.equal(suggestBaseCurrency([]), 'USD');
  assert.equal(suggestBaseCurrency([{ currencyCode: null }, { currencyCode: 'XYZ' }]), 'USD');
});

test('load primes the base currency and the onboarding status', async () => {
  const { caches, service } = setup({ base: 'COP', onboardingCompletedAt: null });
  await service.load();
  assert.equal(caches.base, 'COP');
  assert.equal(caches.onboarding, false);

  const completed = setup({ onboardingCompletedAt: NOW });
  await completed.service.load();
  assert.equal(completed.caches.onboarding, true);
});

test('completing onboarding saves the chosen currency and marks the flow done', async () => {
  const { caches, repository, service } = setup();
  await service.load();

  await service.completeOnboarding('COP');

  assert.equal(repository.row.baseCurrencyCode, 'COP');
  assert.equal(repository.row.onboardingCompletedAt, NOW);
  assert.equal(caches.base, 'COP');
  assert.equal(caches.onboarding, true);
});

test('completing onboarding rejects an unsupported currency and stays incomplete', async () => {
  const { caches, repository, service } = setup();
  await service.load();
  await assert.rejects(service.completeOnboarding('XYZ'), (error) => isSettingsError(error) && error.code === 'unsupported_currency');
  assert.equal(repository.row.onboardingCompletedAt, null);
  assert.equal(caches.onboarding, false);
});

test('a locked base currency fails the step instead of finishing with the wrong currency', async () => {
  const { caches, repository, service } = setup({ base: 'EUR', transactions: 3 });
  await service.load();
  await assert.rejects(service.completeOnboarding('COP'), (error) => isSettingsError(error) && error.code === 'base_currency_locked');
  assert.equal(repository.row.baseCurrencyCode, 'EUR');
  assert.equal(repository.row.onboardingCompletedAt, null);

  // Confirming the currency it is already locked to is allowed.
  await service.completeOnboarding('EUR');
  assert.equal(caches.onboarding, true);
});

test('the onboarding cache refuses reads before it is loaded and notifies on change', async () => {
  const status = await import('../src/features/settings/onboarding-status.ts');
  status.resetOnboardingStatusCache();
  assert.throws(() => status.isOnboardingCompleted());
  let notified = 0;
  const unsubscribe = status.subscribeToOnboardingStatus(() => { notified += 1; });
  status.primeOnboardingStatus(false);
  status.primeOnboardingStatus(false);
  status.primeOnboardingStatus(true);
  unsubscribe();
  status.primeOnboardingStatus(false);
  assert.equal(notified, 2);
  assert.equal(status.isOnboardingCompleted(), false);
});
