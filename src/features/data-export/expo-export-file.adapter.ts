import { Directory, File, FileMode, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getMessages } from '@/i18n/messages';

import {
  ExportFileAdapterError,
  type ExportFileAdapter,
} from './export-file.adapter';

const EXPORT_DIRECTORY = 'money-control-exports';
const STALE_FILE_AGE_MS = 24 * 60 * 60 * 1_000;

function deleteIfPresent(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Temporary cache cleanup is best effort and never touches user-saved external files.
  }
}

export class ExpoExportFileAdapter implements ExportFileAdapter {
  async writeAndShare(
    fileName: string,
    chunks: AsyncIterable<string>,
  ): Promise<{ fileSize: number; nativeInterfaceOpened: true }> {
    const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
    const file = new File(directory, fileName);
    const encoder = new TextEncoder();
    let generated = false;
    let fileSize = 0;

    try {
      try {
        directory.create({ idempotent: true, intermediates: true });
        file.create({ overwrite: true });
        const handle = file.open(FileMode.WriteOnly);
        try {
          for await (const chunk of chunks) {
            const bytes = encoder.encode(chunk);
            handle.writeBytes(bytes);
            fileSize += bytes.byteLength;
          }
        } finally {
          handle.close();
        }
        generated = true;
      } catch {
        throw new ExportFileAdapterError(
          'temporary_write_failed',
          getMessages().dataExport.writeFailed,
        );
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new ExportFileAdapterError(
          'sharing_unavailable',
          getMessages().dataExport.sharingUnavailable,
          true,
        );
      }

      try {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: getMessages().dataExport.shareDialogTitle,
          mimeType: 'text/csv',
          UTI: 'public.comma-separated-values-text',
        });
      } catch {
        throw new ExportFileAdapterError(
          'sharing_failed',
          getMessages().dataExport.sharingOpenFailed,
          true,
        );
      }

      return { fileSize, nativeInterfaceOpened: true };
    } catch (cause) {
      if (cause instanceof ExportFileAdapterError) throw cause;
      throw new ExportFileAdapterError(
        generated ? 'sharing_failed' : 'temporary_write_failed',
        generated
          ? getMessages().dataExport.shareFailed
          : getMessages().dataExport.writeFailed,
        generated,
      );
    } finally {
      deleteIfPresent(file);
    }
  }

  async cleanupStaleFiles(): Promise<void> {
    try {
      const directory = new Directory(Paths.cache, EXPORT_DIRECTORY);
      if (!directory.exists) return;
      const staleBefore = Date.now() - STALE_FILE_AGE_MS;
      for (const entry of directory.list()) {
        if (!(entry instanceof File) || !entry.name.startsWith('money-control-')) continue;
        const modifiedAt = entry.info().modificationTime;
        if (modifiedAt !== undefined && modifiedAt < staleBefore) deleteIfPresent(entry);
      }
    } catch {
      // Stale app-cache cleanup is best effort and must not block a new export.
    }
  }
}
