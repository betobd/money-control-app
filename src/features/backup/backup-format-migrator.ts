import { CURRENT_BACKUP_FORMAT_VERSION, type BackupDataV2, type BackupFile } from './backup.types';

export class UnsupportedBackupVersionError extends Error {
  constructor(public readonly version: number) {
    super(
      version > CURRENT_BACKUP_FORMAT_VERSION
        ? `This backup uses future format version ${version}. Update Money Control before restoring it.`
        : `Backup format version ${version} is not supported.`,
    );
  }
}

export class BackupFormatMigrator {
  assertSupported(version: number): void {
    if (version !== 1 && version !== CURRENT_BACKUP_FORMAT_VERSION) {
      throw new UnsupportedBackupVersionError(version);
    }
  }

  migrate(file: BackupFile): BackupDataV2 {
    switch (file.formatVersion) {
      case 1:
        return {
          ...file.data,
          accounts: file.data.accounts.map((account) => ({
            ...account,
            statementClosingDay: null,
            paymentDueDay: null,
          })),
          creditCardStatements: [],
        };
      case 2:
        return file.data;
    }
  }
}
