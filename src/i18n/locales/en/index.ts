/**
 * English: the source catalog. Every other language is typed against this
 * shape, so a key added here fails type checking until it is translated.
 */
import { common } from './common';
import { onboarding } from './onboarding';
import { more } from './more';
import { transactions } from './transactions';
import { addTransaction } from './add-transaction';
import { refunds } from './refunds';
import { categories } from './categories';
import { accounts } from './accounts';
import { creditCards } from './credit-cards';
import { backup } from './backup';
import { dataExport } from './data-export';
import { investments } from './investments';
import { exchangeRates } from './exchange-rates';
import { currency } from './currency';
import { security } from './security';
import { notifications } from './notifications';
import { reports } from './reports';
import { home } from './home';
import { budgets } from './budgets';
import { recurring } from './recurring';

export const en = {
  common,
  onboarding,
  more,
  transactions,
  addTransaction,
  refunds,
  categories,
  accounts,
  creditCards,
  backup,
  dataExport,
  investments,
  exchangeRates,
  currency,
  security,
  notifications,
  reports,
  home,
  budgets,
  recurring,
};
