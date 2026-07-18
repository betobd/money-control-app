import assert from 'node:assert/strict';
import test from 'node:test';

import { ExpoSecureStorageAdapter } from '../src/features/security/expo-secure-storage.adapter.ts';
import { AppLockConfigurationError } from '../src/features/security/app-lock.repository.ts';
import {
  APP_LOCK_CONFIG_KEY,
  APP_LOCK_CONFIG_VERSION,
  PBKDF2_DERIVED_KEY_BYTES,
  PIN_VERIFIER_VERSION,
} from '../src/features/security/app-lock.types.ts';
import { SecureAppLockRepository } from '../src/features/security/secure-app-lock.repository.ts';

class FakeSecureStoreApi {
  available = true;
  values = new Map();
  failure = null;

  async isAvailableAsync() {
    if (this.failure === 'availability') throw new Error('native failure');
    return this.available;
  }

  async getItemAsync(key) {
    if (this.failure === 'read') throw new Error('native failure');
    return this.values.get(key) ?? null;
  }

  async setItemAsync(key, value) {
    if (this.failure === 'write') throw new Error('native failure');
    this.values.set(key, value);
  }

  async deleteItemAsync(key) {
    if (this.failure === 'delete') throw new Error('native failure');
    this.values.delete(key);
  }
}

function context() {
  const api = new FakeSecureStoreApi();
  const adapter = new ExpoSecureStorageAdapter(api);
  const repository = new SecureAppLockRepository(adapter);
  return { api, adapter, repository };
}

const config = {
  version: APP_LOCK_CONFIG_VERSION,
  status: 'active',
  biometricUnlockEnabled: false,
  lockDelayMs: 60_000,
};

const verifier = {
  version: PIN_VERIFIER_VERSION,
  algorithm: 'PBKDF2-HMAC-SHA256',
  iterations: 600_000,
  saltHex: 'ab'.repeat(16),
  derivedKeyHex: 'cd'.repeat(PBKDF2_DERIVED_KEY_BYTES),
  derivedKeyLength: PBKDF2_DERIVED_KEY_BYTES,
};

test('Expo SecureStore adapter forwards only key-value operations', async () => {
  const { api, adapter } = context();
  assert.equal(await adapter.isAvailable(), true);
  await adapter.setItem('key', 'value');
  assert.equal(await adapter.getItem('key'), 'value');
  await adapter.deleteItem('key');
  assert.equal(await adapter.getItem('key'), null);
  assert.equal(api.values.size, 0);
});

test('secure repository round-trips versioned records without plaintext PIN fields', async () => {
  const { api, repository } = context();
  await repository.writeConfig(config);
  await repository.writePinVerifier(verifier);
  assert.deepEqual(await repository.readConfig(), config);
  assert.deepEqual(await repository.readPinVerifier(), verifier);
  const serialized = [...api.values.values()].join('\n');
  assert.equal(serialized.includes('123456'), false);
  assert.equal(serialized.includes('pin'), false);
});

test('missing configuration means App Lock is disabled by default', async () => {
  const { repository } = context();
  assert.equal(await repository.readConfig(), null);
});

test('corrupt and unsupported secure records fail closed', async () => {
  const { api, repository } = context();
  api.values.set(APP_LOCK_CONFIG_KEY, '{bad json');
  await assert.rejects(
    () => repository.readConfig(),
    (error) => error instanceof AppLockConfigurationError && error.code === 'corrupt_record',
  );
  api.values.set(APP_LOCK_CONFIG_KEY, JSON.stringify({ ...config, version: 99 }));
  await assert.rejects(
    () => repository.readConfig(),
    (error) => error instanceof AppLockConfigurationError && error.code === 'unsupported_version',
  );
});

test('SecureStore availability, read, write, and deletion failures remain distinct', async () => {
  for (const [failure, code, action] of [
    ['availability', 'secure_store_unavailable', (repository) => repository.readConfig()],
    ['read', 'secure_store_read_failed', (repository) => repository.readConfig()],
    ['write', 'secure_store_write_failed', (repository) => repository.writeConfig(config)],
    ['delete', 'secure_store_delete_failed', (repository) => repository.deleteConfig()],
  ]) {
    const { api, repository } = context();
    api.failure = failure;
    await assert.rejects(
      () => action(repository),
      (error) => error instanceof AppLockConfigurationError && error.code === code,
    );
  }
});

test('unavailable SecureStore is never interpreted as disabled App Lock', async () => {
  const { api, repository } = context();
  api.available = false;
  await assert.rejects(
    () => repository.readConfig(),
    (error) => error instanceof AppLockConfigurationError && error.code === 'secure_store_unavailable',
  );
});

