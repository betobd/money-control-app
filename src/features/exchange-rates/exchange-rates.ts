import { ExchangeRateService } from './exchange-rate.service';
import { FrankfurterExchangeRateProvider } from './frankfurter.provider';
import { SQLiteExchangeRateRepository } from './sqlite-exchange-rate.repository';

export const exchangeRateService = new ExchangeRateService(
  new SQLiteExchangeRateRepository(),
  new FrankfurterExchangeRateProvider(),
);
