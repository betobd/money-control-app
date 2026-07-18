import {
  APP_LOCK_ATTEMPTS_VERSION,
  APP_LOCK_CONFIG_VERSION,
  APP_LOCK_DELAYS,
  type AppLockAttemptsV1,
  type AppLockConfigV1,
  type AppLockDelay,
  type BiometricAuthenticationResult,
  type BiometricAvailability,
  type LoadedAppLock,
  type PinVerificationResult,
  type PinVerifierV1,
} from './app-lock.types';
import {
  AppLockConfigurationError,
  type AppLockRepository,
} from './app-lock.repository';
import type { BiometricService } from './biometric.service';
import type { PinVerificationService } from './pin-verification.service';

const FAILURES_PER_CYCLE = 5;
const LOCKOUT_DURATIONS_MS = [30_000, 60_000, 120_000, 300_000] as const;

export type AppLockActionErrorCode =
  | 'already_enabled'
  | 'not_enabled'
  | 'incorrect_pin'
  | 'biometrics_unavailable'
  | 'biometrics_cancelled'
  | 'biometrics_failed'
  | 'temporarily_locked';

export class AppLockActionError extends Error {
  constructor(
    public readonly code: AppLockActionErrorCode,
    message: string,
    public readonly untilEpochMs?: number,
  ) {
    super(message);
  }
}

function emptyAttempts(): AppLockAttemptsV1 {
  return {
    version: APP_LOCK_ATTEMPTS_VERSION,
    failedAttempts: 0,
    lockoutLevel: 0,
    lockoutStartedAtEpochMs: null,
    lockoutUntilEpochMs: null,
  };
}

function lockoutDuration(level: number): number {
  return LOCKOUT_DURATIONS_MS[Math.min(Math.max(level - 1, 0), LOCKOUT_DURATIONS_MS.length - 1)];
}

export class AppLockService {
  private queue: Promise<void> = Promise.resolve();

  constructor(
    private readonly repository: AppLockRepository,
    private readonly pins: PinVerificationService,
    private readonly biometrics: BiometricService,
    private readonly notifySettingsChanged: () => void,
    private readonly now: () => number = Date.now,
  ) {}

  load(): Promise<LoadedAppLock> {
    return this.serialized(() => this.loadInternal());
  }

  enable(pin: string, confirmation: string): Promise<AppLockConfigV1> {
    return this.serialized(async () => {
      if (await this.repository.readConfig()) {
        throw new AppLockActionError('already_enabled', 'App Lock is already enabled.');
      }
      this.pins.validateConfirmation(pin, confirmation);
      const verifier = await this.pins.create(pin);
      await this.repository.deleteAttempts();
      await this.repository.writePinVerifier(verifier);
      const config: AppLockConfigV1 = {
        version: APP_LOCK_CONFIG_VERSION,
        status: 'active',
        biometricUnlockEnabled: false,
        lockDelayMs: 60_000,
      };
      try {
        await this.repository.writeConfig(config);
      } catch (error) {
        try {
          await this.repository.deletePinVerifier();
        } catch {
          // An orphan verifier cannot enable App Lock because configuration is the commit record.
        }
        throw error;
      }
      this.notifySettingsChanged();
      return config;
    });
  }

  verifyPin(pin: string): Promise<PinVerificationResult> {
    return this.serialized(() => this.verifyPinInternal(pin));
  }

  changePin(currentPin: string, newPin: string, confirmation: string): Promise<void> {
    return this.serialized(async () => {
      await this.requireVerifiedPin(currentPin);
      this.pins.validateConfirmation(newPin, confirmation);
      const verifier = await this.pins.create(newPin);
      await this.repository.writePendingPinVerifier(verifier);
      try {
        await this.repository.writePinVerifier(verifier);
        await this.repository.deletePendingPinVerifier();
      } catch (error) {
        try {
          await this.repository.deletePendingPinVerifier();
        } catch {
          // A remaining staged verifier is recovered only after a process interruption.
        }
        throw error;
      }
      await this.repository.deleteAttempts();
      this.notifySettingsChanged();
    });
  }

  disable(currentPin: string): Promise<void> {
    return this.serialized(async () => {
      await this.requireVerifiedPin(currentPin);
      const config = await this.requireActiveConfig();
      await this.repository.writeConfig({
        ...config,
        status: 'disabling',
        biometricUnlockEnabled: false,
      });
      await this.completeDisable();
      this.notifySettingsChanged();
    });
  }

  setLockDelay(lockDelayMs: AppLockDelay): Promise<AppLockConfigV1> {
    return this.serialized(async () => {
      if (!APP_LOCK_DELAYS.includes(lockDelayMs)) {
        throw new Error('Unsupported automatic lock delay.');
      }
      const config = await this.requireActiveConfig();
      const updated = { ...config, lockDelayMs };
      await this.repository.writeConfig(updated);
      this.notifySettingsChanged();
      return updated;
    });
  }

  getBiometricAvailability(): Promise<BiometricAvailability> {
    return this.biometrics.getAvailability();
  }

  setBiometricEnabled(currentPin: string, enabled: boolean): Promise<AppLockConfigV1> {
    return this.serialized(async () => {
      await this.requireVerifiedPin(currentPin);
      const config = await this.requireActiveConfig();
      if (enabled) {
        const availability = await this.biometrics.getAvailability();
        if (availability.status !== 'available') {
          throw new AppLockActionError('biometrics_unavailable', 'Strong device biometrics are not available.');
        }
        const result = await this.biometrics.authenticate();
        if (result.status === 'cancelled') {
          throw new AppLockActionError('biometrics_cancelled', 'Biometric setup was cancelled.');
        }
        if (result.status !== 'success') {
          throw new AppLockActionError('biometrics_failed', 'Biometric authentication was not successful.');
        }
      }
      const updated = { ...config, biometricUnlockEnabled: enabled };
      await this.repository.writeConfig(updated);
      this.notifySettingsChanged();
      return updated;
    });
  }

