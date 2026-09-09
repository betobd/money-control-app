import { and, asc, desc, eq, gt, lte, sql } from 'drizzle-orm';

import { database } from '@/database/client';
import { monthlyBudgets, transactions } from '@/database/schema';
import { nextBudgetMonth } from './budget-month';
import type { MonthlyBudgetRepository } from './monthly-budget.repository';
import type { MonthlyBudget } from './monthly-budget.types';

export class SQLiteMonthlyBudgetRepository implements MonthlyBudgetRepository {
  async findEffective(month: string): Promise<MonthlyBudget | null> {
    const [row] = await database
      .select()
      .from(monthlyBudgets)
      .where(lte(monthlyBudgets.month, month))
      .orderBy(desc(monthlyBudgets.month))
      .limit(1);
    return row ?? null;
  }

  async upsert(budget: MonthlyBudget): Promise<void> {
    await database
      .insert(monthlyBudgets)
      .values(budget)
      .onConflictDoUpdate({
        target: monthlyBudgets.month,
        set: {
          limitAmount: budget.limitAmount,
          isActive: budget.isActive,
          updatedAt: budget.updatedAt,
        },
      });
  }

  async deleteAfter(month: string): Promise<void> {
    await database.delete(monthlyBudgets).where(gt(monthlyBudgets.month, month));
  }

  async listAll(): Promise<MonthlyBudget[]> {
    return database.select().from(monthlyBudgets).orderBy(asc(monthlyBudgets.month));
  }

  /**
   * Every posted expense minus every posted refund, with no category filter.
   *
   * The ceiling is a global cap, so unlike a category budget this counts spending
   * that no budget watches. Transfers stay excluded — they move money rather than
   * spend it — and each row contributes its frozen base-currency snapshot, never
   * a value converted at today's rate.
   */
  async spendingFor(month: string): Promise<number> {
    const start = `${month}-01`;
    const next = `${nextBudgetMonth(month)}-01`;
    const [row] = await database
      .select({
        spent: sql<number>`coalesce(sum(
          case
            when ${transactions.type} = 'expense' then coalesce(${transactions.baseAmountMinor}, ${transactions.amount})
            when ${transactions.type} = 'refund' then -coalesce(${transactions.baseAmountMinor}, ${transactions.amount})
            else 0
          end
        ), 0)`,
      })
      .from(transactions)
      .where(and(
        eq(transactions.status, 'posted'),
        sql`${transactions.transactionDate} >= ${start}`,
        sql`${transactions.transactionDate} < ${next}`,
      ));
    return Number(row?.spent ?? 0);
  }
}
