import { BACKUP_CHECKSUM_ALGORITHM, BACKUP_CURRENCY, BACKUP_FORMAT, BACKUP_TIMEZONE, CURRENT_BACKUP_FORMAT_VERSION, type BackupDataV2, type BackupFileV2, type BackupOverview } from './backup.types';
import type { BackupChecksumService } from './backup-checksum.service';

type BackupMetadata = {
  appVersion: string;
  schemaVersion: string;
  createdAt: string;
};

function compareIds(left: { id: string }, right: { id: string }): number {
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

export function sortBackupData(data: BackupDataV2): BackupDataV2 {
  return {
    accounts: [...data.accounts].sort(compareIds),
    categories: [...data.categories].sort(compareIds),
    transactions: [...data.transactions].sort(compareIds),
    transactionSplits: [...data.transactionSplits].sort(compareIds),
    budgets: [...data.budgets].sort(compareIds),
    recurringTransactions: [...data.recurringTransactions].sort(compareIds),
    recurringOccurrences: [...data.recurringOccurrences].sort(compareIds),
    creditCardStatements: [...data.creditCardStatements].sort(compareIds),
  };
}

export function createBackupOverview(data: BackupDataV2): BackupOverview {
  let oldest: string | null = null;
  let newest: string | null = null;
  for (const transaction of data.transactions) {
    if (oldest === null || transaction.transactionDate < oldest) oldest = transaction.transactionDate;
    if (newest === null || transaction.transactionDate > newest) newest = transaction.transactionDate;
  }
  return {
    summary: {
      accounts: data.accounts.length,
      categories: data.categories.length,
      transactions: data.transactions.length,
      transactionSplits: data.transactionSplits.length,
      budgets: data.budgets.length,
      recurringRules: data.recurringTransactions.length,
      recurringOccurrences: data.recurringOccurrences.length,
      creditCardStatements: data.creditCardStatements.length,
    },
    transactionDateRange: { oldest, newest },
  };
}

export class BackupSerializer {
  constructor(private readonly checksum: BackupChecksumService) {}

  async create(data: BackupDataV2, metadata: BackupMetadata): Promise<BackupFileV2> {
    const orderedData = sortBackupData(data);
    const overview = createBackupOverview(orderedData);
    const draft: BackupFileV2 = {
      format: BACKUP_FORMAT,
      formatVersion: CURRENT_BACKUP_FORMAT_VERSION,
      appVersion: metadata.appVersion,
      createdAt: metadata.createdAt,
      timezone: BACKUP_TIMEZONE,
      currency: BACKUP_CURRENCY,
      schemaVersion: metadata.schemaVersion,
      ...overview,
      data: orderedData,
      integrity: {
        algorithm: BACKUP_CHECKSUM_ALGORITHM,
        checksum: '',
      },
    };
    return {
      ...draft,
      integrity: {
        ...draft.integrity,
        checksum: await this.checksum.calculate(draft),
      },
    };
  }

  stringify(file: BackupFileV2): string {
    return `${JSON.stringify(file, null, 2)}\n`;
  }
}

export function createBackupFileName(createdAt: string): string {
  const date = new Date(createdAt);
  if (!Number.isFinite(date.getTime())) throw new Error('Cannot create a backup filename from an invalid timestamp.');
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: BACKUP_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';
  return `money-control-backup-${value('year')}-${value('month')}-${value('day')}-${value('hour')}${value('minute')}${value('second')}.json`;
}
