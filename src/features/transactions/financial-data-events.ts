import type { TransactionListItem, TransactionRecord } from './transaction.types';

export type FinancialDataChange =
  | {
      kind: 'transaction';
      operation: 'create' | 'update' | 'void';
      before?: TransactionListItem;
      after?: TransactionRecord | TransactionListItem;
    }
  | { kind: 'budget'; operation: 'create' | 'update' | 'remove'; budgetId: string }
  | { kind: 'restore' }
  | { kind: 'unspecified' };

type Listener = (change: FinancialDataChange) => void;

const listeners = new Set<Listener>();

export function notifyFinancialDataChanged(change: FinancialDataChange = { kind: 'unspecified' }): void {
  for (const listener of listeners) listener(change);
}

export function subscribeToFinancialDataChanges(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
