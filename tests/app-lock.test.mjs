import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

import { AppLockService, AppLockActionError } from '../src/features/security/app-lock.service.ts';
import { AppLockTiming } from '../src/features/security/app-lock-timing.ts';
import { PinValidationError, PinVerificationService } from '../src/features/security/pin-verification.service.ts';
import { subscribeToFinancialDataChanges } from '../src/features/transactions/financial-data-events.ts';

class MemoryRepository {
  config = null;
  verifier = null;
  pending = null;
  attempts = null;
  failConfigWrite = false;
  financialSentinel = { accounts: 7, transactions: 19 };

  async readConfig() { return structuredClone(this.config); }
  async writeConfig(value) {
    if (this.failConfigWrite) throw new Error('write failed');
    this.config = structuredClone(value);
  }
  async deleteConfig() { this.config = null; }
  async readPinVerifier() { return structuredClone(this.verifier); }
  async writePinVerifier(value) { this.verifier = structuredClone(value); }
  async deletePinVerifier() { this.verifier = null; }
  async readPendingPinVerifier() { return structuredClone(this.pending); }
  async writePendingPinVerifier(value) { this.pending = structuredClone(value); }
  async deletePendingPinVerifier() { this.pending = null; }
  async readAttempts() { return structuredClone(this.attempts); }
  async writeAttempts(value) { this.attempts = structuredClone(value); }
  async deleteAttempts() { this.attempts = null; }
}

class FakeBiometrics {
  availability = { status: 'available', types: ['fingerprint'], strong: true };
  result = { status: 'success' };
  async getAvailability() { return this.availability; }
  async authenticate() { return this.result; }
}

function testKdf(pinBytes, saltBytes, iterations, length) {
  const seed = Buffer.concat([Buffer.from(pinBytes), Buffer.from(saltBytes), Buffer.from(String(iterations))]);
  const digest = createHash('sha256').update(seed).digest();
  return Promise.resolve(Uint8Array.from(digest.subarray(0, length)));
}

const testCrypto = {
  assertAvailable() {},
  derive: testKdf,
  timingSafeEqual(left, right) {
    return Buffer.from(left).equals(Buffer.from(right));
  },
};

function setup(repository = new MemoryRepository(), nowRef = { value: 1_000_000 }, crypto = testCrypto) {
  let saltCounter = 0;
  const pins = new PinVerificationService(async (length) => {
    saltCounter += 1;
    return Uint8Array.from({ length }, (_, index) => (saltCounter + index) % 256);
  }, crypto);
  const biometrics = new FakeBiometrics();
  let securityRefreshes = 0;
  const service = new AppLockService(
    repository,
    pins,
    biometrics,
    () => { securityRefreshes += 1; },
    () => nowRef.value,
  );
  return { repository, pins, biometrics, service, nowRef, securityRefreshes: () => securityRefreshes };
}

test('App Lock is disabled by default and an enabled cold launch remains locked', async () => {
  const context = setup();
  assert.deepEqual(await context.service.load(), { status: 'disabled' });
  await context.service.enable('123456', '123456');
  const loaded = await context.service.load();
  assert.equal(loaded.status, 'enabled');
  assert.equal(loaded.lockoutUntilEpochMs, null);
});

test('enabled startup fails closed when the native PIN crypto service is unavailable', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  const unavailableCrypto = {
    ...testCrypto,
    assertAvailable() { throw new Error('native module missing'); },
  };
  const restarted = setup(context.repository, context.nowRef, unavailableCrypto);
  await assert.rejects(() => restarted.service.load(), /native module missing/u);
});

test('accepts exactly six numeric digits and rejects malformed or mismatched PINs', async () => {
  const { pins } = setup();
  pins.validate('123456');
  for (const pin of ['12345', '1234567', '12a456', '']) {
    assert.throws(() => pins.validate(pin), PinValidationError);
  }
  assert.throws(() => pins.validateConfirmation('123456', '654321'), (error) => error.code === 'confirmation_mismatch');
});

