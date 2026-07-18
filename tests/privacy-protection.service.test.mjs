import assert from 'node:assert/strict';
import test from 'node:test';

import { PrivacyProtectionService } from '../src/features/security/privacy-protection.service.ts';

class FakeScreenCapture {
  available = true;
  prevented = [];
  allowed = [];

  async isAvailableAsync() { return this.available; }
  async preventScreenCaptureAsync(key) { this.prevented.push(key); }
  async allowScreenCaptureAsync(key) { this.allowed.push(key); }
}

test('enables and disables screen-capture protection with one stable key', async () => {
  const api = new FakeScreenCapture();
  const service = new PrivacyProtectionService(api);
  assert.equal(await service.enable(), true);
  await service.disable();
  assert.deepEqual(api.prevented, ['money-control-app-lock']);
  assert.deepEqual(api.allowed, ['money-control-app-lock']);
});

test('reports unavailable capture protection without claiming it was enabled', async () => {
  const api = new FakeScreenCapture();
  api.available = false;
  const service = new PrivacyProtectionService(api);
  assert.equal(await service.enable(), false);
  await service.disable();
  assert.deepEqual(api.prevented, []);
  assert.deepEqual(api.allowed, []);
});

test('propagates native capture errors so the provider can report degraded privacy', async () => {
  const api = new FakeScreenCapture();
  api.preventScreenCaptureAsync = async () => { throw new Error('native failure'); };
  const service = new PrivacyProtectionService(api);
  await assert.rejects(() => service.enable(), /native failure/u);
});
