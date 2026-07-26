import { and, desc, eq, or, sql } from 'drizzle-orm';

import { database } from '@/database/client';
import { accounts, investmentAccounts, investmentValuations, transactions } from '@/database/schema';
import type { Account } from '@/features/accounts/account.types';
import type { CurrencyCode } from '@/features/currency/currency';
import type {
  InvestmentAccountUpdate,
  InvestmentMetadataUpdate,
  InvestmentRepository,
  NewValuationRecord,
  ValuationUpdate,
} from './investment.repository';
import type {
  InvestmentAccountMetadata,
  InvestmentContributionSummary,
  InvestmentLiquidity,
  InvestmentTrackingMode,
  InvestmentType,
  InvestmentValuation,
} from './investment.types';

type MetadataRow = typeof investmentAccounts.$inferSelect;
type ValuationRow = typeof investmentValuations.$inferSelect;

function mapMetadata(row: MetadataRow): InvestmentAccountMetadata {
  return {
    accountId: row.accountId,
    investmentType: row.investmentType as InvestmentType,
    trackingMode: row.trackingMode as InvestmentTrackingMode,
    liquidity: row.liquidity as InvestmentLiquidity,
    providerName: row.providerName,
    startDate: row.startDate,
    maturityDate: row.maturityDate,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapValuation(row: ValuationRow): InvestmentValuation {
  return {
    id: row.id,
    investmentAccountId: row.investmentAccountId,
    valueMinor: row.valueMinor,
    basisMinor: row.basisMinor,
    currencyCode: row.currencyCode as CurrencyCode,
    valuationDate: row.valuationDate,
    note: row.note,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

// Gross contributions/withdrawals split out of the posted ledger, native currency.
// netContributions = totalContributions - totalWithdrawals equals the account's
// derived balance (see docs/investments.md); this only separates in from out.
const totalContributionsExpr = sql<number>`
  ${accounts.openingBalance} + coalesce(sum(
    case
      when ${transactions.status} <> 'posted' then 0
      when ${transactions.type} = 'income' and ${transactions.accountId} = ${accounts.id} then ${transactions.amount}
      when ${transactions.type} = 'refund' and ${transactions.accountId} = ${accounts.id} then ${transactions.amount}
      when ${transactions.type} = 'transfer' and ${transactions.destinationAccountId} = ${accounts.id} then coalesce(${transactions.destinationAmountMinor}, ${transactions.amount})
      else 0
    end
  ), 0)
`.mapWith(Number);

const totalWithdrawalsExpr = sql<number>`
  coalesce(sum(
    case
      when ${transactions.status} <> 'posted' then 0
      when ${transactions.type} = 'expense' and ${transactions.accountId} = ${accounts.id} then ${transactions.amount}
      when ${transactions.type} = 'transfer' and ${transactions.accountId} = ${accounts.id} then ${transactions.amount}
      else 0
    end
  ), 0)
`.mapWith(Number);

export class SQLiteInvestmentRepository implements InvestmentRepository {
  async createInvestmentAccount(account: Account, metadata: InvestmentAccountMetadata): Promise<void> {
    await database.transaction(async (tx) => {
      await tx.insert(accounts).values(account);
      await tx.insert(investmentAccounts).values(metadata);
    });
  }

  async updateInvestmentAccount(
    accountId: string,
    account: InvestmentAccountUpdate,
    metadata: InvestmentMetadataUpdate,
  ): Promise<void> {
    await database.transaction(async (tx) => {
      await tx
        .update(accounts)
        .set({
          name: account.name,
          currency: account.currency,
          openingBalance: account.openingBalance,
          updatedAt: account.updatedAt,
        })
        .where(eq(accounts.id, accountId));
      await tx
        .update(investmentAccounts)
        .set({
          investmentType: metadata.investmentType,
          liquidity: metadata.liquidity,
          providerName: metadata.providerName,
          startDate: metadata.startDate,
          maturityDate: metadata.maturityDate,
          note: metadata.note,
          updatedAt: metadata.updatedAt,
        })
        .where(eq(investmentAccounts.accountId, accountId));
    });
  }

  async findMetadata(accountId: string): Promise<InvestmentAccountMetadata | null> {
    const row = await database.query.investmentAccounts.findFirst({
      where: eq(investmentAccounts.accountId, accountId),
    });
    return row ? mapMetadata(row) : null;
  }

  async listMetadata(): Promise<InvestmentAccountMetadata[]> {
    const rows = await database.select().from(investmentAccounts);
    return rows.map(mapMetadata);
  }

  async createValuation(valuation: NewValuationRecord): Promise<void> {
    await database.insert(investmentValuations).values(valuation);
  }

  async updateValuation(id: string, update: ValuationUpdate): Promise<void> {
    await database
      .update(investmentValuations)
      .set({
        valueMinor: update.valueMinor,
        basisMinor: update.basisMinor,
        note: update.note,
        updatedAt: update.updatedAt,
      })
      .where(eq(investmentValuations.id, id));
  }

  async deleteValuation(id: string): Promise<void> {
    await database.delete(investmentValuations).where(eq(investmentValuations.id, id));
  }

  async findValuationById(id: string): Promise<InvestmentValuation | null> {
    const row = await database.query.investmentValuations.findFirst({
      where: eq(investmentValuations.id, id),
    });
    return row ? mapValuation(row) : null;
  }

  async findValuationByDate(accountId: string, valuationDate: string): Promise<InvestmentValuation | null> {
    const row = await database.query.investmentValuations.findFirst({
      where: and(
        eq(investmentValuations.investmentAccountId, accountId),
        eq(investmentValuations.valuationDate, valuationDate),
      ),
    });
    return row ? mapValuation(row) : null;
  }

  async findLatestValuation(accountId: string): Promise<InvestmentValuation | null> {
    const row = await database.query.investmentValuations.findFirst({
      where: eq(investmentValuations.investmentAccountId, accountId),
      orderBy: [desc(investmentValuations.valuationDate), desc(investmentValuations.createdAt)],
    });
    return row ? mapValuation(row) : null;
  }

  async listValuations(accountId: string): Promise<InvestmentValuation[]> {
    const rows = await database
      .select()
      .from(investmentValuations)
      .where(eq(investmentValuations.investmentAccountId, accountId))
      .orderBy(desc(investmentValuations.valuationDate), desc(investmentValuations.createdAt));
    return rows.map(mapValuation);
  }

  async listLatestValuations(): Promise<InvestmentValuation[]> {
    // Each account has at most one valuation per date, so its max date is unique.
    const latest = database
      .select({
        investmentAccountId: investmentValuations.investmentAccountId,
        maxDate: sql<string>`max(${investmentValuations.valuationDate})`.as('max_date'),
      })
      .from(investmentValuations)
      .groupBy(investmentValuations.investmentAccountId)
      .as('latest');

    const rows = await database
      .select()
      .from(investmentValuations)
      .innerJoin(
        latest,
        and(
          eq(investmentValuations.investmentAccountId, latest.investmentAccountId),
          eq(investmentValuations.valuationDate, latest.maxDate),
        ),
      );
    return rows.map((row) => mapValuation(row.investment_valuations));
  }

  async getContributionSummary(accountId: string): Promise<InvestmentContributionSummary> {
    const [row] = await database
      .select({
        totalContributions: totalContributionsExpr,
        totalWithdrawals: totalWithdrawalsExpr,
      })
      .from(accounts)
      .leftJoin(
        transactions,
        or(eq(transactions.accountId, accounts.id), eq(transactions.destinationAccountId, accounts.id)),
      )
      .where(eq(accounts.id, accountId))
      .groupBy(accounts.id);

    return {
      investmentAccountId: accountId,
      totalContributionsMinor: row?.totalContributions ?? 0,
      totalWithdrawalsMinor: row?.totalWithdrawals ?? 0,
    };
  }

  async listContributionSummaries(): Promise<InvestmentContributionSummary[]> {
    const rows = await database
      .select({
        investmentAccountId: accounts.id,
        totalContributions: totalContributionsExpr,
        totalWithdrawals: totalWithdrawalsExpr,
      })
      .from(accounts)
      .leftJoin(
        transactions,
        or(eq(transactions.accountId, accounts.id), eq(transactions.destinationAccountId, accounts.id)),
      )
      .where(eq(accounts.type, 'investment'))
      .groupBy(accounts.id);

    return rows.map((row) => ({
      investmentAccountId: row.investmentAccountId,
      totalContributionsMinor: row.totalContributions,
      totalWithdrawalsMinor: row.totalWithdrawals,
    }));
  }
}
