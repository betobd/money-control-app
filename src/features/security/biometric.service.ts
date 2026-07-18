import type {
  BiometricAuthenticationResult,
  BiometricAvailability,
  BiometricType,
} from './app-lock.types';

export type NativeBiometricResult =
  | { success: true }
  | { success: false; error: string; warning?: string };

export interface LocalAuthenticationApi {
  hasHardwareAsync(): Promise<boolean>;
  isEnrolledAsync(): Promise<boolean>;
  supportedAuthenticationTypesAsync(): Promise<number[]>;
  getEnrolledLevelAsync(): Promise<number>;
  authenticateAsync(options: {
    promptMessage: string;
    promptSubtitle: string;
    cancelLabel: string;
    disableDeviceFallback: boolean;
    requireConfirmation: boolean;
    biometricsSecurityLevel: 'strong';
    fallbackLabel: string;
  }): Promise<NativeBiometricResult>;
}

export class BiometricServiceError extends Error {
  constructor(message = 'Device biometric status could not be checked.') {
    super(message);
  }
}

function mapTypes(types: number[]): BiometricType[] {
  const mapped = new Set<BiometricType>();
  for (const type of types) {
    if (type === 1) mapped.add('fingerprint');
    if (type === 2) mapped.add('face');
    if (type === 3) mapped.add('iris');
  }
  return [...mapped];
}

export class BiometricService {
  private activeAuthentication: Promise<BiometricAuthenticationResult> | null = null;

  constructor(
    private readonly api: LocalAuthenticationApi,
    private readonly strongSecurityLevel: number,
  ) {}

  async getAvailability(): Promise<BiometricAvailability> {
    try {
      const hasHardware = await this.api.hasHardwareAsync();
      if (!hasHardware) return { status: 'noHardware', types: [] };
      const types = mapTypes(await this.api.supportedAuthenticationTypesAsync());
      const enrolled = await this.api.isEnrolledAsync();
      if (!enrolled) return { status: 'notEnrolled', types };
      const level = await this.api.getEnrolledLevelAsync();
      if (level !== this.strongSecurityLevel) return { status: 'notStrongEnough', types };
      return { status: 'available', types, strong: true };
    } catch {
      throw new BiometricServiceError();
    }
  }

  authenticate(): Promise<BiometricAuthenticationResult> {
    if (this.activeAuthentication) return this.activeAuthentication;
    this.activeAuthentication = this.performAuthentication().finally(() => {
      this.activeAuthentication = null;
    });
    return this.activeAuthentication;
  }

  private async performAuthentication(): Promise<BiometricAuthenticationResult> {
    let result: NativeBiometricResult;
    try {
      result = await this.api.authenticateAsync({
        promptMessage: 'Unlock Money Control',
        promptSubtitle: 'Confirm your identity to continue',
        cancelLabel: 'Use PIN',
        disableDeviceFallback: true,
        fallbackLabel: 'Use PIN',
        requireConfirmation: true,
        biometricsSecurityLevel: 'strong',
      });
    } catch {
      throw new BiometricServiceError('Biometric authentication could not be started.');
    }
    if (result.success) return { status: 'success' };
    if (['user_cancel', 'app_cancel', 'system_cancel', 'user_fallback'].includes(result.error)) {
      return { status: 'cancelled' };
    }
    if (result.error === 'lockout') return { status: 'temporarilyLocked' };
    if (['not_enrolled', 'not_available', 'passcode_not_set', 'invalid_context'].includes(result.error)) {
      return { status: 'unavailable' };
    }
    return { status: 'failed' };
  }
}

