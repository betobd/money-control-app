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
import { scaleFor } from '../src/features/exchange-rates/frankfurter.provider.ts';

import { testBaseCurrency } from './support/base-currency.mjs';


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
  const result = await provider.fetchRate('USD', 'COP');
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

test('provider: rejects a response for a pair other than the one requested', () => {
  const map = (payload) => mapFrankfurterResponse(payload, 'USD', 'COP');
  // A provider answering about a different pair must never be stored as if it had
  // answered the question that was asked.
  assert.throws(() => map({ date: '2026-07-24', base: 'EUR', quote: 'COP', rate: 4100 }), ExchangeRateProviderError);
  assert.throws(() => map({ date: '2026-07-24', base: 'USD', quote: 'EUR', rate: 4100 }), ExchangeRateProviderError);
  assert.throws(() => map({ date: '2026-07-24', base: 'USD', quote: 'COP' }), ExchangeRateProviderError);
  assert.throws(() => map({ date: '2026-07-24', base: 'USD', quote: 'COP', rate: 0 }), ExchangeRateProviderError);
  assert.throws(() => map({ date: '2026-07-24', base: 'USD', quote: 'COP', rate: -5 }), ExchangeRateProviderError);
  assert.throws(() => map({ date: 'nope', base: 'USD', quote: 'COP', rate: 4100 }), ExchangeRateProviderError);
  assert.throws(() => map(null), ExchangeRateProviderError);
});

test('provider: an unsupported currency in the response is rejected', () => {
  // XAU is quoted by Frankfurter but is not a spendable currency, so it has no
  // registry entry and no minor units to convert into.
  assert.throws(
    () => mapFrankfurterResponse({ date: '2026-07-24', base: 'XAU', quote: 'COP', rate: 4100 }, 'XAU', 'COP'),
    ExchangeRateProviderError,
  );
});

test('provider: the scale adapts so a tiny rate keeps its significant digits', () => {
  // A fixed four-decimal scale would store 1 COP = 0.00024 USD as 2, losing the
  // rate almost entirely. The scale rises until the value carries real digits.
  const big = mapFrankfurterResponse({ date: '2026-07-24', base: 'USD', quote: 'COP', rate: 4102.3456 }, 'USD', 'COP');
  const tiny = mapFrankfurterResponse({ date: '2026-07-24', base: 'COP', quote: 'USD', rate: 0.00024376 }, 'COP', 'USD');
  assert.equal(big.rateScaled / big.rateScale, 4102.3456);
  assert.ok(Math.abs(tiny.rateScaled / tiny.rateScale - 0.00024376) < 1e-12, 'tiny rate must survive scaling');
  assert.ok(tiny.rateScale > big.rateScale, 'a smaller rate needs a larger scale');
  assert.ok(scaleFor(0.00024376) > scaleFor(4102.3456));
});

test('provider: HTTP failure maps to http error', async () => {
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async () => jsonResponse({}, false, 500));
  await assert.rejects(() => provider.fetchRate('USD', 'COP'), (e) => e instanceof ExchangeRateProviderError && e.code === 'http');
});

test('provider: invalid JSON maps to invalid_response', async () => {
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async () => ({
    ok: true,
    status: 200,
    json: async () => { throw new Error('bad json'); },
  }));
  await assert.rejects(() => provider.fetchRate('USD', 'COP'), (e) => e instanceof ExchangeRateProviderError && e.code === 'invalid_response');
});

test('provider: network failure maps to network error', async () => {
  const provider = new FrankfurterExchangeRateProvider('https://api.frankfurter.dev', async () => { throw new Error('offline'); });
  await assert.rejects(() => provider.fetchRate('USD', 'COP'), (e) => e instanceof ExchangeRateProviderError && e.code === 'network');
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
  await assert.rejects(() => provider.fetchRate('USD', 'COP'), (e) => e instanceof ExchangeRateProviderError && e.code === 'timeout');
});

// ---- Service ----

class MemoryExchangeRateRepository {
  rows = new Map();
  saves = 0;

  /** Mirrors the SQLite repository: either orientation of a pair answers. */
  async find(base, quote) {
    const row = this.rows.get(`${base}-${quote}`) ?? this.rows.get(`${quote}-${base}`);
    return row ? { ...row } : null;
  }

  async list() { return [...this.rows.values()].map((row) => ({ ...row })); }

  async save(record) {
    this.rows.delete(`${record.quoteCurrencyCode}-${record.baseCurrencyCode}`);
    this.rows.set(record.id, { ...record });
    this.saves += 1;
  }

  /** Convenience for the fixtures below, which think in one pair. */
  get rate() { return this.rows.get('USD-COP') ?? null; }
  set rate(value) {
    this.rows.clear();
    if (value) this.rows.set(value.id, value);
  }
}

class StubProvider {
  constructor(result) { this.result = result; this.calls = 0; this.pairs = []; }
  async fetchRate(base, quote) {
    this.calls += 1;
    this.pairs.push(`${base}/${quote}`);
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
  return new ExchangeRateService(repo, provider, {
    now,
    today: () => '2026-07-24',
    baseCurrency: testBaseCurrency,
  });
}

test('service: fresh cached rate does not trigger a refresh', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  repo.rate = { id: 'USD-COP', ...FETCHED, fetchedAt: '2026-07-24T11:00:00.000Z', source: 'frankfurter', createdAt: c.now(), updatedAt: c.now() };
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);
  const status = await service.getStatusFor('USD');
  assert.equal(status.freshness, 'fresh');
  await service.ensureFreshRates(['USD']);
  assert.equal(provider.calls, 0);
});

