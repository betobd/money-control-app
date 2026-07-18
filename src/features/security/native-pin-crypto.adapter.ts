import { pbkdf2, timingSafeEqual } from 'react-native-quick-crypto';

import type { PinCrypto } from './pin-crypto';

export class NativePinCryptoError extends Error {
  constructor(message = 'The native PIN derivation service is unavailable.') {
    super(message);
    this.name = 'NativePinCryptoError';
  }
}

export class NativePinCryptoAdapter implements PinCrypto {
  assertAvailable(): void {
    const probe = new Uint8Array(1);
    try {
      timingSafeEqual(probe, probe);
    } catch {
      throw new NativePinCryptoError();
    } finally {
      probe.fill(0);
    }
  }

  derive(
    pinBytes: Uint8Array,
    saltBytes: Uint8Array,
    iterations: number,
    length: number,
  ): Promise<Uint8Array> {
    return new Promise((resolve, reject) => {
      try {
        pbkdf2(pinBytes, saltBytes, iterations, length, 'sha256', (error, derived) => {
          if (error || !derived) {
            reject(new NativePinCryptoError());
            return;
          }
          resolve(Uint8Array.from(derived));
        });
      } catch {
        reject(new NativePinCryptoError());
      }
    });
  }

  timingSafeEqual(left: Uint8Array, right: Uint8Array): boolean {
    if (left.length !== right.length) return false;
    try {
      return timingSafeEqual(left, right);
    } catch {
      throw new NativePinCryptoError();
    }
  }
}
