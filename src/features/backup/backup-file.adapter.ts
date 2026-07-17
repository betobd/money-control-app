export type PickedBackupFile = {
  fileName: string;
  fileSize: number;
  text: string;
};

export type PickBackupFileResult =
  | { status: 'cancelled' }
  | { status: 'selected'; file: PickedBackupFile };

export type BackupFileAdapterErrorCode =
  | 'file_too_large'
  | 'file_read_failed'
  | 'temporary_write_failed'
  | 'sharing_unavailable'
  | 'sharing_failed';

export class BackupFileAdapterError extends Error {
  constructor(
    public readonly code: BackupFileAdapterErrorCode,
    message: string,
    public readonly fileGenerated = false,
  ) {
    super(message);
  }
}

export interface BackupFileAdapter {
  pickBackupFile(maxBytes: number): Promise<PickBackupFileResult>;
  writeAndShare(fileName: string, contents: string): Promise<{ fileSize: number }>;
}
