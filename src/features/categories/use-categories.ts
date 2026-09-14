import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { getMessages } from '@/i18n/messages';
import { subscribeToFinancialDataChanges } from '@/features/transactions/financial-data-events';
import { categoryService } from './categories';
import { buildCategoryTree, type Category, type CategoryTree, type CategoryType } from './category.types';

export function useCategories(type: CategoryType, includeArchived = true) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => { setLoading(true); setError(undefined); try { setCategories(await categoryService.list(type, includeArchived)); } catch (cause) { setError(cause instanceof Error ? cause.message : getMessages().categories.loadFailed); } finally { setLoading(false); } }, [includeArchived, type]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  useEffect(() => subscribeToFinancialDataChanges(() => { void reload(); }), [reload]);
  return { categories, loading, error, reload };
}

/**
 * The same categories grouped as parents with their subcategories attached.
 *
 * Pickers need the hierarchy; lists and forms that only care about names keep
 * using {@link useCategories}. Both read through one subscription, so a category
 * change refreshes every consumer at once.
 */
export function useCategoryTree(type: CategoryType, includeArchived = true): {
  tree: CategoryTree[];
  categories: Category[];
  loading: boolean;
  error: string | undefined;
  reload: () => Promise<void>;
} {
  const { categories, loading, error, reload } = useCategories(type, includeArchived);
  return { tree: buildCategoryTree(categories), categories, loading, error, reload };
}
