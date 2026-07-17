import { CURRENT_BACKUP_FORMAT_VERSION, type BackupDataV1, type BackupFileV1 } from './backup.types';

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
    if (version !== CURRENT_BACKUP_FORMAT_VERSION) {
      throw new UnsupportedBackupVersionError(version);
    }
  }

  migrate(file: BackupFileV1): BackupDataV1 {
    switch (file.formatVersion) {
      case 1:
        return file.data;
    }
  }
}
