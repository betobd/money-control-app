import { getRandomBytesAsync } from 'expo-crypto';
import * as LocalAuthentication from 'expo-local-authentication';
import * as ScreenCapture from 'expo-screen-capture';
import * as SecureStore from 'expo-secure-store';

import { AppLockService } from './app-lock.service';
import { BiometricService } from './biometric.service';
import { notifyAppLockSettingsChanged } from './app-lock-events';
import { ExpoSecureStorageAdapter } from './expo-secure-storage.adapter';
import { NativePinCryptoAdapter } from './native-pin-crypto.adapter';
import { PinVerificationService } from './pin-verification.service';
import { PrivacyProtectionService } from './privacy-protection.service';
import { SecureAppLockRepository } from './secure-app-lock.repository';

const secureStorage = new ExpoSecureStorageAdapter(SecureStore);
const repository = new SecureAppLockRepository(secureStorage);
const pinVerification = new PinVerificationService(getRandomBytesAsync, new NativePinCryptoAdapter());
const biometricService = new BiometricService(
  LocalAuthentication,
  LocalAuthentication.SecurityLevel.BIOMETRIC_STRONG,
);

export const appLockService = new AppLockService(
  repository,
  pinVerification,
  biometricService,
  notifyAppLockSettingsChanged,
);

export const privacyProtectionService = new PrivacyProtectionService(ScreenCapture);

if (__DEV__ && process.env.EXPO_PUBLIC_PBKDF2_BENCHMARK_ITERATIONS) {
  const iterations = Number(process.env.EXPO_PUBLIC_PBKDF2_BENCHMARK_ITERATIONS);
  void import('./native-pbkdf2-benchmark').then(
    ({ runNativePbkdf2Benchmark }) => runNativePbkdf2Benchmark(iterations),
  ).catch(() => {
    console.error('[native-pbkdf2-benchmark] failed without exposing cryptographic material');
  });
}
