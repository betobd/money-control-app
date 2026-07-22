import type { BackupDataV2, BackupOverview } from './backup.types';

export type BackupRestoreErrorCode =
  | 'count_mismatch'
  | 'foreign_key_check_failed'
  | 'integrity_check_failed'
  | 'domain_integrity_failed';

export class BackupRestoreError extends Error {
  constructor(
    public readonly code: BackupRestoreErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface BackupRepository {
  readOverview(): Promise<BackupOverview>;
  readSnapshot(): Promise<BackupDataV2>;
  replaceAll(data: BackupDataV2): Promise<BackupOverview>;
}
