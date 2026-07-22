import type { CategoryRepository } from '@/features/categories/category.repository';
import type { Category } from '@/features/categories/category.types';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import type { FinancialDataChange } from '@/features/transactions/financial-data-events';
import { isValidBudgetMonth } from './budget-month';
import type { BudgetRepository } from './budget.repository';
import type {
  Budget,
  BudgetInput,
  BudgetMonthView,
  BudgetRecord,
  BudgetSpendingRecord,
  BudgetSummary,
  BudgetValidationErrors,
  BudgetView,
  ProgressWidth,
} from './budget.types';

export class BudgetValidationError extends Error {
  constructor(public readonly fields: BudgetValidationErrors) {
    super('Budget validation failed.');
  }
}

export class BudgetActionError extends Error {
  constructor(
    public readonly code: 'not_found',
    message: string,
  ) {
    super(message);
  }
}

type BudgetServiceOptions = {
  createId?: () => string;
  now?: () => string;
  notifyChanged?: (change: FinancialDataChange) => void;
};

function createFallbackId(): string {
  const randomUUID = globalThis.crypto?.randomUUID;
  if (randomUUID) return randomUUID.call(globalThis.crypto);
  return `budget-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

export function validateBudgetInput(input: BudgetInput): BudgetValidationErrors {
  const errors: BudgetValidationErrors = {};
  if (!input.categoryId.trim()) errors.categoryId = 'Select an expense category.';
  if (!isValidBudgetMonth(input.month)) errors.month = 'Enter a valid month in YYYY-MM format.';
  if (!Number.isSafeInteger(input.limitAmount) || input.limitAmount <= 0) {
    errors.limitAmount = 'Enter a positive whole, safe COP limit.';
  }
  return errors;
}

function ensureSafeMoney(value: number, label: string): number {
  if (!Number.isSafeInteger(value)) throw new Error(`${label} exceeds the supported safe COP range.`);
  return value;
}

function progressWidth(percentageUsed: number): ProgressWidth {
  return `${Math.max(0, Math.min(percentageUsed, 100))}%`;
}

export function calculateBudget(record: BudgetSpendingRecord): BudgetView {
  const limitAmount = ensureSafeMoney(record.limitAmount, 'Budget limit');
  const spent = ensureSafeMoney(record.spent, 'Budget spending');
  const remaining = ensureSafeMoney(limitAmount - spent, 'Budget remaining amount');
  const ratio = spent / limitAmount;
  const percentageUsed = Math.round(ratio * 1000) / 10;
  const status = spent > limitAmount
    ? 'over-budget'
    : spent === limitAmount
      ? 'fully-used'
      : ratio >= 0.8
        ? 'near-limit'
        : 'on-track';
  return {
    ...record,
    remaining,
    percentageUsed,
    progressWidth: progressWidth(percentageUsed),
    status,
  };
}

export function calculateBudgetSummary(budgets: BudgetView[]): BudgetSummary {
  const totalBudget = ensureSafeMoney(
    budgets.reduce((sum, budget) => ensureSafeMoney(sum + budget.limitAmount, 'Total monthly budget'), 0),
    'Total monthly budget',
  );
  const totalSpent = ensureSafeMoney(
    budgets.reduce((sum, budget) => ensureSafeMoney(sum + budget.spent, 'Total budget spending'), 0),
    'Total budget spending',
  );
  const totalRemaining = ensureSafeMoney(totalBudget - totalSpent, 'Total budget remaining amount');
  const percentageUsed = totalBudget === 0 ? 0 : Math.round((totalSpent / totalBudget) * 1000) / 10;
  return {
    totalBudget,
    totalSpent,
    totalRemaining,
    percentageUsed,
    progressWidth: progressWidth(percentageUsed),
  };
}

export class BudgetService {
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly notifyChanged: (change: FinancialDataChange) => void;

  constructor(
    private readonly repository: BudgetRepository,
    private readonly categories: CategoryRepository,
    options: BudgetServiceOptions = {},
  ) {
    this.createId = options.createId ?? createFallbackId;
    this.now = options.now ?? (() => new Date().toISOString());
    this.notifyChanged = options.notifyChanged ?? notifyFinancialDataChanged;
  }

  async listMonth(month: string): Promise<BudgetMonthView> {
    if (!isValidBudgetMonth(month)) {
      throw new BudgetValidationError({ month: 'Enter a valid month in YYYY-MM format.' });
    }
    const budgets = (await this.repository.listMonth(month)).map(calculateBudget);
    return { budgets, summary: calculateBudgetSummary(budgets) };
  }

  async listAll(): Promise<BudgetView[]> {
    return (await this.repository.listAll()).map(calculateBudget);
  }

  get(id: string): Promise<BudgetRecord | null> {
    return this.repository.findById(id);
  }

  async create(input: BudgetInput): Promise<Budget> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    const budget: Budget = {
      id: this.createId(),
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.create(budget);
    this.notifyChanged({ kind: 'budget', operation: 'create', budgetId: budget.id });
    return budget;
  }

  async update(id: string, input: BudgetInput): Promise<void> {
    const current = await this.requireBudget(id);
    const normalized = await this.validate(input, current);
    await this.repository.update(id, { ...normalized, updatedAt: this.now() });
    this.notifyChanged({ kind: 'budget', operation: 'update', budgetId: id });
  }

  async remove(id: string): Promise<void> {
    await this.requireBudget(id);
    await this.repository.remove(id);
    this.notifyChanged({ kind: 'budget', operation: 'remove', budgetId: id });
  }

  private async validate(input: BudgetInput, current?: BudgetRecord): Promise<BudgetInput> {
    const normalized: BudgetInput = {
      categoryId: input.categoryId.trim(),
      month: input.month.trim(),
      limitAmount: input.limitAmount,
    };
    const errors = validateBudgetInput(normalized);
    let category: Category | null = null;
    if (!errors.categoryId) {
      category = await this.categories.findById(normalized.categoryId);
      if (!category) {
        errors.categoryId = 'Select an existing expense category.';
      } else if (category.type !== 'expense') {
        errors.categoryId = 'Select an expense category.';
      } else if (category.isArchived && normalized.categoryId !== current?.categoryId) {
        errors.categoryId = 'Select an active expense category.';
      }
    }
    if (!errors.categoryId && !errors.month) {
      const duplicate = await this.repository.findDuplicate(
        normalized.categoryId,
        normalized.month,
        current?.id,
      );
      if (duplicate) errors.categoryId = 'This category already has a budget for the selected month.';
    }
    if (Object.keys(errors).length > 0) throw new BudgetValidationError(errors);
    return normalized;
  }

  private async requireBudget(id: string): Promise<BudgetRecord> {
    const budget = await this.repository.findById(id);
    if (!budget) throw new BudgetActionError('not_found', 'Budget not found.');
    return budget;
  }
}
