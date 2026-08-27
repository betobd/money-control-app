import { foldForSearch } from '@/utils/text-search';
import type { CategoryTree } from './category.types';

// Re-exported so existing importers (and their tests) keep one import site.
export { foldForSearch };

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
