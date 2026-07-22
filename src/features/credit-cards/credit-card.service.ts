import type { AccountRepository } from '@/features/accounts/account.repository';
import { bogotaToday } from '@/features/transactions/transaction-date';
import type { TransactionService } from '@/features/transactions/transaction.service';
import type { CreditCardStatementService } from './credit-card-statement.service';
import { CreditCardCycleService } from './credit-card-cycle.service';
import type { CreditCardDetails } from './credit-card.types';
import { calculateCreditCardUtilization } from './credit-card-utilization';

export class CreditCardService {
  constructor(
    private readonly accounts: AccountRepository,
    private readonly statements: CreditCardStatementService,
    private readonly transactions: TransactionService,
    private readonly cycles: CreditCardCycleService,
    private readonly today = () => bogotaToday(),
  ) {}

  async getDetails(accountId: string, today = this.today()): Promise<CreditCardDetails | null> {
    const account = (await this.accounts.list(true)).find((candidate) => candidate.id === accountId);
    if (!account || account.type !== 'credit_card') return null;
    const setupComplete = Boolean(
      account.creditLimit !== null
      && account.creditLimit > 0
      && account.statementClosingDay !== null
      && account.paymentDueDay !== null,
    );
    const [statements, history] = await Promise.all([
      this.statements.listViews(accountId, today),
      this.transactions.list({ accountId, statuses: ['posted'], limit: 100 }),
    ]);
    const recentPurchases = history.items
      .filter((transaction) => transaction.type === 'expense' && transaction.accountId === accountId)
      .slice(0, 5);
    const recentPayments = history.items
      .filter((transaction) => transaction.type === 'transfer' && transaction.destinationAccountId === accountId)
      .slice(0, 5);
    return {
      account,
      setupComplete,
      cycle: setupComplete
        ? this.cycles.resolve(account.statementClosingDay!, account.paymentDueDay!, today)
        : null,
      utilization: calculateCreditCardUtilization(account.balance, account.creditLimit),
      statements,
      latestStatement: statements[0] ?? null,
      recentPurchases,
      recentPayments,
    };
  }

  async listDetails(today = this.today()): Promise<CreditCardDetails[]> {
    const cards = (await this.accounts.list(true)).filter((account) => account.type === 'credit_card');
    const values = await Promise.all(cards.map((card) => this.getDetails(card.id, today)));
    return values.filter((value): value is CreditCardDetails => value !== null);
  }
}
