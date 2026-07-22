import type { AccountRepository } from '@/features/accounts/account.repository';
import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import { notifyCreditCardDataChanged } from './credit-card-data-events';
import { CreditCardCycleService, dueDateAfterClosing } from './credit-card-cycle.service';
import type { CreditCardRepository } from './credit-card.repository';
import type {
  CreditCardStatement,
  CreditCardStatementDefaults,
  CreditCardStatementErrors,
  CreditCardStatementInput,
  CreditCardStatementStatus,
  CreditCardStatementView,
} from './credit-card.types';

export class CreditCardStatementValidationError extends Error {
  constructor(public readonly fields: CreditCardStatementErrors) {
    super('Credit-card statement validation failed.');
  }
}

export class CreditCardStatementService {
  constructor(
    private readonly repository: CreditCardRepository,
    private readonly accounts: AccountRepository,
    private readonly cycleService: CreditCardCycleService,
    private readonly createId: () => string,
    private readonly now = () => new Date().toISOString(),
  ) {}

  async defaults(accountId: string, today: string): Promise<CreditCardStatementDefaults> {
    const account = await this.requireCard(accountId);
    if (account.statementClosingDay === null || account.paymentDueDay === null) {
      throw new Error('Complete the card closing and due-day setup first.');
    }
    const cycle = this.cycleService.resolve(account.statementClosingDay, account.paymentDueDay, today);
    return {
      accountId,
      periodStart: cycle.currentPeriodStart,
      periodEnd: cycle.currentPeriodEnd,
      closingDate: cycle.previousClosingDate,
      dueDate: dueDateAfterClosing(cycle.previousClosingDate, account.paymentDueDay),
    };
  }

  async save(input: CreditCardStatementInput): Promise<CreditCardStatement> {
    await this.requireCard(input.accountId);
    const normalized = { ...input };
    const errors = this.validateInput(normalized);
    if (Object.keys(errors).length) throw new CreditCardStatementValidationError(errors);
    const existing = await this.repository.findStatementByClosingDate(input.accountId, input.closingDate);
    const timestamp = this.now();
    if (existing) {
      const updated: CreditCardStatement = { ...existing, ...normalized, updatedAt: timestamp };
      await this.repository.updateStatement(existing.id, {
        periodStart: updated.periodStart,
        periodEnd: updated.periodEnd,
        closingDate: updated.closingDate,
        dueDate: updated.dueDate,
        statementBalance: updated.statementBalance,
        minimumPayment: updated.minimumPayment,
        updatedAt: timestamp,
      });
      notifyCreditCardDataChanged();
      return updated;
    }
    const statement: CreditCardStatement = {
      id: this.createId(),
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.repository.createStatement(statement);
    notifyCreditCardDataChanged();
    return statement;
  }

  async listViews(accountId: string, today: string): Promise<CreditCardStatementView[]> {
    await this.requireCard(accountId);
    const statements = await this.repository.listStatements(accountId);
    return Promise.all(statements.map((statement) => this.toView(statement, today)));
  }

  private validateInput(input: CreditCardStatementInput): CreditCardStatementErrors {
    const errors: CreditCardStatementErrors = {};
    if (!Number.isSafeInteger(input.statementBalance) || input.statementBalance < 0) {
      errors.statementBalance = 'Statement balance must be zero or a positive whole, safe COP amount.';
    }
    if (!Number.isSafeInteger(input.minimumPayment) || input.minimumPayment < 0) {
      errors.minimumPayment = 'Minimum payment must be zero or a positive whole, safe COP amount.';
    } else if (Number.isSafeInteger(input.statementBalance) && input.minimumPayment > input.statementBalance) {
      errors.minimumPayment = 'Minimum payment cannot exceed the statement balance.';
    }
    for (const field of ['periodStart', 'periodEnd', 'closingDate', 'dueDate'] as const) {
      if (!isValidCalendarDate(input[field])) errors[field] = 'Enter a valid date in YYYY-MM-DD format.';
    }
    if (!errors.periodStart && !errors.periodEnd && input.periodStart > input.periodEnd) {
      errors.periodEnd = 'Statement period end cannot be before its start.';
    }
    if (!errors.periodEnd && !errors.closingDate && input.closingDate < input.periodEnd) {
      errors.closingDate = 'Closing date cannot be before the statement period ends.';
    }
    if (!errors.closingDate && !errors.dueDate && input.dueDate < input.closingDate) {
      errors.dueDate = 'Due date cannot be before the statement closes.';
    }
    return errors;
  }

  private async toView(statement: CreditCardStatement, today: string): Promise<CreditCardStatementView> {
    const cutoff = statement.closingDate > statement.periodEnd ? statement.closingDate : statement.periodEnd;
    const payments = (await this.repository.listPaymentsAfter(statement.accountId, cutoff))
      .filter((payment) => payment.transactionDate <= today);
    const amountPaidByDueDate = this.sumPayments(payments.filter((payment) => payment.transactionDate <= statement.dueDate));
    const amountPaidAfterDueDate = this.sumPayments(payments.filter((payment) => payment.transactionDate > statement.dueDate));
    const amountPaid = this.safeAdd(amountPaidByDueDate, amountPaidAfterDueDate);
    const remainingStatement = Math.max(statement.statementBalance - amountPaid, 0);
    const overpayment = Math.max(amountPaid - statement.statementBalance, 0);
    const minimumPaidAmount = Math.min(amountPaid, statement.minimumPayment);
    const minimumRemaining = Math.max(statement.minimumPayment - amountPaid, 0);
    const minimumCovered = statement.minimumPayment === 0 || minimumRemaining === 0;
    const paidOnTime = statement.statementBalance === 0 || amountPaidByDueDate >= statement.statementBalance;
    return {
      ...statement,
      amountPaid,
      amountPaidByDueDate,
      amountPaidAfterDueDate,
      remainingStatement,
      overpayment,
      minimumPaidAmount,
      minimumRemaining,
      minimumCovered,
      paidOnTime,
      status: this.status(statement, today, amountPaid, remainingStatement, minimumCovered),
    };
  }

  private status(
    statement: CreditCardStatement,
    today: string,
    amountPaid: number,
    remainingStatement: number,
    minimumCovered: boolean,
  ): CreditCardStatementStatus {
    if (statement.statementBalance === 0) return 'no-balance-due';
    if (remainingStatement === 0) return 'paid';
    if (today <= statement.periodEnd) return 'upcoming';
    if (today > statement.dueDate) return 'overdue';
    if (statement.minimumPayment > 0 && minimumCovered) return 'minimum-covered';
    if (amountPaid > 0) return 'partially-paid';
    return 'balance-due';
  }

  private sumPayments(payments: { amount: number }[]): number {
    return payments.reduce((sum, payment) => this.safeAdd(sum, payment.amount), 0);
  }

  private safeAdd(left: number, right: number): number {
    const result = left + right;
    if (!Number.isSafeInteger(result)) throw new Error('Statement payment total exceeds the supported safe COP range.');
    return result;
  }

  private async requireCard(accountId: string) {
    const account = await this.accounts.findById(accountId);
    if (!account || account.type !== 'credit_card') throw new Error('Credit card not found.');
    return account;
  }
}