test('stores only salted verification material and different salts produce different verifiers', async () => {
  const { pins } = setup();
  const first = await pins.create('123456');
  const second = await pins.create('123456');
  assert.notEqual(first.saltHex, second.saltHex);
  assert.notEqual(first.derivedKeyHex, second.derivedKeyHex);
  assert.equal(JSON.stringify(first).includes('123456'), false);
  assert.equal(await pins.verify('123456', first), true);
  assert.equal(await pins.verify('654321', first), false);
});

test('SecureStore configuration failure does not enable App Lock and rolls back the verifier', async () => {
  const context = setup();
  context.repository.failConfigWrite = true;
  await assert.rejects(() => context.service.enable('123456', '123456'));
  assert.equal(context.repository.config, null);
  assert.equal(context.repository.verifier, null);
});

test('correct PIN unlocks, incorrect PIN remains locked, and security actions do not invalidate financial data', async () => {
  const context = setup();
  let financialRefreshes = 0;
  const unsubscribe = subscribeToFinancialDataChanges(() => { financialRefreshes += 1; });
  await context.service.enable('123456', '123456');
  assert.equal((await context.service.verifyPin('000000')).status, 'incorrect');
  assert.deepEqual(await context.service.verifyPin('123456'), { status: 'verified' });
  assert.equal(financialRefreshes, 0);
  assert.deepEqual(context.repository.financialSentinel, { accounts: 7, transactions: 19 });
  unsubscribe();
});

test('change PIN requires the current PIN, replaces the verifier, and preserves biometrics', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  await context.service.setBiometricEnabled('123456', true);
  await assert.rejects(() => context.service.changePin('000000', '654321', '654321'), (error) => error instanceof AppLockActionError && error.code === 'incorrect_pin');
  await context.service.changePin('123456', '654321', '654321');
  assert.equal((await context.service.verifyPin('123456')).status, 'incorrect');
  assert.deepEqual(await context.service.verifyPin('654321'), { status: 'verified' });
  assert.equal(context.repository.config.biometricUnlockEnabled, true);
});

test('disable requires the PIN, removes only security records, and leaves financial data untouched', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  await assert.rejects(() => context.service.disable('000000'), (error) => error instanceof AppLockActionError && error.code === 'incorrect_pin');
  await context.service.disable('123456');
  assert.equal(context.repository.config, null);
  assert.equal(context.repository.verifier, null);
  assert.equal(context.repository.attempts, null);
  assert.deepEqual(context.repository.financialSentinel, { accounts: 7, transactions: 19 });
});

test('five failures trigger a persisted 30-second delay, restart does not bypass it, and success resets attempts', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  for (let index = 0; index < 4; index += 1) {
    const result = await context.service.verifyPin('000000');
    assert.equal(result.status, 'incorrect');
    assert.equal(result.attemptsRemaining, 4 - index);
  }
  const fifth = await context.service.verifyPin('000000');
  assert.deepEqual(fifth, { status: 'temporarilyLocked', untilEpochMs: 1_030_000 });
  const restarted = setup(context.repository, context.nowRef);
  assert.deepEqual(await restarted.service.verifyPin('123456'), { status: 'temporarilyLocked', untilEpochMs: 1_030_000 });
  context.nowRef.value = 1_030_000;
  assert.deepEqual(await restarted.service.verifyPin('123456'), { status: 'verified' });
  assert.equal(context.repository.attempts, null);
});

test('backward wall-clock changes rebase rather than bypass a temporary lockout', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  for (let index = 0; index < 5; index += 1) await context.service.verifyPin('000000');
  context.nowRef.value = 500_000;
  const result = await context.service.verifyPin('123456');
  assert.deepEqual(result, { status: 'temporarilyLocked', untilEpochMs: 530_000 });
});

test('repeated five-failure cycles escalate to the five-minute maximum without permanent lockout', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  for (const duration of [30_000, 60_000, 120_000, 300_000, 300_000]) {
    for (let index = 0; index < 5; index += 1) await context.service.verifyPin('000000');
    assert.equal(context.repository.attempts.lockoutUntilEpochMs, context.nowRef.value + duration);
    context.nowRef.value += duration;
  }
  assert.deepEqual(await context.service.verifyPin('123456'), { status: 'verified' });
  assert.equal(context.repository.attempts, null);
});

