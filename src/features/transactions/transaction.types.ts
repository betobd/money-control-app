export const supportedTransactionTypes = ['expense', 'income'] as const;
export type SupportedTransactionType = (typeof supportedTransactionTypes)[number];
export type TransactionStatus = 'posted' | 'voided';

export type TransactionInput = { type: SupportedTransactionType; amount: number; accountId: string; categoryId: string; transactionDate: string; note: string | null };
export type TransactionRecord = TransactionInput & { id: string; status: TransactionStatus; currency: 'COP'; destinationAccountId: null; createdAt: string; updatedAt: string };
export type TransactionField = keyof TransactionInput;
export type TransactionValidationErrors = Partial<Record<TransactionField, string>>;
export type TransactionListItem = TransactionRecord & { accountName: string; categoryName: string; categoryIcon: string };
export type TransactionSection = { id: string; label: string; transactions: TransactionListItem[] };
export type MonthlyTransactionSummary = { income: number; expenses: number; net: number };
