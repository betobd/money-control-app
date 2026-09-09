import type { BudgetStatus, ProgressWidth } from './budget.types';

/**
 * The overall monthly spending ceiling.
 *
 * A row exists only for a month the user actually set (or cleared) a ceiling in.
 * `isActive: false` is the tombstone that stops the carry-forward from that
 * month onward.
 */
export type MonthlyBudget = {
  id: string;
  month: string;
  limitAmount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type MonthlyBudgetInput = {
  month: string;
  limitAmount: number;
};

export type MonthlyBudgetField = keyof MonthlyBudgetInput;
export type MonthlyBudgetValidationErrors = Partial<Record<MonthlyBudgetField, string>>;

/** The ceiling as one month's screen shows it. */
export type MonthlyBudgetView = {
  /** The month being viewed, not necessarily the month the limit was set in. */
  month: string;
  limitAmount: number;
  /** Every posted expense minus refunds this month, in the base currency. */
  spent: number;
  remaining: number;
  percentageUsed: number;
  progressWidth: ProgressWidth;
  status: BudgetStatus;
  /**
   * The earlier month this limit was carried forward from, or `null` when this
   * month sets its own. Shown so an inherited ceiling never looks like one the
   * user typed here.
   */
  inheritedFrom: string | null;
  /**
   * What the category budgets counted for this month add up to. The ceiling is a
   * global cap that includes them, so this is a slice of it, never an addition.
   */
  categoryBudgetTotal: number;
  /**
   * Ceiling not yet claimed by any category budget — the money that would
   * otherwise be spent unwatched. Negative when the category budgets alone
   * already exceed the ceiling.
   */
  unallocated: number;
};