test('service: stale cached rate triggers exactly one refresh that persists', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  repo.rate = { id: 'USD-COP', ...FETCHED, rateScaled: 40000000, fetchedAt: '2026-07-24T11:00:00.000Z', source: 'frankfurter', createdAt: '2026-07-24T11:00:00.000Z', updatedAt: '2026-07-24T11:00:00.000Z' };
  assert.equal((await makeService(repo, new StubProvider(FETCHED), c.now).getStatusFor('USD')).freshness, 'stale');
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);
  await service.ensureFreshRates(['USD']);
  assert.equal(provider.calls, 1);
  assert.equal(repo.rate.rateScaled, 41000000);
  assert.equal((await service.getStatusFor('USD')).freshness, 'fresh');
});

test('service: failed refresh keeps the last valid cached rate', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const cached = { id: 'USD-COP', ...FETCHED, fetchedAt: '2026-07-24T11:00:00.000Z', source: 'frankfurter', createdAt: '2026-07-24T11:00:00.000Z', updatedAt: '2026-07-24T11:00:00.000Z' };
  repo.rate = { ...cached };
  const provider = new StubProvider(new ExchangeRateProviderError('network', 'offline'));
  const service = makeService(repo, provider, c.now);
  await assert.rejects(() => service.refreshFromProvider('USD'), (e) => e instanceof ExchangeRateServiceError && e.code === 'refresh_failed');
  assert.deepEqual(repo.rate, cached); // unchanged
});

test('service: failed refresh with no cache reports no_rate_available', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = new StubProvider(new ExchangeRateProviderError('network', 'offline'));
  const service = makeService(repo, provider, c.now);
  await assert.rejects(() => service.refreshFromProvider('USD'), (e) => e instanceof ExchangeRateServiceError && e.code === 'no_rate_available');
  assert.equal(repo.rate, null);
});

test('service: concurrent refreshes are de-duplicated', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);
  await Promise.all([service.refreshFromProvider('USD'), service.refreshFromProvider('USD'), service.refreshFromProvider('USD')]);
  assert.equal(provider.calls, 1);
});

test('service: failed auto-refresh sets a cool-down that prevents a storm', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = new StubProvider(new ExchangeRateProviderError('network', 'offline'));
  const service = makeService(repo, provider, c.now);
  await service.ensureFreshRates(['USD']); // attempt 1 (no cache, stale/none)
  await service.ensureFreshRates(['USD']); // within cool-down, should not call again
  assert.equal(provider.calls, 1);
});

test('service: manual rate persists and becomes current', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  const service = makeService(repo, new StubProvider(FETCHED), c.now);
  const status = await service.setManualRate('USD', '4150.25');
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
  await assert.rejects(() => service.setManualRate('USD', '0'), (e) => e instanceof ExchangeRateServiceError && e.code === 'invalid_manual_rate');
  await assert.rejects(() => service.setManualRate('USD', '-3'), ExchangeRateServiceError);
  assert.equal(repo.rate.source, 'frankfurter'); // untouched
});

test('service: freshness boundary at exactly 24h is still fresh', async () => {
  const repo = new MemoryExchangeRateRepository();
  const start = '2026-07-24T12:00:00.000Z';
  const c = clock(new Date(Date.parse(start) + RATE_FRESHNESS_MS).toISOString());
  repo.rate = { id: 'USD-COP', ...FETCHED, fetchedAt: start, source: 'frankfurter', createdAt: start, updatedAt: start };
  const service = makeService(repo, new StubProvider(FETCHED), c.now);
  assert.equal((await service.getStatusFor('USD')).freshness, 'fresh');
});

test('service: the base currency itself never needs, or gets, a rate', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  const provider = new StubProvider(FETCHED);
  const service = makeService(repo, provider, c.now);

  // Reported fresh with no rate: a missing base-currency rate is not a gap, and
  // flagging it would put a permanent warning on a complete total.
  const status = await service.getStatusFor('COP');
  assert.equal(status.rate, null);
  assert.equal(status.freshness, 'fresh');

  await service.ensureFreshRates(['COP', 'COP']);
  assert.equal(provider.calls, 0);
  await assert.rejects(() => service.setManualRate('COP', '1'), ExchangeRateServiceError);
});

test('service: several currencies refresh independently, and one failure keeps the rest', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-26T12:00:00.000Z');
  const provider = {
    calls: 0,
    async fetchRate(base, quote) {
      this.calls += 1;
      if (base === 'EUR') throw new ExchangeRateProviderError('network', 'offline');
      return { ...FETCHED, baseCurrencyCode: base, quoteCurrencyCode: quote };
    },
  };
  const service = makeService(repo, provider, c.now);

  await service.ensureFreshRates(['USD', 'EUR']);

  assert.equal(provider.calls, 2);
  assert.ok(await repo.find('USD', 'COP'), 'the currency that succeeded must be saved');
  assert.equal(await repo.find('EUR', 'COP'), null, 'the failed one saves nothing');
});

test('service: listStatuses covers the held currencies and skips the base', async () => {
  const repo = new MemoryExchangeRateRepository();
  const c = clock('2026-07-24T12:00:00.000Z');
  const service = makeService(repo, new StubProvider(FETCHED), c.now);
  const statuses = await service.listStatuses(['COP', 'USD', 'USD', 'EUR']);
  assert.deepEqual(statuses.map((status) => status.currencyCode), ['USD', 'EUR']);
  assert.deepEqual(statuses.map((status) => status.freshness), ['none', 'none']);
});
