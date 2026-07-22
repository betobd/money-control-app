import { and, desc, eq, gt } from 'drizzle-orm';

import { database } from '@/database/client';
import { creditCardStatements, transactions } from '@/database/schema';
import type {
  CreditCardPaymentRecord,
  CreditCardRepository,
  CreditCardStatementUpdate,
} from './credit-card.repository';
import type { CreditCardStatement } from './credit-card.types';

function mapStatement(row: typeof creditCardStatements.$inferSelect): CreditCardStatement {
  return row;
}

export class SQLiteCreditCardRepository implements CreditCardRepository {
  async createStatement(statement: CreditCardStatement): Promise<void> {
    await database.insert(creditCardStatements).values(statement);
  }

  async findStatementByClosingDate(accountId: string, closingDate: string): Promise<CreditCardStatement | null> {
    const [row] = await database
      .select()
      .from(creditCardStatements)
      .where(and(
        eq(creditCardStatements.accountId, accountId),
        eq(creditCardStatements.closingDate, closingDate),
      ))
      .limit(1);
    return row ? mapStatement(row) : null;
  }

  async listPaymentsAfter(accountId: string, dateExclusive: string): Promise<CreditCardPaymentRecord[]> {
    return database
      .select({
        id: transactions.id,
        amount: transactions.amount,
        transactionDate: transactions.transactionDate,
      })
      .from(transactions)
      .where(and(
        eq(transactions.type, 'transfer'),
        eq(transactions.status, 'posted'),
        eq(transactions.destinationAccountId, accountId),
        gt(transactions.transactionDate, dateExclusive),
      ));
  }

  async listStatements(accountId: string): Promise<CreditCardStatement[]> {
    const rows = await database
      .select()
      .from(creditCardStatements)
      .where(eq(creditCardStatements.accountId, accountId))
      .orderBy(
        desc(creditCardStatements.closingDate),
        desc(creditCardStatements.createdAt),
        desc(creditCardStatements.id),
      );
    return rows.map(mapStatement);
  }

  async updateStatement(id: string, statement: CreditCardStatementUpdate): Promise<void> {
    await database.update(creditCardStatements).set(statement).where(eq(creditCardStatements.id, id));
  }
}
