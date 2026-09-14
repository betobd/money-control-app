import * as DocumentPicker from 'expo-document-picker';
import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { getMessages } from '@/i18n/messages';
import { utf8ByteLength } from './backup-limits';
import {
  BackupFileAdapterError,
  type BackupFileAdapter,
  type PickBackupFileResult,
} from './backup-file.adapter';

const BACKUP_DIRECTORY = 'money-control-backups';
const STALE_FILE_AGE_MS = 24 * 60 * 60 * 1_000;

function deleteIfPresent(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best effort and must not turn a completed user action into a failure.
  }
}

function sweepStaleBackups(): void {
  try {
    const directory = new Directory(Paths.cache, BACKUP_DIRECTORY);
    if (!directory.exists) return;
    const staleBefore = Date.now() - STALE_FILE_AGE_MS;
    for (const entry of directory.list()) {
      if (!(entry instanceof File) || !entry.name.startsWith('money-control-')) continue;
      const modifiedAt = entry.info().modificationTime;
      if (modifiedAt !== undefined && modifiedAt < staleBefore) deleteIfPresent(entry);
    }
  } catch {
    // Stale plaintext-backup cleanup is best effort and must not block a new backup.
  }
}

export class ExpoBackupFileAdapter implements BackupFileAdapter {
  async pickBackupFile(maxBytes: number): Promise<PickBackupFileResult> {
    let result: DocumentPicker.DocumentPickerResult;
    try {
      result = await DocumentPicker.getDocumentAsync({
        copyToCacheDirectory: true,
        multiple: false,
        type: '*/*',
      });
    } catch {
      throw new BackupFileAdapterError(
        'file_read_failed',
        getMessages().backup.pickerFailed,
      );
    }
    if (result.canceled) return { status: 'cancelled' };

    const asset = result.assets[0];
    if (!asset) {
      throw new BackupFileAdapterError('file_read_failed', getMessages().backup.noFileSelected);
    }
    const file = new File(asset.uri);
    try {
      const fileSize = asset.size ?? file.size;
      if (fileSize > maxBytes) {
        throw new BackupFileAdapterError(
          'file_too_large',
          getMessages().backup.fileTooLarge,
        );
      }
      const text = await file.text();
      const measuredSize = Math.max(fileSize, utf8ByteLength(text));
      if (measuredSize > maxBytes) {
        throw new BackupFileAdapterError(
          'file_too_large',
          getMessages().backup.fileTooLarge,
        );
      }
      return {
        status: 'selected',
        file: {
          fileName: asset.name,
          fileSize: measuredSize,
          text,
        },
      };
    } catch (cause) {
      if (cause instanceof BackupFileAdapterError) throw cause;
      throw new BackupFileAdapterError(
        'file_read_failed',
        getMessages().backup.readFailed,
      );
    } finally {
      deleteIfPresent(file);
    }
  }

  async writeAndShare(fileName: string, contents: string): Promise<{ fileSize: number }> {
    // Remove any plaintext backup left behind by a previously interrupted share
    // before writing a new one, and isolate backups in their own cache subdir.
    sweepStaleBackups();
    const file = new File(new Directory(Paths.cache, BACKUP_DIRECTORY), fileName);
    let generated = false;
    try {
      try {
        file.create({ intermediates: true, overwrite: true });
        file.write(contents);
        generated = true;
      } catch {
        throw new BackupFileAdapterError(
          'temporary_write_failed',
          getMessages().backup.writeFailed,
        );
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new BackupFileAdapterError(
          'sharing_unavailable',
          getMessages().backup.sharingUnavailable,
          true,
        );
      }
      try {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: getMessages().backup.shareDialogTitle,
          mimeType: 'application/json',
          UTI: 'public.json',
        });
      } catch {
        throw new BackupFileAdapterError(
          'sharing_failed',
          getMessages().backup.sharingOpenFailed,
          true,
        );
      }
      return { fileSize: file.size };
    } catch (cause) {
      if (cause instanceof BackupFileAdapterError) throw cause;
      throw new BackupFileAdapterError(
        generated ? 'sharing_failed' : 'temporary_write_failed',
        generated
          ? getMessages().backup.shareFailed
          : getMessages().backup.writeFailed,
        generated,
      );
    } finally {
      deleteIfPresent(file);
    }
  }
}
