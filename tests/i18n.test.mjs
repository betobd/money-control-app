import assert from 'node:assert/strict';
import test from 'node:test';

import { resolveDeviceLanguage, supportedLanguages } from '../src/i18n/languages.ts';
import { getMessagesFor } from '../src/i18n/messages.ts';
import { pluralCategory } from '../src/i18n/plural.ts';

/** Walks a catalog, yielding [path, value] for every leaf. */
function* leaves(value, path = '') {
  if (typeof value === 'string' || typeof value === 'function') {
    yield [path, value];
    return;
  }
  if (Array.isArray(value)) {
    yield [path, value];
    return;
  }
  for (const [key, child] of Object.entries(value)) yield* leaves(child, path ? `${path}.${key}` : key);
}

const english = new Map(leaves(getMessagesFor('en')));

test('every language has exactly the English keys, with the same kind of value', () => {
  for (const language of supportedLanguages) {
    const catalog = new Map(leaves(getMessagesFor(language)));
    const missing = [...english.keys()].filter((key) => !catalog.has(key));
    const extra = [...catalog.keys()].filter((key) => !english.has(key));
    assert.deepEqual(missing, [], `${language} is missing keys`);
    assert.deepEqual(extra, [], `${language} has keys English does not`);
    for (const [key, value] of english) {
      const translated = catalog.get(key);
      assert.equal(typeof translated, typeof value, `${language}:${key} kind`);
      if (Array.isArray(value)) assert.equal(translated.length, value.length, `${language}:${key} length`);
      if (typeof value === 'function') assert.equal(translated.length, value.length, `${language}:${key} arity`);
    }
  }
});

test('no translation is empty and every message function returns text', () => {
  for (const language of supportedLanguages) {
    for (const [key, value] of leaves(getMessagesFor(language))) {
      if (typeof value === 'string') assert.ok(value.trim().length > 0, `${language}:${key} is empty`);
      if (typeof value === 'function') {
        // Parameters are counts, text or lists; try each kind until one fits.
        let result;
        for (const sample of [2, 'Sample', ['Sample', 'Other']]) {
          try {
            result = value(...Array.from({ length: value.length }, () => sample));
            break;
          } catch {
            // Try the next kind of argument.
          }
        }
        // Some messages take a record argument the samples cannot fill, so only the
        // return type is checked; the key and arity checks above catch real drift.
        assert.equal(typeof result, 'string', `${language}:${key} must return a string`);
      }
    }
  }
});

test('plural categories follow CLDR for whole counts', () => {
  for (const language of ['en', 'es', 'de', 'it']) {
    assert.equal(pluralCategory(language, 1), 'one');
    assert.equal(pluralCategory(language, 0), 'other');
    assert.equal(pluralCategory(language, 2), 'other');
  }
  for (const language of ['fr', 'pt']) {
    assert.equal(pluralCategory(language, 0), 'one');
    assert.equal(pluralCategory(language, 1), 'one');
    assert.equal(pluralCategory(language, 2), 'other');
  }
});

test('the device language resolves to the first supported one, else English', () => {
  assert.equal(resolveDeviceLanguage([{ languageCode: 'ja' }, { languageCode: 'pt' }]), 'pt');
  assert.equal(resolveDeviceLanguage([{ languageCode: 'ES' }]), 'es');
  assert.equal(resolveDeviceLanguage([{ languageCode: null }]), 'en');
  assert.equal(resolveDeviceLanguage([]), 'en');
});
