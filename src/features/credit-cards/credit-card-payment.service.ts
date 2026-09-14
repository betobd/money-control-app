import type { AccountRepository } from '@/features/accounts/account.repository';
import { deriveEffectiveRate, formatMoney } from '@/features/currency/currency';
import { isValidCalendarDate } from '@/features/transactions/transaction-date';
import type { TransactionService } from '@/features/transactions/transaction.service';
import type { TransactionRecord } from '@/features/transactions/transaction.types';
import { getMessages } from '@/i18n/messages';
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
    super(getMessages().creditCards.overpayment(formatMoney(preview.overpaymentAmount, preview.cardCurrency)));
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
    const messages = getMessages().creditCards;
    const reasons = messages.unavailableReasons;
    return [
      {
        type: 'minimum-payment',
        label: messages.paymentOptions.minimumPayment,
        amount: statement && statement.minimumPayment > 0 && statement.minimumRemaining > 0
          ? statement.minimumRemaining
          : null,
        isAvailable: Boolean(statement && statement.minimumPayment > 0 && statement.minimumRemaining > 0),
        unavailableReason: !statement
          ? reasons.noStatement
          : statement.minimumPayment === 0
            ? reasons.noMinimumDue
            : statement.minimumRemaining === 0
              ? reasons.minimumCovered
              : null,
      },
      {
        type: 'statement-remaining',
        label: messages.paymentOptions.statementRemaining,
        amount: statement && statement.remainingStatement > 0 ? statement.remainingStatement : null,
        isAvailable: Boolean(statement && statement.remainingStatement > 0),
        unavailableReason: !statement
          ? reasons.noStatement
          : statement.remainingStatement === 0
            ? reasons.statementPaid
            : null,
      },
      {
        type: 'current-debt',
        label: messages.paymentOptions.currentDebt,
        amount: details.utilization.currentDebt > 0 ? details.utilization.currentDebt : null,
        isAvailable: details.utilization.currentDebt > 0,
        unavailableReason: details.utilization.currentDebt === 0 ? reasons.noDebt : null,
      },
      {
        type: 'other',
        label: messages.paymentOptions.other,
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
    const messages = getMessages().creditCards.validation;
    if (!details || details.account.isArchived) {
      throw new CreditCardPaymentValidationError(messages.selectActiveCard);
    }
    const source = accounts.find((account) => account.id === input.sourceAccountId);
    if (!source || source.isArchived || source.type === 'credit_card') {
      throw new CreditCardPaymentValidationError(messages.selectSource);
    }
    if (source.id === details.account.id) {
      throw new CreditCardPaymentValidationError(messages.sameAccount);
    }
    if (!isValidCalendarDate(input.transactionDate)) {
      throw new CreditCardPaymentValidationError(messages.paymentDateInvalid);
    }
    const options = this.getPaymentOptions(details);
    const selectedOption = options.find((option) => option.type === input.option);
    if (!selectedOption) throw new CreditCardPaymentValidationError(messages.selectOption);
    if (!selectedOption.isAvailable) {
      throw new CreditCardPaymentValidationError(selectedOption.unavailableReason ?? messages.optionUnavailable);
    }
    const amount = input.option === 'other' ? input.amount : selectedOption.amount;
    if (amount === null || !Number.isSafeInteger(amount) || amount <= 0) {
      throw new CreditCardPaymentValidationError(messages.paymentAmountInvalid);
    }
    // `amount` is always in the card's currency (it credits the card).
    const cardCurrency = details.account.currency;
    const sourceCurrency = source.currency;
    const crossCurrency = sourceCurrency !== cardCurrency;
    let sourceAmount = amount;
    if (crossCurrency) {
      sourceAmount = input.sourceAmount ?? 0;
      if (!Number.isSafeInteger(sourceAmount) || sourceAmount <= 0) {
        throw new CreditCardPaymentValidationError(messages.sourceAmountRequired);
      }
    }
    const expectedCardBalance = details.account.balance + amount;
    if (!Number.isSafeInteger(expectedCardBalance)) {
      throw new CreditCardPaymentValidationError(messages.paymentOutOfRange);
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
      crossCurrency,
      sourceCurrency,
      cardCurrency,
      sourceAmount,
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
    if (preview.crossCurrency) {
      // Store both actual amounts and the effective rate; attribution uses the card leg.
      const rate = deriveEffectiveRate(
        preview.sourceAmount,
        preview.sourceCurrency,
        preview.amount,
        preview.cardCurrency,
      );
      return this.transactions.create({
        type: 'transfer',
        amount: preview.sourceAmount,
        accountId: preview.sourceAccountId,
        destinationAccountId: preview.cardAccountId,
        destinationAmountMinor: preview.amount,
        categoryId: null,
        transactionDate: input.transactionDate,
        note: input.note,
        exchangeRate: {
          rateScaled: rate.rateScaled,
          rateScale: rate.rateScale,
          baseCurrencyCode: rate.baseCurrencyCode,
          quoteCurrencyCode: rate.quoteCurrencyCode,
          effectiveDate: input.transactionDate,
          source: 'transfer_effective',
        },
      });
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
