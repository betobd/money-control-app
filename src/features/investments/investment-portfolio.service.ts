import type { AccountRepository } from '@/features/accounts/account.repository';
import type { ValuationRates } from '@/features/exchange-rates/valuation-rates';
import type { InvestmentRepository } from './investment.repository';
import type {
  EstimatedReturn,
  InvestmentAccountMetadata,
  InvestmentAccountView,
  InvestmentAllocationSlice,
  InvestmentPortfolioSummary,
  InvestmentValuation,
} from './investment.types';
import type { AccountWithBalance } from '@/features/accounts/account.types';

const BASIS_POINTS_SCALE = 10_000n;

/** Round `numerator / denominator` half away from zero. `denominator` must be > 0. */
export function roundHalfAwayFromZero(numerator: bigint, denominator: bigint): bigint {
  const quotient = numerator / denominator;
  const remainder = numerator % denominator;
  const twiceAbsRemainder = (remainder < 0n ? -remainder : remainder) * 2n;
  if (twiceAbsRemainder >= denominator) {
    return numerator >= 0n ? quotient + 1n : quotient - 1n;
  }
  return quotient;
}

/** Unrealized gain locked in by the latest valuation (native minor units). */
export function unrealizedGainMinor(latestValuation: InvestmentValuation | null): number {
  return latestValuation ? latestValuation.valueMinor - latestValuation.basisMinor : 0;
}

/**
 * currentValue = netContributions(now) + (latestValue - latestBasis). With no
 * valuation it equals net contributions, so estimated gain/loss is zero. Post-
 * valuation contributions/withdrawals move net contributions and therefore the
 * current value one-for-one, keeping those flows net-worth neutral.
 */
export function computeCurrentValueMinor(
  netContributionsMinor: number,
  latestValuation: InvestmentValuation | null,
): number {
  return netContributionsMinor + unrealizedGainMinor(latestValuation);
}

/**
 * Simple estimated return in integer basis points (10,000 = 100%). Unavailable
 * when net contributions are not strictly positive (zero denominator, full
 * withdrawal, or withdrawals exceeding contributions) — never NaN/Infinity.
 */
export function computeEstimatedReturn(
  gainLossMinor: number,
  netContributionsMinor: number,
): EstimatedReturn {
  if (netContributionsMinor <= 0) return { available: false };
  const basisPoints = Number(
    roundHalfAwayFromZero(BigInt(gainLossMinor) * BASIS_POINTS_SCALE, BigInt(netContributionsMinor)),
  );
  return { available: true, basisPoints };
}

export function buildInvestmentAccountView(params: {
  account: AccountWithBalance;
  metadata: InvestmentAccountMetadata;
  latestValuation: InvestmentValuation | null;
  totalContributionsMinor: number;
  totalWithdrawalsMinor: number;
  rates: ValuationRates;
}): InvestmentAccountView {
  const { account, metadata, latestValuation, totalContributionsMinor, totalWithdrawalsMinor, rates } = params;
  const netContributionsMinor = account.balance;
  const currentValueMinor = computeCurrentValueMinor(netContributionsMinor, latestValuation);
  const estimatedGainLossMinor = currentValueMinor - netContributionsMinor;
  return {
    account,
    metadata,
    latestValuation,
    netContributionsMinor,
    totalContributionsMinor,
    totalWithdrawalsMinor,
    currentValueMinor,
    estimatedGainLossMinor,
    estimatedReturn: computeEstimatedReturn(estimatedGainLossMinor, netContributionsMinor),
    estimatedValueBaseMinor: rates.toBase(currentValueMinor, account.currency),
  };
}

function assertSafe(total: number): number {
  if (!Number.isSafeInteger(total)) {
    throw new Error('Investment total exceeds the supported safe integer range.');
  }
  return total;
}

function allocation(entries: Map<string, number>): InvestmentAllocationSlice[] {
  return [...entries.entries()].map(([key, valueBaseMinor]) => ({ key, valueBaseMinor }));
}

/**
 * Consolidate account views into a base-currency portfolio summary. When any
 * account's currency lacks a valuation rate the consolidated totals are reported
 * as null and marked incomplete (never a silent partial figure), mirroring
 * estimated net worth.
 */
