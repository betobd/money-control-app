import type { CurrencyCode } from '@/features/currency/currency';
import type { CategorizedTransactionType, SupportedTransactionType } from '@/features/transactions/transaction.types';

export const recurringFrequencies = ['daily', 'weekly', 'monthly', 'yearly'] as const;
export type RecurringFrequency = (typeof recurringFrequencies)[number];
export type RecurringOccurrenceStatus = 'pending' | 'posted' | 'skipped';

type RecurringShapeBase = {
  amount: number;
  accountId: string;
  note: string | null;
};

export type RecurringTransactionShape =
  | (RecurringShapeBase & {
      type: CategorizedTransactionType;
      /** Always the top-level category, matching how transactions store it. */
      categoryId: string;
      subcategoryId: string | null;
      destinationAccountId: null;
    })
  | (RecurringShapeBase & {
      type: 'transfer';
      categoryId: null;
      subcategoryId: null;
      destinationAccountId: string;
    });

export type RecurringRuleInput = RecurringTransactionShape & {
  frequency: RecurringFrequency;
  interval: number;
  startDate: string;
  endDate: string | null;
};

export type RecurringRuleRecord = RecurringRuleInput & {
  id: string;
  currency: CurrencyCode;
  nextOccurrenceDate: string;
  isActive: boolean;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringRuleListItem = RecurringRuleRecord & {
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
};

export type RecurringOccurrenceRecord = RecurringTransactionShape & {
  id: string;
  recurringTransactionId: string;
  scheduledDate: string;
  status: RecurringOccurrenceStatus;
  currency: CurrencyCode;
  transactionId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type RecurringOccurrenceListItem = RecurringOccurrenceRecord & {
  accountName: string;
  destinationAccountName: string | null;
  categoryName: string | null;
  subcategoryName: string | null;
};

export type RecurringRuleField =
  | 'type'
  | 'amount'
  | 'accountId'
  | 'destinationAccountId'
  | 'categoryId'
  | 'subcategoryId'
  | 'frequency'
  | 'interval'
  | 'startDate'
  | 'endDate'
  | 'note';

export type RecurringRuleValidationErrors = Partial<Record<RecurringRuleField, string>>;

export type RecurringGenerationResult = {
  generated: number;
  limitedRules: number;
};

export function isSupportedRecurringType(value: string): value is SupportedTransactionType {
  return value === 'expense' || value === 'income' || value === 'transfer';
}
