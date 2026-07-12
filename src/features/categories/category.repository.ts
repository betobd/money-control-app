import type { Category, CategoryType } from './category.types';

export type CategoryUpdate = Pick<Category, 'name' | 'type' | 'icon' | 'updatedAt'>;

export interface CategoryRepository {
  archive(id: string, timestamp: string): Promise<void>;
  create(category: Category): Promise<void>;
  findActiveByNormalizedName(type: CategoryType, name: string, excludingId?: string): Promise<Category | null>;
  findById(id: string): Promise<Category | null>;
  hasFinancialReferences(id: string): Promise<boolean>;
  list(type: CategoryType, includeArchived: boolean): Promise<Category[]>;
  permanentlyDelete(id: string): Promise<void>;
  restore(id: string, timestamp: string): Promise<void>;
  seedIfEmpty(categories: Category[]): Promise<boolean>;
  update(id: string, update: CategoryUpdate): Promise<void>;
}
