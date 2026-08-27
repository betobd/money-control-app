import {
  CURRENT_BACKUP_FORMAT_VERSION,
  type BackupCategory,
  type BackupCategoryV5,
  type BackupDataV5,
  type BackupDataV6,
  type BackupDataV7,
  type BackupFile,
  type BackupRecurringOccurrence,
  type BackupRecurringOccurrenceV5,
  type BackupRecurringTransaction,
  type BackupRecurringTransactionV5,
  type BackupTransaction,
  type BackupTransactionV2,
  type BackupTransactionV3,
  type BackupTransactionV5,
  type BackupTransactionV6,
} from './backup.types';

export class UnsupportedBackupVersionError extends Error {
  constructor(public readonly version: number) {
    super(
      version > CURRENT_BACKUP_FORMAT_VERSION
        ? `This backup uses future format version ${version}. Update Money Control before restoring it.`
        : `Backup format version ${version} is not supported.`,
    );
  }
}

/**
 * Upcasts a legacy (COP-only) transaction to the format-v4 shape: the COP base
 * amount equals the native amount, transfers migrate as same-currency COP with a
 * COP destination leg, and no exchange-rate snapshot is invented.
 */
function toV5Transaction(
  transaction: (BackupTransactionV2 | BackupTransactionV3) & { originalTransactionId?: string | null },
): BackupTransactionV5 {
  const isTransfer = transaction.type === 'transfer';
  return {
    ...transaction,
    currency: 'COP',
    originalTransactionId: transaction.originalTransactionId ?? null,
    baseAmountMinor: isTransfer ? null : transaction.amount,
    exchangeRateScaled: null,
    exchangeRateScale: null,
    exchangeRateDate: null,
    exchangeRateSource: null,
    destinationAmountMinor: isTransfer ? transaction.amount : null,
    destinationCurrencyCode: isTransfer ? 'COP' : null,
  };
}

/** Legacy backups (v1–v4) carried no investments; add the empty collections. */
function noInvestments(): Pick<BackupDataV5, 'investmentAccounts' | 'investmentValuations'> {
  return { investmentAccounts: [], investmentValuations: [] };
}

/**
 * Upgrades a v1–v5 payload to v6 by filling nulls.
 *
 * Nothing is transformed and nothing is inferred: a null parent means "this was
 * already a top-level category" and a null subcategory means "classified exactly
 * as before". That is the same statement migration 0013 makes about the
 * database, so a restored legacy backup and an upgraded database agree.
 */
function toV6Data(data: BackupDataV5): BackupDataV6 {
  return {
    ...data,
    categories: data.categories.map(
      (category: BackupCategoryV5): BackupCategory => ({ ...category, parentCategoryId: null }),
    ),
    transactions: data.transactions.map(
      (transaction: BackupTransactionV5): BackupTransactionV6 => ({ ...transaction, subcategoryId: null }),
    ),
    recurringTransactions: data.recurringTransactions.map(
      (rule: BackupRecurringTransactionV5): BackupRecurringTransaction => ({ ...rule, subcategoryId: null }),
    ),
    recurringOccurrences: data.recurringOccurrences.map(
      (occurrence: BackupRecurringOccurrenceV5): BackupRecurringOccurrence => ({ ...occurrence, subcategoryId: null }),
    ),
  };
}

/**
 * Upgrades a v1–v6 payload to v7 by writing down what used to be implied.
 *
 * Every backup written before v7 came from an install whose base currency was
 * COP — it was the only one the app had — and every rate snapshot in one was
 * "1 USD = r COP", the only pair that could be recorded. Both facts are stated
 * explicitly here rather than left to be re-derived at read time. Nothing is
 * converted: the numbers are untouched, only labelled.
 */
function toV7Data(data: BackupDataV6): BackupDataV7 {
  const { exchangeRate, ...rest } = data;
  return {
    ...rest,
    baseCurrencyCode: 'COP',
    exchangeRates: exchangeRate ? [exchangeRate] : [],
    transactions: data.transactions.map((transaction: BackupTransactionV6): BackupTransaction => ({
      ...transaction,
      baseCurrencyCode: transaction.type === 'transfer' ? null : 'COP',
      exchangeRateBaseCode: transaction.exchangeRateScaled === null ? null : 'USD',
      exchangeRateQuoteCode: transaction.exchangeRateScaled === null ? null : 'COP',
    })),
  };
}

export class BackupFormatMigrator {
  assertSupported(version: number): void {
    if (
      version !== 1 && version !== 2 && version !== 3 && version !== 4 && version !== 5
      && version !== 6 && version !== CURRENT_BACKUP_FORMAT_VERSION
    ) {
      throw new UnsupportedBackupVersionError(version);
    }
  }

  migrate(file: BackupFile): BackupDataV7 {
    switch (file.formatVersion) {
      case 1:
        return toV7Data(toV6Data({
          ...file.data,
          accounts: file.data.accounts.map((account) => ({
            ...account,
            statementClosingDay: null,
            paymentDueDay: null,
          })),
          transactions: file.data.transactions.map(toV5Transaction),
          creditCardStatements: [],
          exchangeRate: null,
          ...noInvestments(),
        }));
      case 2:
        return toV7Data(toV6Data({
          ...file.data,
          transactions: file.data.transactions.map(toV5Transaction),
          exchangeRate: null,
          ...noInvestments(),
        }));
      case 3:
        return toV7Data(toV6Data({
          ...file.data,
          transactions: file.data.transactions.map(toV5Transaction),
          exchangeRate: null,
          ...noInvestments(),
        }));
      case 4:
        return toV7Data(toV6Data({ ...file.data, ...noInvestments() }));
      case 5:
        return toV7Data(toV6Data(file.data));
      case 6:
        return toV7Data(file.data);
      case 7:
        return file.data;
    }
  }
}
