import { categoryIconKeys, isCategoryIcon, type CategoryIcon } from './category-icons';
import type { CategoryRepository } from './category.repository';
import { supportedLanguages, type Language } from '@/i18n/languages';
import { getLanguage, getMessages, getMessagesFor, type Messages } from '@/i18n/messages';
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

/** What stands between a category and permanent deletion. */
export type CategoryDeletionBlocker = 'subcategories' | 'history' | null;

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

type DefaultCategoryId = keyof Messages['categories']['defaultNames'];

/**
 * The seeded categories. Ids are stable; names come from the catalog, so the set
 * is seeded in the active language and can follow a language change.
 */
const defaults: { id: DefaultCategoryId; type: CategoryType; icon: CategoryIcon }[] = [
  { id: 'default-expense-food-dining', type: 'expense', icon: 'food' },
  { id: 'default-expense-bills', type: 'expense', icon: 'bills' },
  { id: 'default-expense-transport', type: 'expense', icon: 'transport' },
  { id: 'default-expense-shopping', type: 'expense', icon: 'shopping' },
  { id: 'default-expense-entertainment', type: 'expense', icon: 'entertainment' },
  { id: 'default-expense-health', type: 'expense', icon: 'health' },
  { id: 'default-expense-education', type: 'expense', icon: 'education' },
  { id: 'default-expense-other', type: 'expense', icon: 'other' },
  { id: 'default-income-salary', type: 'income', icon: 'salary' },
  { id: 'default-income-freelance', type: 'income', icon: 'freelance' },
  { id: 'default-income-gift', type: 'income', icon: 'gift' },
  { id: 'default-income-refund', type: 'income', icon: 'refund' },
  { id: 'default-income-investment', type: 'income', icon: 'investment' },
  { id: 'default-income-other', type: 'income', icon: 'other' },
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
    if (!selected) throw new CategoryActionError('not_found', getMessages().categories.errors.notFound);
    return selected.parentCategoryId === null
      ? { categoryId: selected.id, subcategoryId: null }
      : { categoryId: selected.parentCategoryId, subcategoryId: selected.id };
  }

  async seedDefaults(): Promise<boolean> {
    const timestamp = this.now();
    const names = getMessages().categories.defaultNames;
    return this.repository.seedIfEmpty(defaults.map((item) => ({
      ...item,
      name: names[item.id],
      parentCategoryId: null,
      isArchived: false,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    })));
  }

  /**
   * Renames the default categories into `language`, but only those whose name is
   * still a default name in some supported language — so a name the user typed is
   * never touched. Archived defaults are renamed too. A rename that would collide
   * with another active category in the same scope is skipped.
   *
   * Takes the language explicitly because the app calls it before switching the
   * active one.
   */
  async localizeDefaultNames(language: Language = getLanguage()): Promise<void> {
    const target = getMessagesFor(language).categories.defaultNames;
    const byType = new Map<CategoryType, Category[]>();
    for (const type of categoryTypes) byType.set(type, await this.repository.list(type, true));

    for (const { id } of defaults) {
      const current = await this.repository.findById(id);
      if (!current) continue;
      const name = normalizedName(current.name);
      const nextName = target[id];
      if (name === normalizedName(nextName)) continue;
      const isDefaultName = supportedLanguages.some(
        (candidate) => normalizedName(getMessagesFor(candidate).categories.defaultNames[id]) === name,
      );
      if (!isDefaultName) continue;

      // Checked in memory rather than with findActiveByNormalizedName: SQLite's
      // lower() folds only ASCII, so it would miss a clash such as "Éducation".
      const siblings = byType.get(current.type) ?? [];
      const collides = siblings.some((other) => other.id !== id
        && !other.isArchived
        && other.parentCategoryId === current.parentCategoryId
        && normalizedName(other.name) === normalizedName(nextName));
      if (collides) continue;

      await this.repository.update(id, {
        name: nextName,
        type: current.type,
        icon: current.icon,
        parentCategoryId: current.parentCategoryId,
        updatedAt: this.now(),
      });
      const renamed = siblings.find((other) => other.id === id);
      if (renamed) renamed.name = nextName;
    }
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
      throw new CategoryValidationError({ type: getMessages().categories.errors.typeLockedByHistory });
    }
    // Re-parenting after financial use would either falsify closed months (by
    // rewriting past transactions' categoryId) or leave rows whose subcategory no
    // longer belongs to their category. Archive and recreate instead.
    if (current.parentCategoryId !== nextParent && hasHistory) {
      throw new CategoryValidationError({
        parentCategoryId: getMessages().categories.errors.parentLockedByHistory,
      });
    }
    if (nextParent !== null && await this.repository.hasSubcategories(id)) {
      throw new CategoryValidationError({
        parentCategoryId: getMessages().categories.errors.parentHasSubcategories,
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

  /**
   * Active and archived subcategory counts.
   *
   * Archived subcategories still count against re-parenting and permanent
   * deletion, and they are not visible under the category in the active list, so
   * screens need the split to explain *why* an action is unavailable.
   */
  async countSubcategories(id: string): Promise<{ active: number; archived: number }> {
    const all = await this.repository.listSubcategories(id, true);
    const archived = all.filter((item) => item.isArchived).length;
    return { active: all.length - archived, archived };
  }

  /**
   * Why this category cannot be permanently deleted, or null when it can.
   *
   * Returned instead of a bare boolean so the UI can say what is blocking rather
   * than silently hiding the action, which reads as the app being broken.
   */
  async deletionBlocker(id: string): Promise<CategoryDeletionBlocker> {
    if (await this.repository.hasSubcategories(id)) return 'subcategories';
    if (await this.repository.hasFinancialReferences(id)) return 'history';
    return null;
  }

  /** How many active subcategories archiving this category would take with it. */
  async countActiveSubcategories(id: string): Promise<number> {
    return (await this.repository.listSubcategories(id, false)).length;
  }

  async restore(id: string): Promise<void> {
    const category = await this.requireCategory(id);
    if (!category.isArchived) throw new CategoryActionError('not_archived', getMessages().categories.errors.notArchived);
    // Restore deliberately does not cascade: bringing a parent back should not
    // resurrect subcategories that were archived on purpose.
    if (category.parentCategoryId !== null) {
      const parent = await this.repository.findById(category.parentCategoryId);
      if (!parent || parent.isArchived) {
        throw new CategoryActionError('parent_archived', getMessages().categories.errors.restoreParentFirst);
      }
    }
    if (await this.repository.findActiveByNormalizedName(category.type, category.parentCategoryId, normalizedName(category.name), id)) {
      const { errors } = getMessages().categories;
      throw new CategoryActionError('restore_conflict', category.parentCategoryId === null
        ? errors.restoreConflict
        : errors.restoreSubcategoryConflict);
    }
    await this.repository.restore(id, this.now());
  }

  async canPermanentlyDelete(id: string): Promise<boolean> {
    return (await this.deletionBlocker(id)) === null;
  }

  async permanentlyDelete(id: string): Promise<void> {
    await this.requireCategory(id);
    if (await this.repository.hasSubcategories(id)) {
      throw new CategoryActionError('has_subcategories', getMessages().categories.errors.deleteHasSubcategories);
    }
    if (await this.repository.hasFinancialReferences(id)) throw new CategoryActionError('has_history', getMessages().categories.errors.deleteHasHistory);
    await this.repository.permanentlyDelete(id);
  }

  private async requireCategory(id: string): Promise<Category> { const value = await this.repository.findById(id); if (!value) throw new CategoryActionError('not_found', getMessages().categories.errors.notFound); return value; }

  private async validate(input: CategoryInput, excludingId?: string, archived = false): Promise<CategoryInput & { parentCategoryId: string | null }> {
    const value = { ...input, name: input.name.trim(), parentCategoryId: input.parentCategoryId ?? null };
    const messages = getMessages().categories.errors;
    const errors: CategoryValidationErrors = {};
    if (!value.name) errors.name = messages.nameRequired;
    if (!categoryTypes.includes(value.type)) errors.type = messages.typeRequired;
    // The catalog is over a hundred entries, so the message names the count
    // rather than listing every key at the user.
    if (!isCategoryIcon(value.icon)) errors.icon = messages.iconRequired(categoryIconKeys.length);

    if (value.parentCategoryId !== null) {
      const parent = value.parentCategoryId === excludingId
        ? null
        : await this.repository.findById(value.parentCategoryId);
      if (!parent) {
        errors.parentCategoryId = messages.parentMissing;
      } else if (parent.parentCategoryId !== null) {
        errors.parentCategoryId = messages.parentTooDeep;
      } else if (parent.isArchived) {
        errors.parentCategoryId = messages.parentArchived;
      } else if (parent.type !== value.type) {
        errors.parentCategoryId = messages.parentTypeMismatch;
      }
    }

    if (!errors.name && !errors.type && !errors.parentCategoryId && !archived
      && await this.repository.findActiveByNormalizedName(value.type, value.parentCategoryId, normalizedName(value.name), excludingId)) {
      errors.name = value.parentCategoryId === null
        ? messages.duplicateName
        : messages.duplicateSubcategoryName;
    }
    if (Object.keys(errors).length) throw new CategoryValidationError(errors);
    return value;
  }
}
