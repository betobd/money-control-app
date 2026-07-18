import {
  PBKDF2_DERIVED_KEY_BYTES,
  PBKDF2_ITERATIONS,
  PBKDF2_SALT_BYTES,
  PIN_LENGTH,
  PIN_VERIFIER_VERSION,
  type PinVerifierV1,
} from './app-lock.types';
import type { PinCrypto } from './pin-crypto';

export type RandomBytes = (length: number) => Promise<Uint8Array>;

export class PinValidationError extends Error {
  constructor(public readonly code: 'non_numeric' | 'wrong_length' | 'confirmation_mismatch') {
    super(
      code === 'non_numeric'
        ? 'PIN must contain numbers only.'
        : code === 'wrong_length'
          ? `PIN must contain exactly ${PIN_LENGTH} digits.`
          : 'PIN confirmation does not match.',
    );
    this.name = 'PinValidationError';
  }
}

function pinToBytes(pin: string): Uint8Array {
  const bytes = new Uint8Array(pin.length);
  for (let index = 0; index < pin.length; index += 1) {
    bytes[index] = pin.charCodeAt(index);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = '';
  for (const byte of bytes) hex += byte.toString(16).padStart(2, '0');
  return hex;
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export class PinVerificationService {
  constructor(
    private readonly randomBytes: RandomBytes,
    private readonly crypto: PinCrypto,
  ) {}

  assertCryptoAvailable(): void {
    this.crypto.assertAvailable();
  }

  validate(pin: string): void {
    if (!/^\d+$/u.test(pin)) throw new PinValidationError('non_numeric');
    if (pin.length !== PIN_LENGTH) throw new PinValidationError('wrong_length');
  }

  validateConfirmation(pin: string, confirmation: string): void {
    this.validate(pin);
    this.validate(confirmation);
    if (pin !== confirmation) throw new PinValidationError('confirmation_mismatch');
  }

  async create(pin: string): Promise<PinVerifierV1> {
    this.validate(pin);
    const salt = await this.randomBytes(PBKDF2_SALT_BYTES);
    if (salt.length !== PBKDF2_SALT_BYTES) throw new Error('Secure random source returned an invalid salt length.');
    const pinBytes = pinToBytes(pin);
    let derived: Uint8Array | undefined;
    try {
      derived = await this.crypto.derive(pinBytes, salt, PBKDF2_ITERATIONS, PBKDF2_DERIVED_KEY_BYTES);
      return {
        version: PIN_VERIFIER_VERSION,
        algorithm: 'PBKDF2-HMAC-SHA256',
        iterations: PBKDF2_ITERATIONS,
        saltHex: bytesToHex(salt),
        derivedKeyHex: bytesToHex(derived),
        derivedKeyLength: PBKDF2_DERIVED_KEY_BYTES,
      };
    } finally {
      pinBytes.fill(0);
      salt.fill(0);
      derived?.fill(0);
    }
  }

  async verify(pin: string, verifier: PinVerifierV1): Promise<boolean> {
    this.validate(pin);
    const pinBytes = pinToBytes(pin);
    const salt = hexToBytes(verifier.saltHex);
    const expected = hexToBytes(verifier.derivedKeyHex);
    let derived: Uint8Array | undefined;
    try {
      derived = await this.crypto.derive(pinBytes, salt, verifier.iterations, verifier.derivedKeyLength);
      return this.crypto.timingSafeEqual(derived, expected);
    } finally {
      pinBytes.fill(0);
      salt.fill(0);
      expected.fill(0);
      derived?.fill(0);
    }
  }
}
