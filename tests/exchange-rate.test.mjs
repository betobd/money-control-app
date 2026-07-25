import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ExchangeRateProviderError,
  FrankfurterExchangeRateProvider,
  mapFrankfurterResponse,
} from '../src/features/exchange-rates/frankfurter.provider.ts';
import {
  ExchangeRateService,
  ExchangeRateServiceError,
  RATE_FRESHNESS_MS,
} from '../src/features/exchange-rates/exchange-rate.service.ts';

// ---- Provider ----

function jsonResponse(body, ok = true, status = 200) {
  return { ok, status, json: async () => body };
}

test('provider: maps a valid USD/COP response to a scaled integer', async () => {
  const calls = [];
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async (url, init) => {
    calls.push({ url, init });
    return jsonResponse({ date: '2026-07-24', base: 'USD', quote: 'COP', rate: 4102.3456 });
  });
  const result = await provider.fetchUsdCopRate();
  assert.deepEqual(result, {
    baseCurrencyCode: 'USD',
    quoteCurrencyCode: 'COP',
    rateScaled: 41023456,
    rateScale: 10000,
    effectiveDate: '2026-07-24',
    provider: 'frankfurter',
  });
  // Correct URL and no financial data in the request.
  assert.equal(calls[0].url, 'https://api.frankfurter.dev/v2/rate/USD/COP');
  assert.equal(calls[0].init.body, undefined);
});

test('provider: rejects wrong base/quote, bad rate, bad date, malformed JSON', () => {
  assert.throws(() => mapFrankfurterResponse({ date: '2026-07-24', base: 'EUR', quote: 'COP', rate: 4100 }), ExchangeRateProviderError);
  assert.throws(() => mapFrankfurterResponse({ date: '2026-07-24', base: 'USD', quote: 'EUR', rate: 4100 }), ExchangeRateProviderError);
  assert.throws(() => mapFrankfurterResponse({ date: '2026-07-24', base: 'USD', quote: 'COP' }), ExchangeRateProviderError);
  assert.throws(() => mapFrankfurterResponse({ date: '2026-07-24', base: 'USD', quote: 'COP', rate: 0 }), ExchangeRateProviderError);
  assert.throws(() => mapFrankfurterResponse({ date: '2026-07-24', base: 'USD', quote: 'COP', rate: -5 }), ExchangeRateProviderError);
  assert.throws(() => mapFrankfurterResponse({ date: 'nope', base: 'USD', quote: 'COP', rate: 4100 }), ExchangeRateProviderError);
  assert.throws(() => mapFrankfurterResponse(null), ExchangeRateProviderError);
});

test('provider: HTTP failure maps to http error', async () => {
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async () => jsonResponse({}, false, 500));
  await assert.rejects(() => provider.fetchUsdCopRate(), (e) => e instanceof ExchangeRateProviderError && e.code === 'http');
});

test('provider: invalid JSON maps to invalid_response', async () => {
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new Error('bad json'); },
  }));
  await assert.rejects(() => provider.fetchUsdCopRate(), (e) => e instanceof ExchangeRateProviderError && e.code === 'invalid_response');
});

test('provider: network failure maps to network error', async () => {
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async () => { throw new Error('offline'); });
  await assert.rejects(() => provider.fetchUsdCopRate(), (e) => e instanceof ExchangeRateProviderError && e.code === 'network');
});

test('provider: timeout aborts and maps to timeout error', async () => {
  const provider = new FrankfurterExchangeRateProvider(
    'https://api.frankfurter.dev',
    (url, init) => new Promise((_, reject) => {
      init.signal.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    }),
    5,
  );
  await assert.rejects(() => provider.fetchUsdCopRate(), (e) => e instanceof ExchangeRateProviderError && e.code === 'timeout');
});

// ---- Service ----

class MemoryExchangeRateRepository {
  rate = null;
  saves = 0;
  async getValuationRate() { return this.rate ? { ...this.rate } : null; }
  async saveValuationRate(record) { this.rate = { ...record }; this.saves += 1; }
}

class StubProvider {
  constructor(result) { this.result = result; this.calls = 0; }
  async fetchUsdCopRate() {
    this.calls += 1;
    if (this.result instanceof Error) throw this.result;
    return this.result;
  }
}

const FETCHED = {
  baseCurrencyCode: 'USD', quoteCurrencyCode: 'COP', rateScaled: 41000000, rateScale: 10000,
  effectiveDate: '2026-07-24', provider: 'frankfurter',
};

function clock(startIso) {
  let current = Date.parse(startIso);
  return { now: () => new Date(current).toISOString(), advance: (ms) => { current += ms; } };
}

