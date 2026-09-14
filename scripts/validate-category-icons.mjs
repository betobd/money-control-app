#!/usr/bin/env node
/**
 * Validates the category icon catalog against what each platform can render.
 *
 * TypeScript already rejects an icon name that does not exist on either platform:
 * `expo-symbols` types iOS names as `SFSymbol` and Android names as `AndroidSymbol`.
 * What the type cannot catch is *availability*: `SFSymbol` includes every symbol up
 * to the newest SF Symbols release, but the app ships to iOS 16.4, which only has
 * SF Symbols 4.x. A newer symbol type-checks and then renders blank on older
 * iPhones. This script is the check for that.
 *
 *   node scripts/validate-category-icons.mjs
 *
 * Exits 1 when any icon is unavailable on the minimum iOS version, missing on
 * Android, or shares a key with another.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(join(root, 'package.json'));

/**
 * SF Symbols release shipped with the app's minimum iOS (16.4, from the
 * expo-modules-core podspec). Raise it together with the deployment target.
 */
const MAX_SF_SYMBOLS_VERSION = [4, 2];

function sfSymbolVersions() {
  const source = readFileSync(join(root, 'node_modules/sf-symbols-typescript/dist/index.d.ts'), 'utf8');
  const versions = new Map();
  let current = null;
  for (const line of source.split('\n')) {
    const header = line.match(/^export type SFSymbols(\d+)_(\d+) =/);
    if (header) {
      current = [Number(header[1]), Number(header[2])];
      continue;
    }
    const name = line.match(/^\s*\|\s*'([^']+)'/);
    if (name && current && !versions.has(name[1])) versions.set(name[1], current);
    if (/^export type SFSymbol\b/.test(line)) current = null;
  }
  return versions;
}

function androidSymbols() {
  const file = join(dirname(require.resolve('expo-symbols')), 'android', 'symbols.json');
  return new Set(Object.keys(JSON.parse(readFileSync(file, 'utf8'))));
}

function catalogEntries() {
  const source = readFileSync(join(root, 'src/features/categories/category-icons.ts'), 'utf8');
  const entries = [];
  const pattern = /^\s*'?([a-z0-9-]+)'?: \{ group: '([^']*)'.*?ios: '([^']+)', android: '([^']+)'/gm;
  for (const match of source.matchAll(pattern)) {
    entries.push({ key: match[1], group: match[2], ios: match[3], android: match[4] });
  }
  return entries;
}

const newer = ([major, minor], [maxMajor, maxMinor]) => major > maxMajor || (major === maxMajor && minor > maxMinor);

const sf = sfSymbolVersions();
const android = androidSymbols();
const entries = catalogEntries();
const problems = [];
// A catalog format change that the pattern no longer matches must fail, not pass vacuously.
if (entries.length === 0) problems.push('no icons parsed from category-icons.ts; update the pattern in catalogEntries()');
const seen = new Set();

for (const entry of entries) {
  if (seen.has(entry.key)) problems.push(`${entry.key}: duplicate key`);
  seen.add(entry.key);
  const version = sf.get(entry.ios);
  if (!version) problems.push(`${entry.key}: iOS symbol "${entry.ios}" does not exist`);
  else if (newer(version, MAX_SF_SYMBOLS_VERSION)) {
    problems.push(`${entry.key}: iOS symbol "${entry.ios}" needs SF Symbols ${version.join('.')}, newer than iOS 16.4 supports`);
  }
  if (!android.has(entry.android)) problems.push(`${entry.key}: Android symbol "${entry.android}" does not exist`);
}

console.log(`${entries.length} category icons checked against ${sf.size} SF Symbols and ${android.size} Material Symbols.`);
if (problems.length) {
  console.error(problems.map((problem) => `  - ${problem}`).join('\n'));
  process.exit(1);
}
console.log('All icons render on iOS 16.4+ and Android.');
