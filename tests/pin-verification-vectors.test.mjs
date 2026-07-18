import assert from 'node:assert/strict';
import { pbkdf2 as nodePbkdf2, timingSafeEqual } from 'node:crypto';
import test from 'node:test';
import { promisify } from 'node:util';

import { PinVerificationService } from '../src/features/security/pin-verification.service.ts';

const pbkdf2 = promisify(nodePbkdf2);

const referenceCrypto = {
  assertAvailable() {},
  async derive(password, salt, iterations, length) {
    return Uint8Array.from(await pbkdf2(password, salt, iterations, length, 'sha256'));
  },
  timingSafeEqual(left, right) {
    return left.length === right.length && timingSafeEqual(left, right);
  },
};

test('PBKDF2-HMAC-SHA256 reference vectors produce the standard 32-byte outputs', async () => {
  for (const vector of [
    { iterations: 1, expected: '120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b' },
    { iterations: 2, expected: 'ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43' },
    { iterations: 4_096, expected: 'c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a' },
  ]) {
    const actual = await referenceCrypto.derive(
      Buffer.from('password'),
      Buffer.from('salt'),
      vector.iterations,
      32,
    );
    assert.equal(Buffer.from(actual).toString('hex'), vector.expected);
  }
});

test('version 1 verifier remains standard PBKDF2-HMAC-SHA256 with a 16-byte salt and 32-byte key', async () => {
  const service = new PinVerificationService(
    async (length) => Uint8Array.from({ length }, (_, index) => index),
    referenceCrypto,
  );
  const verifier = await service.create('123456');
  assert.equal(verifier.version, 1);
  assert.equal(verifier.algorithm, 'PBKDF2-HMAC-SHA256');
  assert.equal(verifier.iterations, 600_000);
  assert.equal(verifier.saltHex.length, 32);
  assert.equal(verifier.derivedKeyHex.length, 64);
  assert.equal(verifier.derivedKeyLength, 32);
  assert.equal(await service.verify('123456', verifier), true);
  assert.equal(await service.verify('654321', verifier), false);
});
