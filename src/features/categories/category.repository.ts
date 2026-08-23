import type { Category, CategoryType } from './category.types';

export type CategoryUpdate = Pick<Category, 'name' | 'type' | 'icon' | 'updatedAt'> & {
  parentCategoryId: string | null;
};

export interface CategoryRepository {
  /** Archives the category and, in the same database transaction, its subcategories. */
  archiveWithSubcategories(id: string, timestamp: string): Promise<void>;
  create(category: Category): Promise<void>;
  /**
   * Active-name lookup scoped to one parent. `parentCategoryId` NULL searches
   * top-level names; a value searches within that parent, so "Otros" may exist
   * under several parents without colliding.
   */
  findActiveByNormalizedName(
    type: CategoryType,
    parentCategoryId: string | null,
    name: string,
    excludingId?: string,
  ): Promise<Category | null>;
  findById(id: string): Promise<Category | null>;
  /** True when any subcategory (archived or not) points at this category. */
  hasSubcategories(id: string): Promise<boolean>;
  /**
   * True when the category is referenced by any financial record, as either the
   * category or the subcategory of a transaction, recurring rule or occurrence,
   * or as a budget's category.
   */
  hasFinancialReferences(id: string): Promise<boolean>;
  list(type: CategoryType, includeArchived: boolean): Promise<Category[]>;
  listSubcategories(parentCategoryId: string, includeArchived: boolean): Promise<Category[]>;
  permanentlyDelete(id: string): Promise<void>;
  restore(id: string, timestamp: string): Promise<void>;
  seedIfEmpty(categories: Category[]): Promise<boolean>;
  update(id: string, update: CategoryUpdate): Promise<void>;
}
