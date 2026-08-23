import { categoryIconKeys, isCategoryIcon, type CategoryIcon } from './category-icons';
import type { CategoryRepository } from './category.repository';
import {
  buildCategoryTree,
  categoryTypes,
  type Category,
  type CategoryInput,
  type CategoryTree,
  type CategoryType,
  type CategoryValidationErrors,
} from './category.types';

export class CategoryValidationError extends Error {
  /** See the note on TransactionValidationError's brand. */
  readonly isCategoryValidationError = true;

  constructor(public readonly fields: CategoryValidationErrors) { super('Category validation failed.'); }
}

/** Identity-independent check for {@link CategoryValidationError}. */
export function isCategoryValidationError(value: unknown): value is CategoryValidationError {
  return value instanceof Error && (value as CategoryValidationError).isCategoryValidationError === true;
}

export type CategoryActionErrorCode =
  | 'not_found'
  | 'not_archived'
  | 'restore_conflict'
  | 'has_history'
  | 'has_subcategories'
  | 'parent_archived';

export class CategoryActionError extends Error {
  /** See the note on TransactionValidationError's brand. */
  readonly isCategoryActionError = true;

  constructor(public readonly code: CategoryActionErrorCode, message: string) {
    super(message);
  }
}

/** Identity-independent check for {@link CategoryActionError}. */
export function isCategoryActionError(value: unknown): value is CategoryActionError {
  return value instanceof Error && (value as CategoryActionError).isCategoryActionError === true;
}

const defaults: { id: string; name: string; type: CategoryType; icon: CategoryIcon }[] = [
  { id: 'default-expense-food-dining', name: 'Food & Dining', type: 'expense', icon: 'food' },
  { id: 'default-expense-bills', name: 'Bills', type: 'expense', icon: 'bills' },
  { id: 'default-expense-transport', name: 'Transport', type: 'expense', icon: 'transport' },
  { id: 'default-expense-shopping', name: 'Shopping', type: 'expense', icon: 'shopping' },
  { id: 'default-expense-entertainment', name: 'Entertainment', type: 'expense', icon: 'entertainment' },
  { id: 'default-expense-health', name: 'Health', type: 'expense', icon: 'health' },
  { id: 'default-expense-education', name: 'Education', type: 'expense', icon: 'education' },
  { id: 'default-expense-other', name: 'Other', type: 'expense', icon: 'other' },
  { id: 'default-income-salary', name: 'Salary', type: 'income', icon: 'salary' },
  { id: 'default-income-freelance', name: 'Freelance', type: 'income', icon: 'freelance' },
  { id: 'default-income-gift', name: 'Gift', type: 'income', icon: 'gift' },
  { id: 'default-income-refund', name: 'Refund', type: 'income', icon: 'refund' },
  { id: 'default-income-investment', name: 'Investment Income', type: 'income', icon: 'investment' },
  { id: 'default-income-other', name: 'Other', type: 'income', icon: 'other' },
];

function normalizedName(name: string): string { return name.trim().toLocaleLowerCase('es-CO'); }

export class CategoryService {
  constructor(private readonly repository: CategoryRepository, private readonly createId: () => string, private readonly now = () => new Date().toISOString()) {}

  list(type: CategoryType, includeArchived: boolean): Promise<Category[]> { return this.repository.list(type, includeArchived); }
  get(id: string): Promise<Category | null> { return this.repository.findById(id); }
  listSelectable(type: CategoryType): Promise<Category[]> { return this.repository.list(type, false); }
  listSubcategories(parentCategoryId: string, includeArchived = false): Promise<Category[]> {
    return this.repository.listSubcategories(parentCategoryId, includeArchived);
  }

  /** Parents with their subcategories attached, for hierarchical pickers. */
  async listTree(type: CategoryType, includeArchived = false): Promise<CategoryTree[]> {
    return buildCategoryTree(await this.repository.list(type, includeArchived));
  }

  /**
   * Resolves a chosen node into the (category, subcategory) pair a transaction
   * stores. Selecting a subcategory infers its parent, so no caller has to pick
   * both — and none can produce a mismatched pair such as Transporte + Mercado.
   */
  async resolveSelection(selectedId: string): Promise<{ categoryId: string; subcategoryId: string | null }> {
    const selected = await this.repository.findById(selectedId);
    if (!selected) throw new CategoryActionError('not_found', 'Category not found.');
    return selected.parentCategoryId === null
      ? { categoryId: selected.id, subcategoryId: null }
      : { categoryId: selected.parentCategoryId, subcategoryId: selected.id };
  }

  async seedDefaults(): Promise<boolean> {
    const timestamp = this.now();
    return this.repository.seedIfEmpty(defaults.map((item) => ({
      ...item,
      parentCategoryId: null,
      isArchived: false,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })));
  }

  async create(input: CategoryInput): Promise<Category> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    const category: Category = {
      id: this.createId(),
      ...normalized,
      parentCategoryId: normalized.parentCategoryId ?? null,
      isArchived: false,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.create(category);
    return category;
  }

