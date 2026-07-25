import {
  CURRENT_BACKUP_FORMAT_VERSION,
  type BackupDataV4,
  type BackupFile,
  type BackupTransaction,
  type BackupTransactionV2,
  type BackupTransactionV3,
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
function toV4Transaction(
  transaction: (BackupTransactionV2 | BackupTransactionV3) & { originalTransactionId?: string | null },
): BackupTransaction {
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

export class BackupFormatMigrator {
  assertSupported(version: number): void {
    if (version !== 1 && version !== 2 && version !== 3 && version !== CURRENT_BACKUP_FORMAT_VERSION) {
      throw new UnsupportedBackupVersionError(version);
    }
  }

  migrate(file: BackupFile): BackupDataV4 {
    switch (file.formatVersion) {
      case 1:
        return {
          ...file.data,
          accounts: file.data.accounts.map((account) => ({
            ...account,
            statementClosingDay: null,
            paymentDueDay: null,
          })),
          transactions: file.data.transactions.map(toV4Transaction),
          creditCardStatements: [],
          exchangeRate: null,
        };
      case 2:
        return {
          ...file.data,
          transactions: file.data.transactions.map(toV4Transaction),
          exchangeRate: null,
        };
      case 3:
        return {
          ...file.data,
          transactions: file.data.transactions.map(toV4Transaction),
          exchangeRate: null,
        };
      case 4:
        return file.data;
    }
  }
}
