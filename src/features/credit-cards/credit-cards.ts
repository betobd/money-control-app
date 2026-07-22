import { randomUUID } from 'expo-crypto';

import { SQLiteAccountRepository } from '@/features/accounts/sqlite-account.repository';
import { transactionService } from '@/features/transactions/transactions';
import { CreditCardCycleService } from './credit-card-cycle.service';
import { CreditCardPaymentService } from './credit-card-payment.service';
import { CreditCardService } from './credit-card.service';
import { CreditCardStatementService } from './credit-card-statement.service';
import { SQLiteCreditCardRepository } from './sqlite-credit-card.repository';

const accountRepository = new SQLiteAccountRepository();
const creditCardRepository = new SQLiteCreditCardRepository();
export const creditCardCycleService = new CreditCardCycleService();
export const creditCardStatementService = new CreditCardStatementService(
  creditCardRepository,
  accountRepository,
  creditCardCycleService,
  randomUUID,
);
export const creditCardService = new CreditCardService(
  accountRepository,
  creditCardStatementService,
  transactionService,
  creditCardCycleService,
);
export const creditCardPaymentService = new CreditCardPaymentService(
  creditCardService,
  accountRepository,
  transactionService,
);
