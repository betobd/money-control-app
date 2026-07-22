import { backupLimits } from './backup-limits';
import type { BackupChecksumService } from './backup-checksum.service';
import type { BackupFileAdapter, PickBackupFileResult } from './backup-file.adapter';
import type { BackupFormatMigrator } from './backup-format-migrator';
import type { BackupRepository } from './backup.repository';
import { createBackupFileName, createBackupOverview, type BackupSerializer } from './backup-serializer';
import type {
  BackupExportResult,
  BackupFile,
  BackupOverview,
  BackupPreview,
  BackupRestoreResult,
  RestoreCandidate,
} from './backup.types';
import type { BackupValidator } from './backup-validator';

type BackupServiceOptions = {
  appVersion: string;
  schemaVersion: string;
  now?: () => string;
  notifyRestored: () => void;
  afterRestore?: () => Promise<void>;
};

export type SelectBackupResult =
  | { status: 'cancelled' }
  | { status: 'ready'; candidate: RestoreCandidate };

export class BackupService {
  private readonly now: () => string;

  constructor(
    private readonly repository: BackupRepository,
    private readonly serializer: BackupSerializer,
    private readonly validator: BackupValidator,
    private readonly checksum: BackupChecksumService,
    private readonly migrator: BackupFormatMigrator,
    private readonly files: BackupFileAdapter,
    private readonly options: BackupServiceOptions,
  ) {
    this.now = options.now ?? (() => new Date().toISOString());
  }

  getCurrentOverview(): Promise<BackupOverview> {
    return this.repository.readOverview();
  }

  async createBackup(): Promise<BackupExportResult> {
    const data = await this.repository.readSnapshot();
    const createdAt = this.now();
    const file = await this.serializer.create(data, {
      appVersion: this.options.appVersion,
      schemaVersion: this.options.schemaVersion,
      createdAt,
    });
    const contents = this.serializer.stringify(file);
    await this.parseBackup(contents, 0);
    const fileName = createBackupFileName(createdAt);
    const result = await this.files.writeAndShare(fileName, contents);
    return {
      fileName,
      fileSize: result.fileSize,
      summary: file.summary,
      transactionDateRange: file.transactionDateRange,
      nativeShareOpened: true,
    };
  }

  async selectBackup(): Promise<SelectBackupResult> {
    const selected: PickBackupFileResult = await this.files.pickBackupFile(backupLimits.maxFileBytes);
    if (selected.status === 'cancelled') return selected;
    const parsed = await this.parseBackup(selected.file.text, selected.file.fileSize);
    const warnings: string[] = [];
    if (parsed.file.schemaVersion !== this.options.schemaVersion) {
      warnings.push(
        `Created with database schema ${parsed.file.schemaVersion}; backup format ${parsed.file.formatVersion} is compatible.`,
      );
    }
    const overview = createBackupOverview(parsed.data);
    const preview: BackupPreview = {
      fileName: selected.file.fileName,
      fileSize: selected.file.fileSize,
      createdAt: parsed.file.createdAt,
      formatVersion: parsed.file.formatVersion,
      appVersion: parsed.file.appVersion,
      currency: parsed.file.currency,
      schemaVersion: parsed.file.schemaVersion,
      summary: overview.summary,
      transactionDateRange: overview.transactionDateRange,
      compatible: true,
      warnings,
    };
    return {
      status: 'ready',
      candidate: { ...parsed, preview },
    };
  }

  async restore(candidate: RestoreCandidate): Promise<BackupRestoreResult> {
    const parsed = await this.validateFile(candidate.file);
    const result = await this.repository.replaceAll(parsed.data);
    await this.options.afterRestore?.();
    this.options.notifyRestored();
    return result;
  }

  private async parseBackup(
    text: string,
    fileSize: number,
  ): Promise<{ file: BackupFile; data: RestoreCandidate['data'] }> {
    const envelope = this.validator.parseEnvelope(text, fileSize);
    this.migrator.assertSupported(envelope.formatVersion);
    const file = envelope.formatVersion === 1
      ? this.validator.validateV1(envelope.raw)
      : this.validator.validateV2(envelope.raw);
    return this.validateFile(file);
  }

  private async validateFile(
    file: BackupFile,
  ): Promise<{ file: BackupFile; data: RestoreCandidate['data'] }> {
    this.validator.validateRelationships(file);
    if (!(await this.checksum.verify(file))) throw this.validator.checksumMismatch();
    return { file, data: this.migrator.migrate(file) };
  }
}
