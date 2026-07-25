import assert from 'node:assert/strict';
import test from 'node:test';

import { toUserMessage } from '../src/errors/user-error.ts';

test('passes through curated domain messages', () => {
  assert.equal(
    toUserMessage(new Error('Void the linked refunds before editing this expense.')),
    'Void the linked refunds before editing this expense.',
  );
  assert.equal(
    toUserMessage(new Error('Only archived accounts can be restored.')),
    'Only archived accounts can be restored.',
  );
});

test('replaces raw SQLite / constraint errors with the fallback', () => {
  assert.equal(
    toUserMessage(new Error('FOREIGN KEY constraint failed'), 'Could not delete.'),
    'Could not delete.',
  );
  assert.equal(
    toUserMessage(new Error('UNIQUE constraint failed: accounts.name'), 'Could not save.'),
    'Could not save.',
  );
  assert.equal(
    toUserMessage(new Error('SQLITE_ERROR: no such column: foo')),
    'Something went wrong. Please try again.',
  );
});

test('replaces safe-integer / undefined-field technical errors', () => {
  assert.equal(
    toUserMessage(new Error('Net worth exceeds the supported safe integer range.'), 'fallback'),
    'fallback',
  );
  assert.equal(
    toUserMessage(new TypeError("Cannot read properties of undefined (reading 'balance')"), 'fallback'),
    'fallback',
  );
});

test('replaces stack-like multi-line errors and non-Error values', () => {
  assert.equal(toUserMessage('a plain string', 'fallback'), 'fallback');
  assert.equal(toUserMessage(null, 'fallback'), 'fallback');
  assert.equal(toUserMessage(undefined, 'fallback'), 'fallback');
  const withStack = new Error('boom\n at foo (bar.ts:1:1)');
  assert.equal(toUserMessage(withStack, 'fallback'), 'fallback');
});

test('uses the generic default when no fallback is provided', () => {
  assert.equal(toUserMessage(123), 'Something went wrong. Please try again.');
});
