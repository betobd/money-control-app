import { randomUUID } from 'expo-crypto';

import { SQLiteCategoryRepository } from '@/features/categories/sqlite-category.repository';
import { BudgetService } from './budget.service';
import { SQLiteBudgetRepository } from './sqlite-budget.repository';

export const budgetService = new BudgetService(
  new SQLiteBudgetRepository(),
  new SQLiteCategoryRepository(),
  { createId: randomUUID },
);
