import type { AccountRepository } from '@/features/accounts/account.repository';
import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import type { TransactionService } from '@/features/transactions/transaction.service';
import type { TransactionRecord } from '@/features/transactions/transaction.types';
import type { CreditCardService } from './credit-card.service';
import type {
  CreditCardDetails,
  CreditCardPaymentInput,
  CreditCardPaymentOptionView,
  CreditCardPaymentPreview,
} from './credit-card.types';

export class CreditCardPaymentValidationError extends Error {}

export class CreditCardOverpaymentConfirmationRequired extends Error {
  constructor(public readonly preview: CreditCardPaymentPreview) {
    super(`This payment exceeds the current debt by COP ${preview.overpaymentAmount.toLocaleString('en-US')}. The card will have a positive balance.`);
  }
}

export class CreditCardPaymentService {
  constructor(
    private readonly cards: CreditCardService,
    private readonly accounts: AccountRepository,
    private readonly transactions: TransactionService,
  ) {}

  getPaymentOptions(details: CreditCardDetails): CreditCardPaymentOptionView[] {
    const statement = details.latestStatement;
    return [
      {
        type: 'minimum-payment',
        label: 'Minimum payment',
        amount: statement && statement.minimumPayment > 0 && statement.minimumRemaining > 0
          ? statement.minimumRemaining
          : null,
        isAvailable: Boolean(statement && statement.minimumPayment > 0 && statement.minimumRemaining > 0),
        unavailableReason: !statement
          ? 'No statement recorded.'
          : statement.minimumPayment === 0
            ? 'No minimum payment due.'
            : statement.minimumRemaining === 0
              ? 'Minimum payment already covered.'
              : null,
      },
      {
        type: 'statement-remaining',
        label: 'Remaining statement',
        amount: statement && statement.remainingStatement > 0 ? statement.remainingStatement : null,
        isAvailable: Boolean(statement && statement.remainingStatement > 0),
        unavailableReason: !statement
          ? 'No statement recorded.'
          : statement.remainingStatement === 0
            ? 'Latest statement already paid.'
            : null,
      },
      {
        type: 'current-debt',
        label: 'Current total debt',
        amount: details.utilization.currentDebt > 0 ? details.utilization.currentDebt : null,
        isAvailable: details.utilization.currentDebt > 0,
        unavailableReason: details.utilization.currentDebt === 0 ? 'No current debt to pay.' : null,
      },
      {
        type: 'other',
        label: 'Other amount',
        amount: null,
        isAvailable: true,
        unavailableReason: null,
      },
    ];
  }

  async preview(input: CreditCardPaymentInput): Promise<CreditCardPaymentPreview> {
    const [details, accounts] = await Promise.all([
      this.cards.getDetails(input.cardAccountId),
      this.accounts.list(true),
    ]);
    if (!details || details.account.isArchived) {
      throw new CreditCardPaymentValidationError('Select an active credit card.');
    }
    const source = accounts.find((account) => account.id === input.sourceAccountId);
    if (!source || source.isArchived || source.type === 'credit_card') {
      throw new CreditCardPaymentValidationError('Select an active non-card source account.');
    }
    if (source.id === details.account.id) {
      throw new CreditCardPaymentValidationError('Source and destination accounts must be different.');
    }
    if (!isValidCalendarDate(input.transactionDate)) {
      throw new CreditCardPaymentValidationError('Enter a valid payment date in YYYY-MM-DD format.');
    }
    const options = this.getPaymentOptions(details);
    const selectedOption = options.find((option) => option.type === input.option);
    if (!selectedOption) throw new CreditCardPaymentValidationError('Select a payment option.');
    if (!selectedOption.isAvailable) {
      throw new CreditCardPaymentValidationError(selectedOption.unavailableReason ?? 'This payment option is unavailable.');
    }
    const amount = input.option === 'other' ? input.amount : selectedOption.amount;
    if (amount === null || !Number.isSafeInteger(amount) || amount <= 0) {
      throw new CreditCardPaymentValidationError('Payment amount must be a positive whole, safe COP amount.');
    }
    const expectedCardBalance = details.account.balance + amount;
    if (!Number.isSafeInteger(expectedCardBalance)) {
      throw new CreditCardPaymentValidationError('Payment would exceed the supported safe COP balance range.');
    }
    const latest = details.latestStatement;
    const cutoff = latest
      ? latest.closingDate > latest.periodEnd ? latest.closingDate : latest.periodEnd
      : null;
    const amountAppliedToStatement = latest && cutoff && input.transactionDate > cutoff ? amount : 0;
    const statementRemaining = latest?.remainingStatement ?? 0;
    const expectedStatementRemaining = Math.max(statementRemaining - amountAppliedToStatement, 0);
    return {
      cardAccountId: details.account.id,
      sourceAccountId: source.id,
      sourceAccountName: source.name,
      sourceBalance: source.balance,
      option: selectedOption.type,
      optionLabel: selectedOption.label,
      currentDebt: details.utilization.currentDebt,
      statementRemaining,
      minimumRemaining: latest?.minimumRemaining ?? 0,
      amount,
      expectedCardBalance,
      expectedDebt: expectedCardBalance < 0 ? Math.abs(expectedCardBalance) : 0,
      expectedStatementRemaining,
      amountBeyondStatement: statementRemaining > 0
        ? Math.max(amountAppliedToStatement - statementRemaining, 0)
        : 0,
      overpaymentAmount: Math.max(amount - details.utilization.currentDebt, 0),
    };
  }

  async pay(input: CreditCardPaymentInput): Promise<TransactionRecord> {
    const preview = await this.preview(input);
    if (preview.overpaymentAmount > 0 && !input.confirmOverpayment) {
      throw new CreditCardOverpaymentConfirmationRequired(preview);
    }
    return this.transactions.create({
      type: 'transfer',
      amount: preview.amount,
      accountId: preview.sourceAccountId,
      destinationAccountId: preview.cardAccountId,
      categoryId: null,
      transactionDate: input.transactionDate,
      note: input.note,
    });
  }
}
