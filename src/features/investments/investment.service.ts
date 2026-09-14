import type { AccountRepository } from '@/features/accounts/account.repository';
import type { Account } from '@/features/accounts/account.types';
import { isSupportedCurrency } from '@/features/currency/currency';
import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { getMessages } from '@/i18n/messages';
import type { InvestmentRepository } from './investment.repository';
import {
  investmentLiquidities,
  investmentTypes,
  type InvestmentAccountInput,
  type InvestmentAccountMetadata,
  type InvestmentValidationErrors,
} from './investment.types';

const MAX_PROVIDER_LENGTH = 100;
const MAX_NOTE_LENGTH = 200;

export class InvestmentValidationError extends Error {
  constructor(public readonly fields: InvestmentValidationErrors) {
    super('Investment validation failed.');
  }
}

export type InvestmentActionErrorCode =
  | 'investment_not_found'
  | 'currency_change_not_allowed'
  | 'opening_balance_locked';

export class InvestmentActionError extends Error {
  constructor(
    public readonly code: InvestmentActionErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export type InvestmentAccount = {
  account: Account;
  metadata: InvestmentAccountMetadata;
};

function normalizeName(name: string): string {
  return name.trim().toLocaleLowerCase('es-CO');
}

function trimOrNull(value: string | null): string | null {
  const trimmed = value?.trim() ?? '';
  return trimmed.length > 0 ? trimmed : null;
}

export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

type NormalizedInput = {
  name: string;
  currency: InvestmentAccountInput['currency'];
  openingBalanceMinor: number;
  investmentType: InvestmentAccountInput['investmentType'];
  liquidity: InvestmentAccountInput['liquidity'];
  providerName: string | null;
  startDate: string | null;
  maturityDate: string | null;
  note: string | null;
};

export function validateInvestmentInput(input: InvestmentAccountInput): {
  errors: InvestmentValidationErrors;
  normalized: NormalizedInput;
} {
  const t = getMessages().investments;
  const errors: InvestmentValidationErrors = {};
  const normalized: NormalizedInput = {
    name: input.name.trim(),
    currency: input.currency,
    openingBalanceMinor: input.openingBalanceMinor,
    investmentType: input.investmentType,
    liquidity: input.liquidity,
    providerName: trimOrNull(input.providerName),
    startDate: input.startDate?.trim() || null,
    maturityDate: input.maturityDate?.trim() || null,
    note: trimOrNull(input.note),
  };

  if (!normalized.name) errors.name = t.nameRequired;
  if (!isSupportedCurrency(normalized.currency)) errors.currency = t.currencyUnsupported;
  if (!Number.isSafeInteger(normalized.openingBalanceMinor) || normalized.openingBalanceMinor < 0) {
    errors.openingBalance = t.openingBalanceInvalid;
  }
  if (!(investmentTypes as readonly string[]).includes(normalized.investmentType)) {
    errors.investmentType = t.typeRequired;
  }
  if (!(investmentLiquidities as readonly string[]).includes(normalized.liquidity)) {
    errors.liquidity = t.liquidityRequired;
  }
  if (normalized.providerName && normalized.providerName.length > MAX_PROVIDER_LENGTH) {
    errors.providerName = t.providerTooLong(MAX_PROVIDER_LENGTH);
  }
  if (normalized.note && normalized.note.length > MAX_NOTE_LENGTH) {
    errors.note = t.noteTooLong(MAX_NOTE_LENGTH);
  }
  if (normalized.startDate && !isCalendarDate(normalized.startDate)) {
    errors.startDate = t.startDateInvalid;
  }
  if (normalized.maturityDate && !isCalendarDate(normalized.maturityDate)) {
    errors.maturityDate = t.maturityDateInvalid;
  }
  if (
    normalized.startDate
    && normalized.maturityDate
    && !errors.startDate
    && !errors.maturityDate
    && normalized.maturityDate < normalized.startDate
  ) {
    errors.maturityDate = t.maturityBeforeStart;
  }
  return { errors, normalized };
}

type InvestmentServiceOptions = {
  createId: () => string;
  now?: () => string;
};

export class InvestmentService {
  private readonly createId: () => string;
  private readonly now: () => string;

  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly investmentRepository: InvestmentRepository,
    options: InvestmentServiceOptions,
  ) {
    this.createId = options.createId;
    this.now = options.now ?? (() => new Date().toISOString());
  }

  async get(accountId: string): Promise<InvestmentAccount | null> {
    const [account, metadata] = await Promise.all([
      this.accountRepository.findById(accountId),
      this.investmentRepository.findMetadata(accountId),
    ]);
    if (!account || account.type !== 'investment' || !metadata) return null;
    return { account, metadata };
  }

  async create(input: InvestmentAccountInput): Promise<InvestmentAccount> {
    const normalized = await this.validate(input);
    const timestamp = this.now();
    const account: Account = {
      id: this.createId(),
      name: normalized.name,
      type: 'investment',
      currency: normalized.currency,
      openingBalance: normalized.openingBalanceMinor,
      creditLimit: null,
      statementClosingDay: null,
      paymentDueDay: null,
      isArchived: false,
      archivedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const metadata: InvestmentAccountMetadata = {
      accountId: account.id,
      investmentType: normalized.investmentType,
      trackingMode: 'balance',
      liquidity: normalized.liquidity,
      providerName: normalized.providerName,
      startDate: normalized.startDate,
      maturityDate: normalized.maturityDate,
      note: normalized.note,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    await this.investmentRepository.createInvestmentAccount(account, metadata);
    notifyFinancialDataChanged({ kind: 'investment', operation: 'create', accountId: account.id });
    return { account, metadata };
  }

  async update(accountId: string, input: InvestmentAccountInput): Promise<void> {
    const current = await this.accountRepository.findById(accountId);
    if (!current || current.type !== 'investment') {
      throw new InvestmentActionError('investment_not_found', getMessages().investments.notFound);
    }
    const normalized = await this.validate(input, accountId);

    if (normalized.currency !== current.currency) {
      const eligibility = await this.accountRepository.getDeletionEligibility(accountId);
      if (eligibility.hasFinancialReferences || current.openingBalance !== 0) {
        throw new InvestmentValidationError({
          currency: getMessages().investments.currencyLocked,
        });
      }
    }

    if (
      normalized.openingBalanceMinor !== current.openingBalance
      && (await this.accountRepository.hasPostedTransactions(accountId))
    ) {
      throw new InvestmentValidationError({
        openingBalance: getMessages().investments.openingBalanceLocked,
      });
    }

    const timestamp = this.now();
    await this.investmentRepository.updateInvestmentAccount(
      accountId,
      {
        name: normalized.name,
        currency: normalized.currency,
        openingBalance: normalized.openingBalanceMinor,
        updatedAt: timestamp,
      },
      {
        investmentType: normalized.investmentType,
        liquidity: normalized.liquidity,
        providerName: normalized.providerName,
        startDate: normalized.startDate,
        maturityDate: normalized.maturityDate,
        note: normalized.note,
        updatedAt: timestamp,
      },
    );
    notifyFinancialDataChanged({ kind: 'investment', operation: 'update', accountId });
  }

  private async validate(input: InvestmentAccountInput, excludingId?: string): Promise<NormalizedInput> {
    const { errors, normalized } = validateInvestmentInput(input);
    if (!errors.name) {
      const duplicate = await this.accountRepository.findActiveByNormalizedName(
        normalizeName(normalized.name),
        excludingId,
      );
      if (duplicate) errors.name = getMessages().investments.duplicateName;
    }
    if (Object.keys(errors).length > 0) throw new InvestmentValidationError(errors);
    return normalized;
  }
}
