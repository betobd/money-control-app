import type { CategoryTree } from './category.types';

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

/**
 * Filters a category tree by name, keeping the hierarchy intact.
 *
 * A parent that matches keeps all of its subcategories, so searching "Hogar"
 * shows everything inside Hogar. A parent that does not match is kept only when
 * one of its subcategories matches, and then only the matching ones are listed —
 * the parent still has to be shown, because a subcategory is meaningless without
 * the category it belongs to.
 */
export function filterCategoryTree(
  tree: readonly CategoryTree[],
  query: string,
): CategoryTree[] {
  const needle = foldForSearch(query);
  if (!needle) return [...tree];

  const results: CategoryTree[] = [];
  for (const category of tree) {
    if (foldForSearch(category.name).includes(needle)) {
      results.push(category);
      continue;
    }
    const subcategories = category.subcategories.filter(
      (subcategory) => foldForSearch(subcategory.name).includes(needle),
    );
    if (subcategories.length) results.push({ ...category, subcategories });
  }
  return results;
}

/** Total number of selectable nodes in a tree, parents included. */
export function countCategoryNodes(tree: readonly CategoryTree[]): number {
  return tree.reduce((total, category) => total + 1 + category.subcategories.length, 0);
}