  async authenticateWithBiometrics(): Promise<BiometricAuthenticationResult> {
    const config = await this.requireActiveConfig();
    if (!config.biometricUnlockEnabled) return { status: 'unavailable' };
    const availability = await this.biometrics.getAvailability();
    if (availability.status !== 'available') {
      await this.disableBiometricPreference(config);
      return { status: 'unavailable' };
    }
    const result = await this.biometrics.authenticate();
    if (result.status === 'unavailable') await this.disableBiometricPreference(config);
    return result;
  }

  private async loadInternal(): Promise<LoadedAppLock> {
    const config = await this.repository.readConfig();
    if (!config) return { status: 'disabled' };
    if (config.status === 'disabling') {
      await this.completeDisable();
      return { status: 'disabled' };
    }

    const pending = await this.repository.readPendingPinVerifier();
    if (pending) {
      await this.repository.writePinVerifier(pending);
      await this.repository.deletePendingPinVerifier();
    }
    const verifier = pending ?? await this.repository.readPinVerifier();
    if (!verifier) {
      throw new AppLockConfigurationError('missing_verifier', 'App Lock is enabled, but its PIN verifier is missing.');
    }
    this.pins.assertCryptoAvailable();

    const attempts = await this.normalizedAttempts();
    return {
      status: 'enabled',
      config,
      lockoutUntilEpochMs: attempts.lockoutUntilEpochMs,
    };
  }

  private async verifyPinInternal(pin: string): Promise<PinVerificationResult> {
    await this.requireActiveConfig();
    const verifier = await this.requireVerifier();
    const attempts = await this.normalizedAttempts();
    if (attempts.lockoutUntilEpochMs !== null) {
      return { status: 'temporarilyLocked', untilEpochMs: attempts.lockoutUntilEpochMs };
    }

    if (await this.pins.verify(pin, verifier)) {
      await this.repository.deleteAttempts();
      return { status: 'verified' };
    }

    const failedAttempts = attempts.failedAttempts + 1;
    if (failedAttempts < FAILURES_PER_CYCLE) {
      await this.repository.writeAttempts({ ...attempts, failedAttempts });
      return { status: 'incorrect', attemptsRemaining: FAILURES_PER_CYCLE - failedAttempts };
    }

    const lockoutLevel = attempts.lockoutLevel + 1;
    const started = this.now();
    const until = started + lockoutDuration(lockoutLevel);
    await this.repository.writeAttempts({
      version: APP_LOCK_ATTEMPTS_VERSION,
      failedAttempts: 0,
      lockoutLevel,
      lockoutStartedAtEpochMs: started,
      lockoutUntilEpochMs: until,
    });
    return { status: 'temporarilyLocked', untilEpochMs: until };
  }

  private async requireVerifiedPin(pin: string): Promise<void> {
    const result = await this.verifyPinInternal(pin);
    if (result.status === 'verified') return;
    if (result.status === 'temporarilyLocked') {
      throw new AppLockActionError(
        'temporarily_locked',
        'PIN entry is temporarily unavailable.',
        result.untilEpochMs,
      );
    }
    throw new AppLockActionError('incorrect_pin', 'Current PIN is incorrect.');
  }

  private async requireActiveConfig(): Promise<AppLockConfigV1> {
    const config = await this.repository.readConfig();
    if (!config || config.status !== 'active') {
      throw new AppLockActionError('not_enabled', 'App Lock is not enabled.');
    }
    return config;
  }

  private async requireVerifier(): Promise<PinVerifierV1> {
    const verifier = await this.repository.readPinVerifier();
    if (!verifier) {
      throw new AppLockConfigurationError('missing_verifier', 'App Lock is enabled, but its PIN verifier is missing.');
    }
    return verifier;
  }

  private async normalizedAttempts(): Promise<AppLockAttemptsV1> {
    const attempts = await this.repository.readAttempts() ?? emptyAttempts();
    if (attempts.lockoutUntilEpochMs === null || attempts.lockoutStartedAtEpochMs === null) return attempts;
    const now = this.now();
    if (now < attempts.lockoutStartedAtEpochMs) {
      const duration = lockoutDuration(Math.max(attempts.lockoutLevel, 1));
      const rebased = {
        ...attempts,
        lockoutStartedAtEpochMs: now,
        lockoutUntilEpochMs: now + duration,
      };
      await this.repository.writeAttempts(rebased);
      return rebased;
    }
    if (now < attempts.lockoutUntilEpochMs) return attempts;
    const expired = {
      ...attempts,
      failedAttempts: 0,
      lockoutStartedAtEpochMs: null,
      lockoutUntilEpochMs: null,
    };
    await this.repository.writeAttempts(expired);
    return expired;
  }

  private async disableBiometricPreference(config: AppLockConfigV1): Promise<void> {
    if (!config.biometricUnlockEnabled) return;
    await this.repository.writeConfig({ ...config, biometricUnlockEnabled: false });
    this.notifySettingsChanged();
  }

  private async completeDisable(): Promise<void> {
    await this.repository.deletePinVerifier();
    await this.repository.deletePendingPinVerifier();
    await this.repository.deleteAttempts();
    await this.repository.deleteConfig();
  }

  private serialized<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.queue.then(operation, operation);
    this.queue = result.then(() => undefined, () => undefined);
    return result;
  }
}
