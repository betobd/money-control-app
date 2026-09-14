import { getMessages } from '@/i18n/messages';
import type { EstimatedReturn, InvestmentLiquidity, InvestmentType } from './investment.types';

/** Display labels. Getters, so each read follows the active language. */
export const investmentTypeLabels: Record<InvestmentType, string> = {
  get brokerage() { return getMessages().investments.typeBrokerage; },
  get fixed_term_deposit() { return getMessages().investments.typeFixedTermDeposit; },
  get voluntary_pension() { return getMessages().investments.typeVoluntaryPension; },
  get investment_fund() { return getMessages().investments.typeInvestmentFund; },
  get private_investment() { return getMessages().investments.typePrivateInvestment; },
  get other() { return getMessages().investments.typeOther; },
};

export const investmentLiquidityLabels: Record<InvestmentLiquidity, string> = {
  get liquid() { return getMessages().investments.liquidityLiquid; },
  get restricted() { return getMessages().investments.liquidityRestricted; },
  get locked() { return getMessages().investments.liquidityLocked; },
};

/** "Simple estimated return", e.g. "+7.00%", "-5.00%", or "Unavailable". */
export function formatEstimatedReturn(estimatedReturn: EstimatedReturn): string {
  if (!estimatedReturn.available) return getMessages().investments.returnUnavailable;
  const percentage = estimatedReturn.basisPoints / 100;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
}
