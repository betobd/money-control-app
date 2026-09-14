import type { AccountRepository } from '@/features/accounts/account.repository';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { getMessages } from '@/i18n/messages';
import type { InvestmentRepository } from './investment.repository';
import { isCalendarDate } from './investment.service';
import type { InvestmentValuation, InvestmentValuationInput } from './investment.types';

export type InvestmentValuationErrorCode =
  | 'investment_not_found'
  | 'investment_archived'
  | 'valuation_not_found'
  | 'value_invalid'
  | 'date_invalid'
  | 'date_in_future';

export class InvestmentValuationError extends Error {
  constructor(
    public readonly code: InvestmentValuationErrorCode,
    message: string,
  ) {
    super(message);
  }
}

type ValuationServiceOptions = {
  createId: () => string;
  now?: () => string;
  today?: () => string;
};

function trimOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export class InvestmentValuationService {
  private readonly createId: () => string;
  private readonly now: () => string;
  private readonly today: () => string;

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly investmentRepository: InvestmentRepository,
    options: ValuationServiceOptions,
  ) {
    this.createId = options.createId;
    this.now = options.now ?? (() => new Date().toISOString());
    this.today = options.today ?? (() => bogotaToday());
  }

  async list(accountId: string): Promise<InvestmentValuation[]> {
    return this.investmentRepository.listValuations(accountId);
  }

  /**
   * Record (or replace, for an existing date) a manual valuation. The account's
   * current net contributions are snapshotted as `basisMinor`, so
   * currentValue = netContributions(now) + (value - basis) keeps later
   * contributions/withdrawals net-worth neutral. See docs/investments.md.
   */
  async record(accountId: string, input: InvestmentValuationInput): Promise<InvestmentValuation> {
    const account = (await this.accountRepository.list(true)).find((candidate) => candidate.id === accountId);
    if (!account || account.type !== 'investment') {
      throw new InvestmentValuationError('investment_not_found', getMessages().investments.notFound);
    }
    if (account.isArchived) {
      throw new InvestmentValuationError('investment_archived', getMessages().investments.archivedCannotRevalue);
    }
    if (!Number.isSafeInteger(input.valueMinor) || input.valueMinor < 0) {
      throw new InvestmentValuationError('value_invalid', getMessages().investments.currentValueInvalid);
    }
    if (!isCalendarDate(input.valuationDate)) {
      throw new InvestmentValuationError('date_invalid', getMessages().investments.valuationDateInvalid);
    }
    if (input.valuationDate > this.today()) {
      throw new InvestmentValuationError('date_in_future', getMessages().investments.valuationDateInFuture);
    }

    const basisMinor = account.balance;
    const note = trimOrNull(input.note);
    const timestamp = this.now();
    const existing = await this.investmentRepository.findValuationByDate(accountId, input.valuationDate);

    let valuation: InvestmentValuation;
    if (existing) {
      await this.investmentRepository.updateValuation(existing.id, {
        valueMinor: input.valueMinor,
        basisMinor,
        note,
        updatedAt: timestamp,
      });
      valuation = { ...existing, valueMinor: input.valueMinor, basisMinor, note, updatedAt: timestamp };
    } else {
      valuation = {
        id: this.createId(),
        investmentAccountId: accountId,
        valueMinor: input.valueMinor,
        basisMinor,
        currencyCode: account.currency,
        valuationDate: input.valuationDate,
        note,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      await this.investmentRepository.createValuation(valuation);
    }

    notifyFinancialDataChanged({ kind: 'investment', operation: 'valuation', accountId });
    return valuation;
  }

  /** Delete a valuation (manual mark, not ledger history). UI confirms first. */
  async delete(valuationId: string): Promise<void> {
    const existing = await this.investmentRepository.findValuationById(valuationId);
    if (!existing) {
      throw new InvestmentValuationError('valuation_not_found', getMessages().investments.valuationNotFound);
    }
    await this.investmentRepository.deleteValuation(valuationId);
    notifyFinancialDataChanged({
      kind: 'investment',
      operation: 'valuation-delete',
      accountId: existing.investmentAccountId,
    });
  }
}
