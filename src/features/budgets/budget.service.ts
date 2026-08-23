import { budgetColorKeys } from '@/constants/theme';
import type { CategoryRepository } from '@/features/categories/category.repository';
import type { Category } from '@/features/categories/category.types';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import type { FinancialDataChange } from '@/features/transactions/financial-data-events';
import { isValidBudgetMonth } from './budget-month';
import type { BudgetRepository } from './budget.repository';
import type { BudgetRuleRepository } from './budget-rule.repository';
import type { BudgetRule } from './budget-rule.types';
import type {
  Budget,
  BudgetGroup,
  BudgetInput,
  BudgetMonthView,
  BudgetRecord,
  BudgetSpendingRecord,
  BudgetSummary,
  BudgetValidationErrors,
  BudgetView,
  ProgressWidth,
} from './budget.types';

export type BudgetEditModel = BudgetRecord & { isRecurring: boolean };

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
  if (input.color != null && !budgetColorKeys.includes(input.color)) {
    errors.color = 'Select a valid budget color.';
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

export function calculateBudget(record: BudgetSpendingRecord, isRecurring = false): BudgetView {
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
    isRecurring,
  };
}

/**
 * True when this budget is a sub-limit inside another budget in the same set.
 *
 * A budget on a parent already covers its whole subtree, so a budget on one of
 * its subcategories describes a slice of money the parent has already counted.
 */
function isNestedSubLimit(budget: BudgetView, budgetedCategoryIds: ReadonlySet<string>): boolean {
  return budget.categoryParentId !== null && budgetedCategoryIds.has(budget.categoryParentId);
}

/**
 * Month totals over the budgets that describe distinct money.
 *
 * Both the limit and the spending of a nested sub-limit are excluded: they are
 * already inside their parent's figures, and counting them twice would inflate
 * the total and make `percentageUsed` meaningless. Sub-limits stay fully visible
 * on screen — they are shown once as their own limit and once inside the
 * parent's, but they are counted once here.
 */
export function calculateBudgetSummary(budgets: BudgetView[]): BudgetSummary {
  const budgetedCategoryIds = new Set(budgets.map((budget) => budget.categoryId));
  const counted = budgets.filter((budget) => !isNestedSubLimit(budget, budgetedCategoryIds));
  const totalBudget = ensureSafeMoney(
    counted.reduce((sum, budget) => ensureSafeMoney(sum + budget.limitAmount, 'Total monthly budget'), 0),
    'Total monthly budget',
  );
  const totalSpent = ensureSafeMoney(
    counted.reduce((sum, budget) => ensureSafeMoney(sum + budget.spent, 'Total budget spending'), 0),
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
    nestedCount: budgets.length - counted.length,
  };
}

/**
 * Groups budgets for display: top-level budgets with their sub-limits inside.
 *
 * A subcategory budget whose parent is **not** budgeted this month is not nested
 * anywhere — it is a budget in its own right and stays at the top level, which is
 * also how the summary counts it.
 */
export function groupBudgets(budgets: readonly BudgetView[]): BudgetGroup[] {
  const budgetedCategoryIds = new Set(budgets.map((budget) => budget.categoryId));
  const children = new Map<string, BudgetView[]>();
  for (const budget of budgets) {
    if (!isNestedSubLimit(budget, budgetedCategoryIds)) continue;
    const parentId = budget.categoryParentId!;
    children.set(parentId, [...(children.get(parentId) ?? []), budget]);
  }
  return budgets
    .filter((budget) => !isNestedSubLimit(budget, budgetedCategoryIds))
    .map((budget) => ({ budget, children: children.get(budget.categoryId) ?? [] }));
}

export class BudgetService {
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly notifyChanged: (change: FinancialDataChange) => void;

  constructor(
    private readonly repository: BudgetRepository,
    private readonly categories: CategoryRepository,
    private readonly rules: BudgetRuleRepository,
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
    const rules = await this.rules.listActiveForMonth(month);
    await this.materialize(month, rules);
    const recurringCategories = new Set(rules.map((rule) => rule.categoryId));
    const budgets = (await this.repository.listMonth(month)).map((record) =>
      calculateBudget(record, recurringCategories.has(record.categoryId)),
    );
    return { budgets, summary: calculateBudgetSummary(budgets) };
  }

  async listAll(): Promise<BudgetView[]> {
    return (await this.repository.listAll()).map((record) => calculateBudget(record, record.ruleId !== null));
  }