export function summarizePortfolio(
  views: InvestmentAccountView[],
  rates: ValuationRates,
): InvestmentPortfolioSummary {
  let totalValueBase = 0;
  let totalNetContribBase = 0;
  let lockedRestrictedBase = 0;
  let incomplete = false;
  const byType = new Map<string, number>();
  const byCurrency = new Map<string, number>();

  for (const view of views) {
    const valueBase = view.estimatedValueBaseMinor;
    const netContribBase = rates.toBase(view.netContributionsMinor, view.account.currency);
    if (valueBase === null || netContribBase === null) {
      incomplete = true;
      continue;
    }
    totalValueBase += valueBase;
    totalNetContribBase += netContribBase;
    if (view.metadata.liquidity !== 'liquid') lockedRestrictedBase += valueBase;
    byType.set(view.metadata.investmentType, (byType.get(view.metadata.investmentType) ?? 0) + valueBase);
    byCurrency.set(view.account.currency, (byCurrency.get(view.account.currency) ?? 0) + valueBase);
  }

  if (incomplete) {
    return {
      accounts: views,
      investmentAccountCount: views.length,
      baseCurrency: rates.baseCurrency,
      totalCurrentValueBaseMinor: null,
      netContributionsBaseMinor: null,
      estimatedGainLossBaseMinor: null,
      estimatedReturn: { available: false },
      lockedOrRestrictedValueBaseMinor: null,
      incomplete: true,
      allocationByType: [],
      allocationByCurrency: [],
    };
  }

  const gainBase = assertSafe(totalValueBase) - totalNetContribBase;
  return {
    accounts: views,
    investmentAccountCount: views.length,
    baseCurrency: rates.baseCurrency,
    totalCurrentValueBaseMinor: assertSafe(totalValueBase),
    netContributionsBaseMinor: assertSafe(totalNetContribBase),
    estimatedGainLossBaseMinor: gainBase,
    estimatedReturn: computeEstimatedReturn(gainBase, totalNetContribBase),
    lockedOrRestrictedValueBaseMinor: lockedRestrictedBase,
    incomplete: false,
    allocationByType: allocation(byType),
    allocationByCurrency: allocation(byCurrency),
  };
}

/**
 * Return the accounts with each investment account's derived ledger balance
 * replaced by its estimated current value (native minor units). Non-investment
 * accounts are returned unchanged. Feed the result to
 * `AccountService.estimateNetWorth` so net worth counts investment accounts at
 * their valuation while every other account keeps its ledger balance — one source
 * per account, so there is no double counting. Investment contributions/withdrawals
 * stay net-worth neutral (they move the ledger balance, which currentValue tracks),
 * while a valuation moves currentValue and therefore net worth.
 */
export function withInvestmentCurrentValues(
  accounts: AccountWithBalance[],
  views: InvestmentAccountView[],
): AccountWithBalance[] {
  const currentValueById = new Map(views.map((view) => [view.account.id, view.currentValueMinor]));
  return accounts.map((account) => {
    if (account.type !== 'investment') return account;
    const currentValue = currentValueById.get(account.id);
    return currentValue === undefined ? account : { ...account, balance: currentValue };
  });
}

export class InvestmentPortfolioService {
  constructor(
    private readonly accountRepository: AccountRepository,
    private readonly investmentRepository: InvestmentRepository,
  ) {}

  async getPortfolio(rates: ValuationRates): Promise<InvestmentPortfolioSummary> {
    const accountsWithBalances = await this.accountRepository.list(true);
    const investmentAccounts = accountsWithBalances.filter((account) => account.type === 'investment');

    const [metadata, latestValuations, contributionSummaries] = await Promise.all([
      this.investmentRepository.listMetadata(),
      this.investmentRepository.listLatestValuations(),
      this.investmentRepository.listContributionSummaries(),
    ]);
    const metadataById = new Map(metadata.map((row) => [row.accountId, row]));
    const latestById = new Map(latestValuations.map((row) => [row.investmentAccountId, row]));
    const contribById = new Map(contributionSummaries.map((row) => [row.investmentAccountId, row]));

    const views: InvestmentAccountView[] = [];
    for (const account of investmentAccounts) {
      const meta = metadataById.get(account.id);
      // An investment account always has metadata (created atomically); skip
      // defensively if a legacy/damaged row is missing it rather than crashing.
      if (!meta) continue;
      const contrib = contribById.get(account.id);
      views.push(
        buildInvestmentAccountView({
          account,
          metadata: meta,
          latestValuation: latestById.get(account.id) ?? null,
          totalContributionsMinor: contrib?.totalContributionsMinor ?? account.balance,
          totalWithdrawalsMinor: contrib?.totalWithdrawalsMinor ?? 0,
          rates,
        }),
      );
    }

    return summarizePortfolio(views, rates);
  }

  async getAccountView(accountId: string, rates: ValuationRates): Promise<InvestmentAccountView | null> {
    const accountsWithBalances = await this.accountRepository.list(true);
    const account = accountsWithBalances.find((candidate) => candidate.id === accountId);
    if (!account || account.type !== 'investment') return null;
    const [metadata, latestValuation, contrib] = await Promise.all([
      this.investmentRepository.findMetadata(accountId),
      this.investmentRepository.findLatestValuation(accountId),
      this.investmentRepository.getContributionSummary(accountId),
    ]);
    if (!metadata) return null;
    return buildInvestmentAccountView({
      account,
      metadata,
      latestValuation,
      totalContributionsMinor: contrib.totalContributionsMinor,
      totalWithdrawalsMinor: contrib.totalWithdrawalsMinor,
      rates,
    });
  }
}
