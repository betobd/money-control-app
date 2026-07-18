import assert from 'node:assert/strict';
import test from 'node:test';

import { canRenderProtectedContent } from '../src/features/security/app-lock-gate-policy.ts';

test('protected financial content renders only after disabled or unlocked is known', () => {
  assert.equal(canRenderProtectedContent('disabled'), true);
  assert.equal(canRenderProtectedContent('unlocked'), true);
  for (const status of ['loading', 'locked', 'authenticating', 'temporarilyLocked', 'configurationError']) {
    assert.equal(canRenderProtectedContent(status), false, `${status} must remain gated`);
  }
});
