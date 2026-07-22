export type ExportFileAdapterErrorCode =
  | 'temporary_write_failed'
  | 'sharing_unavailable'
  | 'sharing_failed';

export class ExportFileAdapterError extends Error {
  constructor(
    public readonly code: ExportFileAdapterErrorCode,
    message: string,
    public readonly fileGenerated = false,
  ) {
    super(message);
  }
}

export interface ExportFileAdapter {
  writeAndShare(
    fileName: string,
    chunks: AsyncIterable<string>,
  ): Promise<{ fileSize: number; nativeInterfaceOpened: true }>;
  cleanupStaleFiles(): Promise<void>;
}
