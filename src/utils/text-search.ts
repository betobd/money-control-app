/**
 * Text folding shared by every searchable list (categories, currencies).
 */
/**
 * Accent folding for the Latin letters Spanish uses.
 *
 * An explicit table rather than `String.prototype.normalize('NFD')`: the table is
 * a handful of entries, needs no Unicode property escapes, and behaves
 * identically on every JavaScript engine the app runs on. `ñ` folds to `n` on
 * purpose — typing "banos" should still find "Baños".
 */
const foldedLetters: Record<string, string> = {
  á: 'a', à: 'a', ä: 'a', â: 'a', ã: 'a',
  é: 'e', è: 'e', ë: 'e', ê: 'e',
  í: 'i', ì: 'i', ï: 'i', î: 'i',
  ó: 'o', ò: 'o', ö: 'o', ô: 'o', õ: 'o',
  ú: 'u', ù: 'u', ü: 'u', û: 'u',
  ñ: 'n', ç: 'c',
};

/** Lowercases, trims and strips accents so search ignores diacritics. */
export function foldForSearch(value: string): string {
  let folded = '';
  for (const character of value.trim().toLocaleLowerCase('es-CO')) {
    folded += foldedLetters[character] ?? character;
  }
  return folded;
}
