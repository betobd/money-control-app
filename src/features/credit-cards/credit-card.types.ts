import type { AccountWithBalance } from '@/features/accounts/account.types';
import type { TransactionListItem } from '@/features/transactions/transaction.types';

export type CreditCardCycle = {
  previousClosingDate: string;
  nextClosingDate: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextDueDate: string;
};

export type CreditCardStatement = {
  id: string;
  accountId: string;
  periodStart: string;
  periodEnd: string;
  closingDate: string;
  dueDate: string;
  statementBalance: number;
  minimumPayment: number;
  createdAt: string;
  updatedAt: string;
};

export type CreditCardStatementInput = Pick<
  CreditCardStatement,
  'accountId' | 'periodStart' | 'periodEnd' | 'closingDate' | 'dueDate' | 'statementBalance' | 'minimumPayment'
>;

export type CreditCardStatementDefaults = Pick<
  CreditCardStatementInput,
  'accountId' | 'periodStart' | 'periodEnd' | 'closingDate' | 'dueDate'
>;

export type CreditCardStatementField = Exclude<keyof CreditCardStatementInput, 'accountId'>;
export type CreditCardStatementErrors = Partial<Record<CreditCardStatementField, string>>;

export type CreditCardStatementStatus =
  | 'upcoming'
  | 'balance-due'
  | 'partially-paid'
  | 'minimum-covered'
  | 'paid'
  | 'overdue'
  | 'no-balance-due';

export type CreditCardStatementView = CreditCardStatement & {
  amountPaid: number;
  amountPaidByDueDate: number;
  amountPaidAfterDueDate: number;
  remainingStatement: number;
  overpayment: number;
  minimumPaidAmount: number;
  minimumRemaining: number;
  minimumCovered: boolean;
  paidOnTime: boolean;
  status: CreditCardStatementStatus;
};

export type CreditCardUtilizationStatus = 'low' | 'moderate' | 'high' | 'very-high' | 'over-limit';

export type CreditCardUtilization = {
  currentDebt: number;
  availableCredit: number | null;
  utilizationBasisPoints: number | null;
  visualProgressWidth: `${number}%`;
  status: CreditCardUtilizationStatus | 'unavailable';
};

export type CreditCardDetails = {
  account: AccountWithBalance;
  setupComplete: boolean;
  cycle: CreditCardCycle | null;
  utilization: CreditCardUtilization;
  statements: CreditCardStatementView[];
  latestStatement: CreditCardStatementView | null;
  recentPurchases: TransactionListItem[];
  recentPayments: TransactionListItem[];
};

export type CreditCardPaymentOption = 'minimum-payment' | 'statement-remaining' | 'current-debt' | 'other';

export type CreditCardPaymentOptionView = {
  type: CreditCardPaymentOption;
  label: string;
  amount: number | null;
  isAvailable: boolean;
  unavailableReason: string | null;
};

export type CreditCardPaymentInput = {
  cardAccountId: string;
  sourceAccountId: string;
  option: CreditCardPaymentOption;
  amount: number | null;
  transactionDate: string;
  note: string | null;
  confirmOverpayment?: boolean;
};

export type CreditCardPaymentPreview = {
  cardAccountId: string;
  sourceAccountId: string;
  sourceAccountName: string;
  sourceBalance: number;
  option: CreditCardPaymentOption;
  optionLabel: string;
  currentDebt: number;
  statementRemaining: number;
  minimumRemaining: number;
  amount: number;
  expectedCardBalance: number;
  expectedDebt: number;
  expectedStatementRemaining: number;
  amountBeyondStatement: number;
  overpaymentAmount: number;
};
