import {
  APP_LOCK_ATTEMPTS_KEY,
  APP_LOCK_ATTEMPTS_VERSION,
  APP_LOCK_CONFIG_KEY,
  APP_LOCK_CONFIG_VERSION,
  APP_LOCK_DELAYS,
  PBKDF2_DERIVED_KEY_BYTES,
  PENDING_PIN_VERIFIER_KEY,
  PIN_VERIFIER_KEY,
  PIN_VERIFIER_VERSION,
  type AppLockAttemptsV1,
  type AppLockConfigV1,
  type PinVerifierV1,
} from './app-lock.types';
import {
  AppLockConfigurationError,
  type AppLockRepository,
} from './app-lock.repository';

export interface SecureKeyValueStore {
  isAvailable(): Promise<boolean>;
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  deleteItem(key: string): Promise<void>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function parseJson(value: string, key: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed)) throw new Error('Expected an object.');
    return parsed;
  } catch {
    throw new AppLockConfigurationError('corrupt_record', `The secure ${key} record is damaged.`);
  }
}

function parseConfig(value: string): AppLockConfigV1 {
  const record = parseJson(value, 'App Lock configuration');
  if (record.version !== APP_LOCK_CONFIG_VERSION) {
    throw new AppLockConfigurationError('unsupported_version', 'This App Lock configuration version is not supported.');
  }
  if (
    (record.status !== 'active' && record.status !== 'disabling')
    || typeof record.biometricUnlockEnabled !== 'boolean'
    || !APP_LOCK_DELAYS.includes(record.lockDelayMs as AppLockConfigV1['lockDelayMs'])
  ) {
    throw new AppLockConfigurationError('corrupt_record', 'The secure App Lock configuration is damaged.');
  }
  return {
    version: APP_LOCK_CONFIG_VERSION,
    status: record.status,
    biometricUnlockEnabled: record.biometricUnlockEnabled,
    lockDelayMs: record.lockDelayMs as AppLockConfigV1['lockDelayMs'],
  };
}

function isHex(value: unknown, bytes: number): value is string {
  return typeof value === 'string' && value.length === bytes * 2 && /^[a-f0-9]+$/u.test(value);
}

function parseVerifier(value: string): PinVerifierV1 {
  const record = parseJson(value, 'PIN verifier');
  if (record.version !== PIN_VERIFIER_VERSION) {
    throw new AppLockConfigurationError('unsupported_version', 'This PIN verifier version is not supported.');
  }
  if (
    record.algorithm !== 'PBKDF2-HMAC-SHA256'
    || !Number.isSafeInteger(record.iterations)
    || (record.iterations as number) < 100_000
    || record.derivedKeyLength !== PBKDF2_DERIVED_KEY_BYTES
    || !isHex(record.saltHex, 16)
    || !isHex(record.derivedKeyHex, PBKDF2_DERIVED_KEY_BYTES)
  ) {
    throw new AppLockConfigurationError('corrupt_record', 'The secure PIN verifier is damaged.');
  }
  return {
    version: PIN_VERIFIER_VERSION,
    algorithm: 'PBKDF2-HMAC-SHA256',
    iterations: record.iterations as number,
    saltHex: record.saltHex,
    derivedKeyHex: record.derivedKeyHex,
    derivedKeyLength: PBKDF2_DERIVED_KEY_BYTES,
  };
}

function nullableSafeInteger(value: unknown): value is number | null {
  return value === null || (Number.isSafeInteger(value) && (value as number) >= 0);
}

