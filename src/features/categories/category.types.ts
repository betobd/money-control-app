export const categoryTypes = ['expense', 'income'] as const;
export type CategoryType = (typeof categoryTypes)[number];

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  /**
   * NULL for a category, set for a subcategory. Depth is capped at two levels by
   * database triggers, so a row with a parent never has children of its own.
   */
  parentCategoryId: string | null;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** A category with its subcategories resolved, for hierarchical pickers and lists. */
export type CategoryTree = Category & {
  parentCategoryId: null;
  subcategories: Category[];
};

export type CategoryInput = Pick<Category, 'name' | 'type' | 'icon'> & {
  /** Omit or pass null to create a top-level category. */
  parentCategoryId?: string | null;
};
export type CategoryField = keyof CategoryInput;
export type CategoryValidationErrors = Partial<Record<CategoryField, string>>;

/** True when the category is a subcategory rather than a top-level one. */
export function isSubcategory(category: Pick<Category, 'parentCategoryId'>): boolean {
  return category.parentCategoryId !== null;
}

/**
 * Groups a flat list into parents with their children attached.
 *
 * Subcategories whose parent is absent from the list (for example when the list
 * is filtered to active rows and the parent is archived) are dropped rather than
 * promoted to top level, which would misrepresent the hierarchy.
 */
export function buildCategoryTree(categories: readonly Category[]): CategoryTree[] {
  const roots = new Map<string, CategoryTree>();
  for (const category of categories) {
    if (category.parentCategoryId === null) {
      roots.set(category.id, { ...category, parentCategoryId: null, subcategories: [] });
    }
  }
  for (const category of categories) {
    if (category.parentCategoryId === null) continue;
    roots.get(category.parentCategoryId)?.subcategories.push(category);
  }
  return [...roots.values()];
}