  async update(id: string, input: CategoryInput): Promise<void> {
    const current = await this.requireCategory(id);
    const nextParent = input.parentCategoryId ?? null;
    const hasHistory = await this.repository.hasFinancialReferences(id);

    if (current.type !== input.type && hasHistory) {
      throw new CategoryValidationError({ type: 'Category type cannot change after financial use.' });
    }
    // Re-parenting after financial use would either falsify closed months (by
    // rewriting past transactions' categoryId) or leave rows whose subcategory no
    // longer belongs to their category. Archive and recreate instead.
    if (current.parentCategoryId !== nextParent && hasHistory) {
      throw new CategoryValidationError({
        parentCategoryId: 'A category cannot move after financial use. Archive it and create a new one instead.',
      });
    }
    if (nextParent !== null && await this.repository.hasSubcategories(id)) {
      throw new CategoryValidationError({
        parentCategoryId: 'A category with subcategories cannot become a subcategory.',
      });
    }

    const normalized = await this.validate(input, id, current.isArchived);
    await this.repository.update(id, {
      name: normalized.name,
      type: normalized.type,
      icon: normalized.icon,
      parentCategoryId: nextParent,
      updatedAt: this.now(),
    });
  }

  /** Archives the category and any subcategories it has, in one transaction. */
  async archive(id: string): Promise<void> {
    const category = await this.requireCategory(id);
    if (!category.isArchived) await this.repository.archiveWithSubcategories(id, this.now());
  }

  /**
   * Whether any transaction, recurring rule, occurrence or budget references this
   * category, at either level. The form uses it to lock the parent field before
   * the user edits it, rather than rejecting the move only on save.
   */
  hasFinancialHistory(id: string): Promise<boolean> {
    return this.repository.hasFinancialReferences(id);
  }

  /** True when this category has subcategories, so it cannot become one itself. */
  hasSubcategories(id: string): Promise<boolean> {
    return this.repository.hasSubcategories(id);
  }

  /** How many active subcategories archiving this category would take with it. */
  async countActiveSubcategories(id: string): Promise<number> {
    return (await this.repository.listSubcategories(id, false)).length;
  }

  async restore(id: string): Promise<void> {
    const category = await this.requireCategory(id);
    if (!category.isArchived) throw new CategoryActionError('not_archived', 'Only archived categories can be restored.');
    // Restore deliberately does not cascade: bringing a parent back should not
    // resurrect subcategories that were archived on purpose.
    if (category.parentCategoryId !== null) {
      const parent = await this.repository.findById(category.parentCategoryId);
      if (!parent || parent.isArchived) {
        throw new CategoryActionError('parent_archived', 'Restore the parent category before restoring this subcategory.');
      }
    }
    if (await this.repository.findActiveByNormalizedName(category.type, category.parentCategoryId, normalizedName(category.name), id)) {
      throw new CategoryActionError('restore_conflict', category.parentCategoryId === null
        ? 'An active category of this type already uses this name. Rename the archived category before restoring it.'
        : 'An active subcategory of this parent already uses this name. Rename the archived subcategory before restoring it.');
    }
    await this.repository.restore(id, this.now());
  }

  async canPermanentlyDelete(id: string): Promise<boolean> {
    if (await this.repository.hasSubcategories(id)) return false;
    return !(await this.repository.hasFinancialReferences(id));
  }

  async permanentlyDelete(id: string): Promise<void> {
    await this.requireCategory(id);
    if (await this.repository.hasSubcategories(id)) {
      throw new CategoryActionError('has_subcategories', 'Remove or archive the subcategories before deleting this category.');
    }
    if (await this.repository.hasFinancialReferences(id)) throw new CategoryActionError('has_history', 'Categories with financial history cannot be permanently deleted.');
    await this.repository.permanentlyDelete(id);
  }

  private async requireCategory(id: string): Promise<Category> { const value = await this.repository.findById(id); if (!value) throw new CategoryActionError('not_found', 'Category not found.'); return value; }

  private async validate(input: CategoryInput, excludingId?: string, archived = false): Promise<CategoryInput & { parentCategoryId: string | null }> {
    const value = { ...input, name: input.name.trim(), parentCategoryId: input.parentCategoryId ?? null };
    const errors: CategoryValidationErrors = {};
    if (!value.name) errors.name = 'Enter a category name.';
    if (!categoryTypes.includes(value.type)) errors.type = 'Select expense or income.';
    if (!isCategoryIcon(value.icon)) errors.icon = `Select a supported icon (${categoryIconKeys.join(', ')}).`;

    if (value.parentCategoryId !== null) {
      const parent = value.parentCategoryId === excludingId
        ? null
        : await this.repository.findById(value.parentCategoryId);
      if (!parent) {
        errors.parentCategoryId = 'Select an existing parent category.';
      } else if (parent.parentCategoryId !== null) {
        errors.parentCategoryId = 'Subcategories cannot be nested further than two levels.';
      } else if (parent.isArchived) {
        errors.parentCategoryId = 'Select an active parent category.';
      } else if (parent.type !== value.type) {
        errors.parentCategoryId = 'A subcategory must have the same type as its parent.';
      }
    }

    if (!errors.name && !errors.type && !errors.parentCategoryId && !archived
      && await this.repository.findActiveByNormalizedName(value.type, value.parentCategoryId, normalizedName(value.name), excludingId)) {
      errors.name = value.parentCategoryId === null
        ? 'An active category of this type already uses this name.'
        : 'This parent already has an active subcategory with this name.';
    }
    if (Object.keys(errors).length) throw new CategoryValidationError(errors);
    return value;
  }
}
