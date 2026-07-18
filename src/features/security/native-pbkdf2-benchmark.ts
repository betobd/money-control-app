import * as Device from 'expo-device';
import { Platform } from 'react-native';

import { NativePinCryptoAdapter } from './native-pin-crypto.adapter';

const BENCHMARK_ITERATIONS = [100_000, 300_000, 600_000, 900_000] as const;

type RunMeasurement = {
  elapsedMs: number;
  eventLoopTicks: number;
  maxEventLoopGapMs: number;
};

type VectorResult = {
  iterations: number;
  passed: boolean;
};

function ascii(value: string): Uint8Array {
  return Uint8Array.from(value, (character) => character.charCodeAt(0));
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  return sorted[Math.floor(sorted.length / 2)];
}

async function measure(
  crypto: NativePinCryptoAdapter,
  pin: Uint8Array,
  salt: Uint8Array,
  iterations: number,
): Promise<RunMeasurement> {
  let eventLoopTicks = 0;
  let maxEventLoopGapMs = 0;
  let previousTick = performance.now();
  const monitor = setInterval(() => {
    const current = performance.now();
    maxEventLoopGapMs = Math.max(maxEventLoopGapMs, current - previousTick);
    previousTick = current;
    eventLoopTicks += 1;
  }, 16);
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  const started = performance.now();
  const derived = await crypto.derive(pin, salt, iterations, 32);
  const elapsedMs = performance.now() - started;
  derived.fill(0);
  await new Promise<void>((resolve) => setTimeout(resolve, 20));
  clearInterval(monitor);
  return {
    elapsedMs: Math.round(elapsedMs * 10) / 10,
    eventLoopTicks,
    maxEventLoopGapMs: Math.round(maxEventLoopGapMs * 10) / 10,
  };
}

async function verifyStandardVectors(crypto: NativePinCryptoAdapter): Promise<VectorResult[]> {
  const vectors = [
    { iterations: 1, expected: '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b' },
    { iterations: 2, expected: 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43' },
    { iterations: 4_096, expected: 'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a' },
  ];
  const results: VectorResult[] = [];
  for (const vector of vectors) {
    const password = ascii('password');
    const salt = ascii('salt');
    const expected = hexToBytes(vector.expected);
    const actual = await crypto.derive(password, salt, vector.iterations, expected.length);
    results.push({
      iterations: vector.iterations,
      passed: crypto.timingSafeEqual(actual, expected),
    });
    password.fill(0);
    salt.fill(0);
    expected.fill(0);
    actual.fill(0);
  }
  const comparisonLeft = new Uint8Array([1, 2, 3]);
  const comparisonRight = new Uint8Array([1, 2, 3]);
  const comparisonDifferent = new Uint8Array([1, 2, 4]);
  if (
    !crypto.timingSafeEqual(comparisonLeft, comparisonRight)
    || crypto.timingSafeEqual(comparisonLeft, comparisonDifferent)
  ) {
    throw new Error('Native timing-safe comparison self-test failed.');
  }
  comparisonLeft.fill(0);
  comparisonRight.fill(0);
  comparisonDifferent.fill(0);
  return results;
}

export async function runNativePbkdf2Benchmark(iterations: number): Promise<void> {
  if (!BENCHMARK_ITERATIONS.includes(iterations as (typeof BENCHMARK_ITERATIONS)[number])) {
    throw new Error('Unsupported native PBKDF2 benchmark iteration count.');
  }
  const crypto = new NativePinCryptoAdapter();
  crypto.assertAvailable();
  const pin = ascii('123456');
  const salt = Uint8Array.from({ length: 16 }, (_, index) => index);
  const cold = await measure(crypto, pin, salt, iterations);
  const vectors = await verifyStandardVectors(crypto);
  if (vectors.some((vector) => !vector.passed)) {
    throw new Error('Native PBKDF2-HMAC-SHA256 standard-vector verification failed.');
  }
  const warm: RunMeasurement[] = [];
  for (let run = 0; run < 5; run += 1) {
    warm.push(await measure(crypto, pin, salt, iterations));
  }
  pin.fill(0);
  salt.fill(0);
  const warmTimes = warm.map((measurement) => measurement.elapsedMs);
  console.info('[native-pbkdf2-benchmark]', JSON.stringify({
    iterations,
    digest: 'SHA-256',
    derivedKeyBytes: 32,
    saltBytes: 16,
    mode: __DEV__ ? 'debug-development-build' : 'release-build',
    device: {
      isPhysicalDevice: Device.isDevice,
      modelName: Device.modelName,
      osName: Device.osName,
      osVersion: Device.osVersion,
      osBuildId: Device.osBuildId,
      supportedCpuArchitectures: Device.supportedCpuArchitectures,
      platform: Platform.OS,
    },
    standardVectors: vectors,
    cold,
    warm,
    warmSummary: {
      medianMs: median(warmTimes),
      minMs: Math.min(...warmTimes),
      maxMs: Math.max(...warmTimes),
    },
    uiResponsive: [cold, ...warm].every(
      (measurement) => measurement.eventLoopTicks > 0 && measurement.maxEventLoopGapMs < 100,
    ),
  }));
}
