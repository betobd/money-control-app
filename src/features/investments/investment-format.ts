import type { EstimatedReturn, InvestmentLiquidity, InvestmentType } from './investment.types';

export const investmentTypeLabels: Record<InvestmentType, string> = {
  brokerage: 'Brokerage',
  fixed_term_deposit: 'Fixed-term deposit',
  voluntary_pension: 'Voluntary pension',
  investment_fund: 'Investment fund',
  private_investment: 'Private investment',
  other: 'Other',
};

export const investmentLiquidityLabels: Record<InvestmentLiquidity, string> = {
  liquid: 'Liquid',
  restricted: 'Restricted',
  locked: 'Locked',
};

/** "Simple estimated return", e.g. "+7.00%", "-5.00%", or "Unavailable". */
export function formatEstimatedReturn(estimatedReturn: EstimatedReturn): string {
  if (!estimatedReturn.available) return 'Unavailable';
  const percentage = estimatedReturn.basisPoints / 100;
  const sign = percentage > 0 ? '+' : '';
  return `${sign}${percentage.toFixed(2)}%`;
}
