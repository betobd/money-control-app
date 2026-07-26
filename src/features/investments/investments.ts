import { randomUUID } from 'expo-crypto';

import { SQLiteAccountRepository } from '@/features/accounts/sqlite-account.repository';
import { SQLiteInvestmentRepository } from './sqlite-investment.repository';
import { InvestmentService } from './investment.service';
import { InvestmentValuationService } from './investment-valuation.service';
import { InvestmentPortfolioService } from './investment-portfolio.service';

const accountRepository = new SQLiteAccountRepository();
const investmentRepository = new SQLiteInvestmentRepository();

export const investmentService = new InvestmentService(accountRepository, investmentRepository, {
  createId: randomUUID,
});

export const investmentValuationService = new InvestmentValuationService(
  accountRepository,
  investmentRepository,
  { createId: randomUUID },
);

export const investmentPortfolioService = new InvestmentPortfolioService(
  accountRepository,
  investmentRepository,
);
