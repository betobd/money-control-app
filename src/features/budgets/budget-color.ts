import { useColorScheme } from 'react-native';

import { budgetSwatches, type BudgetColorKey } from '@/constants/theme';

/**
 * Resolves a stored budget color key to a concrete hex for the active scheme.
 * Falls back to the provided theme color when the budget has no color assigned.
 */
export function resolveBudgetColor(
  color: BudgetColorKey | null,
  scheme: 'light' | 'dark',
  fallback: string,
): string {
  if (!color) return fallback;
  return budgetSwatches[color][scheme];
}

/**
 * Hook returning a scheme-aware resolver: call it with the budget color key and
 * a fallback color from the theme.
 */
export function useBudgetColor() {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return (color: BudgetColorKey | null, fallback: string) => resolveBudgetColor(color, scheme, fallback);
}
