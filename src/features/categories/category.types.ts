export const categoryTypes = ['expense', 'income'] as const;
export type CategoryType = (typeof categoryTypes)[number];

export type Category = {
  id: string;
  name: string;
  type: CategoryType;
  icon: string;
  isArchived: boolean;
  archivedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CategoryInput = Pick<Category, 'name' | 'type' | 'icon'>;
export type CategoryField = keyof CategoryInput;
export type CategoryValidationErrors = Partial<Record<CategoryField, string>>;
