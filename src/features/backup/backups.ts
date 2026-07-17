import Constants from 'expo-constants';
import { CryptoDigestAlgorithm, digestStringAsync } from 'expo-crypto';

import { notifyFinancialDataChanged } from '@/features/transactions/financial-data-events';
import { BackupChecksumService } from './backup-checksum.service';
import { BackupFormatMigrator } from './backup-format-migrator';
import { BackupSerializer } from './backup-serializer';
import { BackupService } from './backup.service';
import { CURRENT_DATABASE_SCHEMA_VERSION } from './backup.types';
import { BackupValidator } from './backup-validator';
import { ExpoBackupFileAdapter } from './expo-backup-file.adapter';
import { SQLiteBackupRepository } from './sqlite-backup.repository';

const checksum = new BackupChecksumService((value) =>
  digestStringAsync(CryptoDigestAlgorithm.SHA256, value));

export const backupService = new BackupService(
  new SQLiteBackupRepository(),
  new BackupSerializer(checksum),
  new BackupValidator(),
  checksum,
  new BackupFormatMigrator(),
  new ExpoBackupFileAdapter(),
  {
    appVersion: Constants.expoConfig?.version ?? 'unknown',
    schemaVersion: CURRENT_DATABASE_SCHEMA_VERSION,
    notifyRestored: notifyFinancialDataChanged,
  },
);
