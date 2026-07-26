import type { CurrencyCode } from '@/features/currency/currency';
import type { AccountWithBalance } from '@/features/accounts/account.types';

export const investmentTypes = [
  'brokerage',
  'fixed_term_deposit',
  'voluntary_pension',
  'investment_fund',
  'private_investment',
  'other',
] as const;
export type InvestmentType = (typeof investmentTypes)[number];

export const investmentLiquidities = ['liquid', 'restricted', 'locked'] as const;
export type InvestmentLiquidity = (typeof investmentLiquidities)[number];

// Only `balance` in v1; `holdings` is reserved for Investments v2.
export const investmentTrackingModes = ['balance'] as const;
export type InvestmentTrackingMode = (typeof investmentTrackingModes)[number];

/** 1:1 metadata for an account whose `type` is `investment`. */
export type InvestmentAccountMetadata = {
  accountId: string;
  investmentType: InvestmentType;
  trackingMode: InvestmentTrackingMode;
  liquidity: InvestmentLiquidity;
  providerName: string | null;
  startDate: string | null;
  maturityDate: string | null;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** One manual market-value snapshot, in the account's native currency minor units. */
export type InvestmentValuation = {
  id: string;
  investmentAccountId: string;
  valueMinor: number;
  /** Net contributions (derived ledger balance) captured when this was recorded. */
  basisMinor: number;
  currencyCode: CurrencyCode;
  valuationDate: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
};

/** Fields the create/edit investment form collects (account + metadata). */
export type InvestmentAccountInput = {
  name: string;
  currency: CurrencyCode;
  openingBalanceMinor: number;
  investmentType: InvestmentType;
  liquidity: InvestmentLiquidity;
  providerName: string | null;
  startDate: string | null;
  maturityDate: string | null;
  note: string | null;
};

export type InvestmentAccountField =
  | 'name'
  | 'currency'
  | 'openingBalance'
  | 'investmentType'
  | 'liquidity'
  | 'providerName'
  | 'startDate'
  | 'maturityDate'
  | 'note';

export type InvestmentValidationErrors = Partial<Record<InvestmentAccountField, string>>;

/** Fields the Update-value form collects. */
export type InvestmentValuationInput = {
  valueMinor: number;
  valuationDate: string;
  note: string | null;
};

/** Gross contributions/withdrawals for one account, in native minor units. */
export type InvestmentContributionSummary = {
  investmentAccountId: string;
  /** Opening capital + posted transfers in + income + refunds. */
  totalContributionsMinor: number;
  /** Posted transfers out + expenses. */
  totalWithdrawalsMinor: number;
};

/** Simple estimated return. Unavailable when net contributions are not positive. */
export type EstimatedReturn = { available: true; basisPoints: number } | { available: false };

/** Read model for one investment account (native values + estimated COP). */
export type InvestmentAccountView = {
  account: AccountWithBalance;
  metadata: InvestmentAccountMetadata;
  latestValuation: InvestmentValuation | null;
  /** = account.balance (derived ledger balance), in native minor units. */
  netContributionsMinor: number;
  totalContributionsMinor: number;
  totalWithdrawalsMinor: number;
  /** Native minor units. Latest valuation, adjusted for post-valuation flows. */
  currentValueMinor: number;
  estimatedGainLossMinor: number;
  estimatedReturn: EstimatedReturn;
  /** Consolidated COP, or null when USD and no valuation rate is available. */
  estimatedValueCopMinor: number | null;
};

export type InvestmentAllocationSlice = { key: string; valueCopMinor: number };

/** Consolidated portfolio read model, COP-based. */
export type InvestmentPortfolioSummary = {
  accounts: InvestmentAccountView[];
  investmentAccountCount: number;
  /** Consolidated COP totals; null when USD accounts exist but no rate is available. */
  totalCurrentValueCopMinor: number | null;
  netContributionsCopMinor: number | null;
  estimatedGainLossCopMinor: number | null;
  estimatedReturn: EstimatedReturn;
  lockedOrRestrictedValueCopMinor: number | null;
  /** True when USD accounts exist but no valuation rate is available. */
  incomplete: boolean;
  allocationByType: InvestmentAllocationSlice[];
  allocationByCurrency: InvestmentAllocationSlice[];
};