function makeService(repo, provider, now) {
  return new ExchangeRateService(repo, provider, { now, today: () => '2026-07-24' });
}

test('service: fresh cached rate does not trigger a refresh', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  repo.rate = { id: 'USD-COP', ...FETCHED, fetchedAt: '2026-07-24T11:00:00.000Z', source: 'frankfurter', createdAt: c.now(), updatedAt: c.now() };
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);
  const status = await service.getStatus();
  assert.equal(status.freshness, 'fresh');
  await service.ensureFreshRate();
  assert.equal(provider.calls, 0);
});

test('service: stale cached rate triggers exactly one refresh that persists', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  repo.rate = { id: 'USD-COP', ...FETCHED, rateScaled: 40000000, fetchedAt: '2026-07-24T11:00:00.000Z', source: 'frankfurter', createdAt: '2026-07-24T11:00:00.000Z', updatedAt: '2026-07-24T11:00:00.000Z' };
  assert.equal((await makeService(repo, new StubProvider(FETCHED), c.now).getStatus()).freshness, 'stale');
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);
  await service.ensureFreshRate();
  assert.equal(provider.calls, 1);
  assert.equal(repo.rate.rateScaled, 41000000);
  assert.equal((await service.getStatus()).freshness, 'fresh');
});

test('service: failed refresh keeps the last valid cached rate', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const cached = { id: 'USD-COP', ...FETCHED, fetchedAt: '2026-07-24T11:00:00.000Z', source: 'frankfurter', createdAt: '2026-07-24T11:00:00.000Z', updatedAt: '2026-07-24T11:00:00.000Z' };
  repo.rate = { ...cached };
  const provider = new StubProvider(new ExchangeRateProviderError('network', 'offline'));
  const service = makeService(repo, provider, c.now);
  await assert.rejects(() => service.refreshFromProvider(), (e) => e instanceof ExchangeRateServiceError && e.code === 'refresh_failed');
  assert.deepEqual(repo.rate, cached); // unchanged
});

test('service: failed refresh with no cache reports no_rate_available', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = new StubProvider(new ExchangeRateProviderError('network', 'offline'));
  const service = makeService(repo, provider, c.now);
  await assert.rejects(() => service.refreshFromProvider(), (e) => e instanceof ExchangeRateServiceError && e.code === 'no_rate_available');
  assert.equal(repo.rate, null);
});

test('service: concurrent refreshes are de-duplicated', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);
  await Promise.all([service.refreshFromProvider(), service.refreshFromProvider(), service.refreshFromProvider()]);
  assert.equal(provider.calls, 1);
});

test('service: failed auto-refresh sets a cool-down that prevents a storm', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = new StubProvider(new ExchangeRateProviderError('network', 'offline'));
  const service = makeService(repo, provider, c.now);
  await service.ensureFreshRate(); // attempt 1 (no cache, stale/none)
  await service.ensureFreshRate(); // within cool-down, should not call again
  assert.equal(provider.calls, 1);
});

test('service: manual rate persists and becomes current', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  const service = makeService(repo, new StubProvider(FETCHED), c.now);
  const status = await service.setManualRate('4150.25');
  assert.equal(status.rate.source, 'manual');
  assert.equal(status.rate.rateScaled, 41502500);
  assert.equal(status.rate.effectiveDate, '2026-07-24');
  assert.equal(repo.rate.source, 'manual');
});

test('service: invalid manual rate is rejected without touching the cache', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  repo.rate = { id: 'USD-COP', ...FETCHED, fetchedAt: c.now(), source: 'frankfurter', createdAt: c.now(), updatedAt: c.now() };
  const service = makeService(repo, new StubProvider(FETCHED), c.now);
  await assert.rejects(() => service.setManualRate('0'), (e) => e instanceof ExchangeRateServiceError && e.code === 'invalid_manual_rate');
  await assert.rejects(() => service.setManualRate('-3'), ExchangeRateServiceError);
  assert.equal(repo.rate.source, 'frankfurter'); // untouched
});

test('service: freshness boundary at exactly 24h is still fresh', async () => {
  const repo = new MemoryExchangeRateRepository();
  const start = '2026-07-24T12:00:00.000Z';
  const c = clock(new Date(Date.parse(start) + RATE_FRESHNESS_MS).toISOString());
  repo.rate = { id: 'USD-COP', ...FETCHED, fetchedAt: start, source: 'frankfurter', createdAt: start, updatedAt: start };
  const service = makeService(repo, new StubProvider(FETCHED), c.now);
  assert.equal((await service.getStatus()).freshness, 'fresh');
});
