import type { Account } from '@/features/accounts/account.types';
import type {
  InvestmentAccountMetadata,
  InvestmentContributionSummary,
  InvestmentValuation,
} from './investment.types';

/** Account fields an investment edit may change (opening balance/currency guarded by service). */
export type InvestmentAccountUpdate = {
  name: string;
  currency: Account['currency'];
  openingBalance: number;
  updatedAt: string;
};

/** Metadata fields an investment edit may change. */
export type InvestmentMetadataUpdate = {
  investmentType: InvestmentAccountMetadata['investmentType'];
  liquidity: InvestmentAccountMetadata['liquidity'];
  providerName: string | null;
  startDate: string | null;
  maturityDate: string | null;
  note: string | null;
  updatedAt: string;
};

export type NewValuationRecord = InvestmentValuation;

export type ValuationUpdate = {
  valueMinor: number;
  basisMinor: number;
  note: string | null;
  updatedAt: string;
};

export interface InvestmentRepository {
  /** Atomically insert the investment account row and its metadata. */
  createInvestmentAccount(account: Account, metadata: InvestmentAccountMetadata): Promise<void>;
  /** Atomically update the account row and its metadata. */
  updateInvestmentAccount(
    accountId: string,
    account: InvestmentAccountUpdate,
    metadata: InvestmentMetadataUpdate,
  ): Promise<void>;
  findMetadata(accountId: string): Promise<InvestmentAccountMetadata | null>;
  listMetadata(): Promise<InvestmentAccountMetadata[]>;

  createValuation(valuation: NewValuationRecord): Promise<void>;
  updateValuation(id: string, update: ValuationUpdate): Promise<void>;
  deleteValuation(id: string): Promise<void>;
  findValuationById(id: string): Promise<InvestmentValuation | null>;
  findValuationByDate(accountId: string, valuationDate: string): Promise<InvestmentValuation | null>;
  findLatestValuation(accountId: string): Promise<InvestmentValuation | null>;
  listValuations(accountId: string): Promise<InvestmentValuation[]>;
  /** Latest valuation per investment account (one row each), for the portfolio. */
  listLatestValuations(): Promise<InvestmentValuation[]>;

  getContributionSummary(accountId: string): Promise<InvestmentContributionSummary>;
  listContributionSummaries(): Promise<InvestmentContributionSummary[]>;
}
