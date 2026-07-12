import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { categoryService } from './categories';
import type { Category, CategoryType } from './category.types';

export function useCategories(type: CategoryType, includeArchived = true) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const reload = useCallback(async () => { setLoading(true); setError(undefined); try { setCategories(await categoryService.list(type, includeArchived)); } catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load categories.'); } finally { setLoading(false); } }, [includeArchived, type]);
  useFocusEffect(useCallback(() => { void reload(); }, [reload]));
  return { categories, loading, error, reload };
}