test('startup completes an interrupted approved disable and never exposes a partial state', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  context.repository.config = { ...context.repository.config, status: 'disabling' };
  assert.deepEqual(await context.service.load(), { status: 'disabled' });
  assert.equal(context.repository.config, null);
  assert.equal(context.repository.verifier, null);
  assert.equal(context.repository.pending, null);
  assert.equal(context.repository.attempts, null);
});

test('startup promotes an authorized staged PIN replacement after process interruption', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  context.repository.pending = await context.pins.create('654321');
  const restarted = setup(context.repository, context.nowRef);
  assert.equal((await restarted.service.load()).status, 'enabled');
  assert.equal(context.repository.pending, null);
  assert.equal((await restarted.service.verifyPin('123456')).status, 'incorrect');
  assert.deepEqual(await restarted.service.verifyPin('654321'), { status: 'verified' });
});

test('biometric enable requires PIN and a successful strong biometric test', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  await assert.rejects(() => context.service.setBiometricEnabled('000000', true), (error) => error.code === 'incorrect_pin');
  context.biometrics.availability = { status: 'noHardware', types: [] };
  await assert.rejects(() => context.service.setBiometricEnabled('123456', true), (error) => error.code === 'biometrics_unavailable');
  context.biometrics.availability = { status: 'available', types: ['fingerprint'], strong: true };
  context.biometrics.result = { status: 'cancelled' };
  await assert.rejects(() => context.service.setBiometricEnabled('123456', true), (error) => error.code === 'biometrics_cancelled');
  context.biometrics.result = { status: 'success' };
  await context.service.setBiometricEnabled('123456', true);
  assert.equal(context.repository.config.biometricUnlockEnabled, true);
});

test('removed biometric enrollment disables only biometric preference and retains PIN fallback', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  await context.service.setBiometricEnabled('123456', true);
  context.biometrics.availability = { status: 'notEnrolled', types: ['fingerprint'] };
  assert.deepEqual(await context.service.authenticateWithBiometrics(), { status: 'unavailable' });
  assert.equal(context.repository.config.biometricUnlockEnabled, false);
  assert.deepEqual(await context.service.verifyPin('123456'), { status: 'verified' });
});

test('biometric success, cancellation, and failure never alter PIN failed-attempt state', async () => {
  const context = setup();
  await context.service.enable('123456', '123456');
  await context.service.setBiometricEnabled('123456', true);
  await context.service.verifyPin('000000');
  const before = structuredClone(context.repository.attempts);
  for (const status of ['success', 'cancelled', 'failed', 'temporarilyLocked']) {
    context.biometrics.result = { status };
    assert.deepEqual(await context.service.authenticateWithBiometrics(), { status });
    assert.deepEqual(context.repository.attempts, before);
  }
});

test('automatic locking honors immediate and every delay boundary without duplicate transitions', () => {
  for (const delay of [0, 30_000, 60_000, 300_000, 900_000]) {
    const timing = new AppLockTiming();
    timing.recordBackground(1_000, 10_000);
    assert.equal(timing.shouldLockOnActive(delay, 1_000 + Math.max(0, delay - 1), 10_000), delay === 0);
    timing.recordBackground(1_000, 10_000);
    timing.recordBackground(2_000, 11_000);
    assert.equal(timing.shouldLockOnActive(delay, 1_000 + delay, 10_000 + delay), true);
    assert.equal(timing.shouldLockOnActive(delay, 1_000 + delay, 10_000 + delay), false);
  }
});

test('automatic locking fails closed if monotonic time is unavailable and wall time moves backward', () => {
  const timing = new AppLockTiming();
  timing.recordBackground(null, 10_000);
  assert.equal(timing.shouldLockOnActive(60_000, null, 9_000), true);
});