function parseAttempts(value: string): AppLockAttemptsV1 {
  const record = parseJson(value, 'failed-attempt');
  if (record.version !== APP_LOCK_ATTEMPTS_VERSION) {
    throw new AppLockConfigurationError('unsupported_version', 'This failed-attempt record version is not supported.');
  }
  if (
    !Number.isSafeInteger(record.failedAttempts)
    || (record.failedAttempts as number) < 0
    || (record.failedAttempts as number) > 4
    || !Number.isSafeInteger(record.lockoutLevel)
    || (record.lockoutLevel as number) < 0
    || !nullableSafeInteger(record.lockoutStartedAtEpochMs)
    || !nullableSafeInteger(record.lockoutUntilEpochMs)
  ) {
    throw new AppLockConfigurationError('corrupt_record', 'The secure failed-attempt record is damaged.');
  }
  const hasStarted = record.lockoutStartedAtEpochMs !== null;
  const hasUntil = record.lockoutUntilEpochMs !== null;
  if (hasStarted !== hasUntil) {
    throw new AppLockConfigurationError('corrupt_record', 'The secure failed-attempt record is incomplete.');
  }
  return {
    version: APP_LOCK_ATTEMPTS_VERSION,
    failedAttempts: record.failedAttempts as number,
    lockoutLevel: record.lockoutLevel as number,
    lockoutStartedAtEpochMs: record.lockoutStartedAtEpochMs as number | null,
    lockoutUntilEpochMs: record.lockoutUntilEpochMs as number | null,
  };
}

export class SecureAppLockRepository implements AppLockRepository {
  constructor(private readonly storage: SecureKeyValueStore) {}

  readConfig(): Promise<AppLockConfigV1 | null> {
    return this.read(APP_LOCK_CONFIG_KEY, parseConfig);
  }

  writeConfig(config: AppLockConfigV1): Promise<void> {
    return this.write(APP_LOCK_CONFIG_KEY, config);
  }

  deleteConfig(): Promise<void> {
    return this.remove(APP_LOCK_CONFIG_KEY);
  }

  readPinVerifier(): Promise<PinVerifierV1 | null> {
    return this.read(PIN_VERIFIER_KEY, parseVerifier);
  }

  writePinVerifier(verifier: PinVerifierV1): Promise<void> {
    return this.write(PIN_VERIFIER_KEY, verifier);
  }

  deletePinVerifier(): Promise<void> {
    return this.remove(PIN_VERIFIER_KEY);
  }

  readPendingPinVerifier(): Promise<PinVerifierV1 | null> {
    return this.read(PENDING_PIN_VERIFIER_KEY, parseVerifier);
  }

  writePendingPinVerifier(verifier: PinVerifierV1): Promise<void> {
    return this.write(PENDING_PIN_VERIFIER_KEY, verifier);
  }

  deletePendingPinVerifier(): Promise<void> {
    return this.remove(PENDING_PIN_VERIFIER_KEY);
  }

  readAttempts(): Promise<AppLockAttemptsV1 | null> {
    return this.read(APP_LOCK_ATTEMPTS_KEY, parseAttempts);
  }

  writeAttempts(attempts: AppLockAttemptsV1): Promise<void> {
    return this.write(APP_LOCK_ATTEMPTS_KEY, attempts);
  }

  deleteAttempts(): Promise<void> {
    return this.remove(APP_LOCK_ATTEMPTS_KEY);
  }

  private async assertAvailable(): Promise<void> {
    let available: boolean;
    try {
      available = await this.storage.isAvailable();
    } catch {
      throw new AppLockConfigurationError('secure_store_unavailable', 'Secure storage availability could not be determined.');
    }
    if (!available) {
      throw new AppLockConfigurationError('secure_store_unavailable', 'Secure storage is unavailable on this device.');
    }
  }

  private async read<T>(key: string, parser: (value: string) => T): Promise<T | null> {
    await this.assertAvailable();
    let value: string | null;
    try {
      value = await this.storage.getItem(key);
    } catch {
      throw new AppLockConfigurationError('secure_store_read_failed', 'Secure App Lock data could not be read.');
    }
    return value === null ? null : parser(value);
  }

  private async write(key: string, value: object): Promise<void> {
    await this.assertAvailable();
    try {
      await this.storage.setItem(key, JSON.stringify(value));
    } catch {
      throw new AppLockConfigurationError('secure_store_write_failed', 'Secure App Lock data could not be saved.');
    }
  }

  private async remove(key: string): Promise<void> {
    await this.assertAvailable();
    try {
      await this.storage.deleteItem(key);
    } catch {
      throw new AppLockConfigurationError('secure_store_delete_failed', 'Secure App Lock data could not be removed.');
    }
  }
}

