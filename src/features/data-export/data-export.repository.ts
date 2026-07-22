import type {
  CreditCardStatementExportSource,
  TransactionExportCount,
  TransactionExportQuery,
  TransactionExportRow,
} from './data-export.types';

export class ExportRowLimitError extends Error {}

export interface DataExportRepository {
  countTransactions(query: TransactionExportQuery): Promise<TransactionExportCount>;
  iterateTransactions(
    query: TransactionExportQuery,
    batchSize: number,
    maximumRows: number,
  ): AsyncIterable<TransactionExportRow>;
  countCreditCardStatements(): Promise<number>;
  listCreditCardStatementSources(): Promise<CreditCardStatementExportSource[]>;
}

