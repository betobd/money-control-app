import type { CreditCardStatement } from './credit-card.types';

export type CreditCardPaymentRecord = {
  id: string;
  amount: number;
  transactionDate: string;
};

export type CreditCardStatementUpdate = Omit<CreditCardStatement, 'id' | 'accountId' | 'createdAt'>;

export interface CreditCardRepository {
  createStatement(statement: CreditCardStatement): Promise<void>;
  findStatementByClosingDate(accountId: string, closingDate: string): Promise<CreditCardStatement | null>;
  listPaymentsAfter(accountId: string, dateExclusive: string): Promise<CreditCardPaymentRecord[]>;
  listStatements(accountId: string): Promise<CreditCardStatement[]>;
  updateStatement(id: string, statement: CreditCardStatementUpdate): Promise<void>;
}
