import { randomUUID } from 'expo-crypto';

import { SQLiteCategoryRepository } from '@/features/categories/sqlite-category.repository';
import { BudgetService } from './budget.service';
import { SQLiteBudgetRepository } from './sqlite-budget.repository';
import { SQLiteBudgetRuleRepository } from './sqlite-budget-rule.repository';
import { SQLiteMonthlyBudgetRepository } from './sqlite-monthly-budget.repository';

export const budgetService = new BudgetService(
  new SQLiteBudgetRepository(),
  new SQLiteCategoryRepository(),
  new SQLiteBudgetRuleRepository(),
  new SQLiteMonthlyBudgetRepository(),
  { createId: randomUUID },
);
