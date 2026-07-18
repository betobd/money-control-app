import type {
  AppLockAttemptsV1,
  AppLockConfigV1,
  PinVerifierV1,
} from './app-lock.types';

export interface AppLockRepository {
  readConfig(): Promise<AppLockConfigV1 | null>;
  writeConfig(config: AppLockConfigV1): Promise<void>;
  deleteConfig(): Promise<void>;
  readPinVerifier(): Promise<PinVerifierV1 | null>;
  writePinVerifier(verifier: PinVerifierV1): Promise<void>;
  deletePinVerifier(): Promise<void>;
  readPendingPinVerifier(): Promise<PinVerifierV1 | null>;
  writePendingPinVerifier(verifier: PinVerifierV1): Promise<void>;
  deletePendingPinVerifier(): Promise<void>;
  readAttempts(): Promise<AppLockAttemptsV1 | null>;
  writeAttempts(attempts: AppLockAttemptsV1): Promise<void>;
  deleteAttempts(): Promise<void>;
}

export type AppLockConfigurationErrorCode =
  | 'secure_store_unavailable'
  | 'secure_store_read_failed'
  | 'secure_store_write_failed'
  | 'secure_store_delete_failed'
  | 'corrupt_record'
  | 'unsupported_version'
  | 'missing_verifier';

export class AppLockConfigurationError extends Error {
  constructor(
    public readonly code: AppLockConfigurationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