  get(id: string): Promise<BudgetRecord | null> {
    return this.repository.findById(id);
  }

  async getEditModel(id: string): Promise<BudgetEditModel | null> {
    const budget = await this.repository.findById(id);
    if (!budget) return null;
    let isRecurring = false;
    if (budget.ruleId) {
      const rule = await this.rules.findById(budget.ruleId);
      isRecurring = rule?.isActive ?? false;
    }
    return { ...budget, isRecurring };
  }

  async create(input: BudgetInput, options: { recurring?: boolean } = {}): Promise<Budget> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    let ruleId: string | null = null;
    if (options.recurring) {
      const existing = await this.rules.findActiveByCategory(normalized.categoryId);
      if (existing) throw new BudgetValidationError({ categoryId: 'This category already has a recurring budget.' });
      const rule = this.buildRule(normalized, normalized.month, timestamp);
      await this.rules.create(rule);
      ruleId = rule.id;
    }
    const budget: Budget = {
      id: this.createId(),
      ...normalized,
      ruleId,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.create(budget);
    this.notifyChanged({ kind: 'budget', operation: 'create', budgetId: budget.id });
    return budget;
  }

  async update(id: string, input: BudgetInput, options: { recurring?: boolean } = {}): Promise<void> {
    const current = await this.requireBudget(id);
    const normalized = await this.validate(input, current);
    const timestamp = this.now();
    const activeRule = await this.resolveActiveRule(current);
    const recurring = options.recurring ?? activeRule !== null;

    if (!recurring) {
      // One-off going forward: stop any recurrence and unlink this instance.
      if (activeRule) await this.rules.deactivate(activeRule.id, timestamp);
      await this.repository.update(id, { ...normalized, updatedAt: timestamp, ruleId: null });
    } else if (activeRule) {
      // Stays recurring — apply the new limit/color to this month and every future month.
      await this.rules.update(activeRule.id, { limitAmount: normalized.limitAmount, color: normalized.color, updatedAt: timestamp });
      await this.repository.update(id, { ...normalized, updatedAt: timestamp, ruleId: activeRule.id });
      await this.repository.updateForRuleFromMonth(activeRule.id, current.month, {
        limitAmount: normalized.limitAmount,
        color: normalized.color,
        updatedAt: timestamp,
      });
    } else {
      // Turning a one-off into a recurring budget from this month onward.
      const rule = this.buildRule(normalized, current.month, timestamp);
      await this.rules.create(rule);
      await this.repository.update(id, { ...normalized, updatedAt: timestamp, ruleId: rule.id });
    }
    this.notifyChanged({ kind: 'budget', operation: 'update', budgetId: id });
  }

  async remove(id: string): Promise<void> {
    const current = await this.requireBudget(id);
    const activeRule = await this.resolveActiveRule(current);
    if (activeRule) {
      // Removing a recurring budget stops the plan and drops this month + future months.
      await this.rules.deactivate(activeRule.id, this.now());
      await this.repository.deleteForRuleFromMonth(activeRule.id, current.month);
    } else {
      await this.repository.remove(id);
    }
    this.notifyChanged({ kind: 'budget', operation: 'remove', budgetId: id });
  }

  private async materialize(month: string, rules: BudgetRule[]): Promise<void> {
    for (const rule of rules) {
      const timestamp = this.now();
      await this.repository.materialize({
        id: this.createId(),
        categoryId: rule.categoryId,
        month,
        limitAmount: rule.limitAmount,
        color: rule.color,
        ruleId: rule.id,
        createdAt: timestamp,
        updatedAt: timestamp,
      });
    }
  }

  private async resolveActiveRule(current: BudgetRecord): Promise<BudgetRule | null> {
    if (current.ruleId) {
      const rule = await this.rules.findById(current.ruleId);
      if (rule?.isActive) return rule;
    }
    const active = await this.rules.findActiveByCategory(current.categoryId);
    return active && active.startMonth <= current.month ? active : null;
  }

  private buildRule(input: BudgetInput, startMonth: string, timestamp: string): BudgetRule {
    return {
      id: this.createId(),
      categoryId: input.categoryId,
      limitAmount: input.limitAmount,
      color: input.color,
      startMonth,
      isActive: true,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
  }

  private async validate(input: BudgetInput, current?: BudgetRecord): Promise<BudgetInput> {
    const normalized: BudgetInput = {
      categoryId: input.categoryId.trim(),
      month: input.month.trim(),
      limitAmount: input.limitAmount,
      color: input.color ?? null,
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
