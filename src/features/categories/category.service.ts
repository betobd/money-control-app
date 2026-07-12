import { categoryIconKeys, isCategoryIcon, type CategoryIcon } from './category-icons';
import type { CategoryRepository } from './category.repository';
import { categoryTypes, type Category, type CategoryInput, type CategoryType, type CategoryValidationErrors } from './category.types';

export class CategoryValidationError extends Error {
  constructor(public readonly fields: CategoryValidationErrors) { super('Category validation failed.'); }
}

export class CategoryActionError extends Error {
  constructor(public readonly code: 'not_found' | 'not_archived' | 'restore_conflict' | 'has_history', message: string) {
    super(message);
  }
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
  { id: 'default-income-other', name: 'Other', type: 'income', icon: 'other' },
];

function normalizedName(name: string): string { return name.trim().toLocaleLowerCase('es-CO'); }

export class CategoryService {
  constructor(private readonly repository: CategoryRepository, private readonly createId: () => string, private readonly now = () => new Date().toISOString()) {}

  list(type: CategoryType, includeArchived: boolean): Promise<Category[]> { return this.repository.list(type, includeArchived); }
  get(id: string): Promise<Category | null> { return this.repository.findById(id); }
  listSelectable(type: CategoryType): Promise<Category[]> { return this.repository.list(type, false); }

  async seedDefaults(): Promise<boolean> {
    const timestamp = this.now();
    return this.repository.seedIfEmpty(defaults.map((item) => ({ ...item, isArchived: false, archivedAt: null, createdAt: timestamp, updatedAt: timestamp })));
  }

  async create(input: CategoryInput): Promise<Category> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    const category: Category = { id: this.createId(), ...normalized, isArchived: false, archivedAt: null, createdAt: timestamp, updatedAt: timestamp };
    await this.repository.create(category);
    return category;
  }

  async update(id: string, input: CategoryInput): Promise<void> {
    const current = await this.requireCategory(id);
    if (current.type !== input.type && await this.repository.hasFinancialReferences(id)) {
      throw new CategoryValidationError({ type: 'Category type cannot change after financial use.' });
    }
    const normalized = await this.validate(input, id, current.isArchived);
    await this.repository.update(id, { ...normalized, updatedAt: this.now() });
  }

  async archive(id: string): Promise<void> { const category = await this.requireCategory(id); if (!category.isArchived) await this.repository.archive(id, this.now()); }

  async restore(id: string): Promise<void> {
    const category = await this.requireCategory(id);
    if (!category.isArchived) throw new CategoryActionError('not_archived', 'Only archived categories can be restored.');
    if (await this.repository.findActiveByNormalizedName(category.type, normalizedName(category.name), id)) {
      throw new CategoryActionError('restore_conflict', 'An active category of this type already uses this name. Rename the archived category before restoring it.');
    }
    await this.repository.restore(id, this.now());
  }

  async canPermanentlyDelete(id: string): Promise<boolean> { return !(await this.repository.hasFinancialReferences(id)); }
  async permanentlyDelete(id: string): Promise<void> {
    await this.requireCategory(id);
    if (await this.repository.hasFinancialReferences(id)) throw new CategoryActionError('has_history', 'Categories with financial history cannot be permanently deleted.');
    await this.repository.permanentlyDelete(id);
  }

  private async requireCategory(id: string): Promise<Category> { const value = await this.repository.findById(id); if (!value) throw new CategoryActionError('not_found', 'Category not found.'); return value; }
  private async validate(input: CategoryInput, excludingId?: string, archived = false): Promise<CategoryInput> {
    const value = { ...input, name: input.name.trim() };
    const errors: CategoryValidationErrors = {};
    if (!value.name) errors.name = 'Enter a category name.';
    if (!categoryTypes.includes(value.type)) errors.type = 'Select expense or income.';
    if (!isCategoryIcon(value.icon)) errors.icon = `Select a supported icon (${categoryIconKeys.join(', ')}).`;
    if (!errors.name && !errors.type && !archived && await this.repository.findActiveByNormalizedName(value.type, normalizedName(value.name), excludingId)) errors.name = 'An active category of this type already uses this name.';
    if (Object.keys(errors).length) throw new CategoryValidationError(errors);
    return value;
  }
}
