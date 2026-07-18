import assert from 'node:assert/strict';
import test from 'node:test';

import { BiometricService, BiometricServiceError } from '../src/features/security/biometric.service.ts';

class FakeLocalAuthentication {
  hardware = true;
  enrolled = true;
  types = [1];
  level = 3;
  result = { success: true };
  calls = 0;
  deferred = null;

  async hasHardwareAsync() { return this.hardware; }
  async isEnrolledAsync() { return this.enrolled; }
  async supportedAuthenticationTypesAsync() { return this.types; }
  async getEnrolledLevelAsync() { return this.level; }
  async authenticateAsync(options) {
    this.calls += 1;
    this.options = options;
    if (this.deferred) return this.deferred;
    return this.result;
  }
}

function setup() {
  const api = new FakeLocalAuthentication();
  return { api, service: new BiometricService(api, 3) };
}

test('reports unsupported hardware, no enrollment, weak enrollment, and strong modalities', async () => {
  const { api, service } = setup();
  api.hardware = false;
  assert.deepEqual(await service.getAvailability(), { status: 'noHardware', types: [] });
  api.hardware = true;
  api.enrolled = false;
  api.types = [1, 2];
  assert.deepEqual(await service.getAvailability(), { status: 'notEnrolled', types: ['fingerprint', 'face'] });
  api.enrolled = true;
  api.level = 2;
  assert.deepEqual(await service.getAvailability(), { status: 'notStrongEnough', types: ['fingerprint', 'face'] });
  api.level = 3;
  api.types = [1, 2, 3];
  assert.deepEqual(await service.getAvailability(), { status: 'available', types: ['fingerprint', 'face', 'iris'], strong: true });
});

test('uses a strong biometric-only prompt with the app PIN as independent fallback', async () => {
  const { api, service } = setup();
  assert.deepEqual(await service.authenticate(), { status: 'success' });
  assert.equal(api.options.promptMessage, 'Unlock Money Control');
  assert.equal(api.options.biometricsSecurityLevel, 'strong');
  assert.equal(api.options.disableDeviceFallback, true);
  assert.equal(api.options.fallbackLabel, 'Use PIN');
});

test('normalizes cancellation, failure, lockout, and invalid enrollment separately', async () => {
  for (const [error, status] of [
    ['user_cancel', 'cancelled'],
    ['system_cancel', 'cancelled'],
    ['authentication_failed', 'failed'],
    ['lockout', 'temporarilyLocked'],
    ['not_enrolled', 'unavailable'],
    ['invalid_context', 'unavailable'],
  ]) {
    const { api, service } = setup();
    api.result = { success: false, error };
    assert.deepEqual(await service.authenticate(), { status });
  }
});

test('prevents duplicate simultaneous biometric prompts', async () => {
  const { api, service } = setup();
  let resolve;
  api.deferred = new Promise((done) => { resolve = done; });
  const first = service.authenticate();
  const second = service.authenticate();
  assert.strictEqual(first, second);
  assert.equal(api.calls, 1);
  resolve({ success: true });
  assert.deepEqual(await first, { status: 'success' });
});

test('native biometric errors are converted to safe service errors', async () => {
  const { api, service } = setup();
  api.hasHardwareAsync = async () => { throw new Error('native stack'); };
  await assert.rejects(() => service.getAvailability(), BiometricServiceError);
});

