import type { AccountRepository } from '@/features/accounts/account.repository';
import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import { getMessages } from '@/i18n/messages';
import { notifyCreditCardDataChanged } from './credit-card-data-events';
import { CreditCardCycleService, dueDateAfterClosing } from './credit-card-cycle.service';
import type { CreditCardPaymentRecord, CreditCardRepository } from './credit-card.repository';
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

function safeAdd(left: number, right: number): number {
  const result = left + right;
  if (!Number.isSafeInteger(result)) {
    throw new Error('Statement payment total exceeds the supported range.');
  }
  return result;
}

function sumPayments(payments: { amount: number }[]): number {
  return payments.reduce((sum, payment) => safeAdd(sum, payment.amount), 0);
}

function statementStatus(
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

export function calculateCreditCardStatementView(
  statement: CreditCardStatement,
  payments: readonly CreditCardPaymentRecord[],
  today: string,
): CreditCardStatementView {
  const cutoff = statement.closingDate > statement.periodEnd
    ? statement.closingDate
    : statement.periodEnd;
  const qualifyingPayments = payments.filter((payment) => (
    payment.transactionDate > cutoff && payment.transactionDate <= today
  ));
  const amountPaidByDueDate = sumPayments(
    qualifyingPayments.filter((payment) => payment.transactionDate <= statement.dueDate),
  );
  const amountPaidAfterDueDate = sumPayments(
    qualifyingPayments.filter((payment) => payment.transactionDate > statement.dueDate),
  );
  const amountPaid = safeAdd(amountPaidByDueDate, amountPaidAfterDueDate);
  const remainingStatement = Math.max(statement.statementBalance - amountPaid, 0);
  const overpayment = Math.max(amountPaid - statement.statementBalance, 0);
  const minimumPaidAmount = Math.min(amountPaid, statement.minimumPayment);
  const minimumRemaining = Math.max(statement.minimumPayment - amountPaid, 0);
  const minimumCovered = statement.minimumPayment === 0 || minimumRemaining === 0;
  const paidOnTime = statement.statementBalance === 0
    || amountPaidByDueDate >= statement.statementBalance;
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
    status: statementStatus(statement, today, amountPaid, remainingStatement, minimumCovered),
  };
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
      throw new Error(getMessages().creditCards.errors.setupIncomplete);
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
    return Promise.all(statements.map(async (statement) => {
      const cutoff = statement.closingDate > statement.periodEnd
        ? statement.closingDate
        : statement.periodEnd;
      const payments = await this.repository.listPaymentsAfter(statement.accountId, cutoff);
      return calculateCreditCardStatementView(statement, payments, today);
    }));
  }

  private validateInput(input: CreditCardStatementInput): CreditCardStatementErrors {
    const errors: CreditCardStatementErrors = {};
    const messages = getMessages().creditCards.validation;
    if (!Number.isSafeInteger(input.statementBalance) || input.statementBalance < 0) {
      errors.statementBalance = messages.statementBalanceInvalid;
    }
    if (!Number.isSafeInteger(input.minimumPayment) || input.minimumPayment < 0) {
      errors.minimumPayment = messages.minimumPaymentInvalid;
    } else if (Number.isSafeInteger(input.statementBalance) && input.minimumPayment > input.statementBalance) {
      errors.minimumPayment = messages.minimumExceedsBalance;
    }
    for (const field of ['periodStart', 'periodEnd', 'closingDate', 'dueDate'] as const) {
      if (!isValidCalendarDate(input[field])) errors[field] = messages.dateInvalid;
    }
    if (!errors.periodStart && !errors.periodEnd && input.periodStart > input.periodEnd) {
      errors.periodEnd = messages.periodEndBeforeStart;
    }
    if (!errors.periodEnd && !errors.closingDate && input.closingDate < input.periodEnd) {
      errors.closingDate = messages.closingBeforePeriodEnd;
    }
    if (!errors.closingDate && !errors.dueDate && input.dueDate < input.closingDate) {
      errors.dueDate = messages.dueBeforeClosing;
    }
    return errors;
  }

  private async requireCard(accountId: string) {
    const account = await this.accounts.findById(accountId);
    if (!account || account.type !== 'credit_card') throw new Error(getMessages().creditCards.errors.cardNotFound);
    return account;
  }
}
