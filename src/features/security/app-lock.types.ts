export const APP_LOCK_CONFIG_VERSION = 1 as const;
export const PIN_VERIFIER_VERSION = 1 as const;
export const APP_LOCK_ATTEMPTS_VERSION = 1 as const;

export const APP_LOCK_CONFIG_KEY = 'money_control_app_lock_config_v1';
export const PIN_VERIFIER_KEY = 'money_control_pin_verifier_v1';
export const PENDING_PIN_VERIFIER_KEY = 'money_control_pin_verifier_pending_v1';
export const APP_LOCK_ATTEMPTS_KEY = 'money_control_app_lock_attempts_v1';

export const PIN_LENGTH = 6;
export const PBKDF2_ITERATIONS = 600_000;
export const PBKDF2_DERIVED_KEY_BYTES = 32;
export const PBKDF2_SALT_BYTES = 16;

export const APP_LOCK_DELAYS = [0, 30_000, 60_000, 300_000, 900_000] as const;
export type AppLockDelay = (typeof APP_LOCK_DELAYS)[number];

export type AppLockConfigV1 = {
  version: typeof APP_LOCK_CONFIG_VERSION;
  status: 'active' | 'disabling';
  biometricUnlockEnabled: boolean;
  lockDelayMs: AppLockDelay;
};

export type PinVerifierV1 = {
  version: typeof PIN_VERIFIER_VERSION;
  algorithm: 'PBKDF2-HMAC-SHA256';
  iterations: number;
  saltHex: string;
  derivedKeyHex: string;
  derivedKeyLength: number;
};

export type AppLockAttemptsV1 = {
  version: typeof APP_LOCK_ATTEMPTS_VERSION;
  failedAttempts: number;
  lockoutLevel: number;
  lockoutStartedAtEpochMs: number | null;
  lockoutUntilEpochMs: number | null;
};

export type LoadedAppLock =
  | { status: 'disabled' }
  | {
      status: 'enabled';
      config: AppLockConfigV1;
      lockoutUntilEpochMs: number | null;
    };

export type PinVerificationResult =
  | { status: 'verified' }
  | { status: 'incorrect'; attemptsRemaining: number }
  | { status: 'temporarilyLocked'; untilEpochMs: number };

export type BiometricType = 'fingerprint' | 'face' | 'iris';

export type BiometricAvailability =
  | { status: 'available'; types: BiometricType[]; strong: true }
  | { status: 'noHardware'; types: [] }
  | { status: 'notEnrolled'; types: BiometricType[] }
  | { status: 'notStrongEnough'; types: BiometricType[] };

export type BiometricAuthenticationResult =
  | { status: 'success' }
  | { status: 'cancelled' }
  | { status: 'failed' }
  | { status: 'temporarilyLocked' }
  | { status: 'unavailable' };

export type AppLockState =
  | { status: 'loading' }
  | { status: 'disabled' }
  | { status: 'locked'; message?: string }
  | { status: 'authenticating' }
  | { status: 'unlocked' }
  | { status: 'temporarilyLocked'; untilEpochMs: number }
  | { status: 'configurationError'; message: string };

