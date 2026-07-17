import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

import { utf8ByteLength } from './backup-limits';
import {
  BackupFileAdapterError,
  type BackupFileAdapter,
  type PickBackupFileResult,
} from './backup-file.adapter';

function deleteIfPresent(file: File): void {
  try {
    if (file.exists) file.delete();
  } catch {
    // Cache cleanup is best effort and must not turn a completed user action into a failure.
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
        'The Android document picker could not be opened. Try again.',
      );
    }
    if (result.canceled) return { status: 'cancelled' };

    const asset = result.assets[0];
    if (!asset) {
      throw new BackupFileAdapterError('file_read_failed', 'No readable file was selected.');
    }
    const file = new File(asset.uri);
    try {
      const fileSize = asset.size ?? file.size;
      if (fileSize > maxBytes) {
        throw new BackupFileAdapterError(
          'file_too_large',
          'The selected backup is larger than the 25 MiB safety limit.',
        );
      }
      const text = await file.text();
      const measuredSize = Math.max(fileSize, utf8ByteLength(text));
      if (measuredSize > maxBytes) {
        throw new BackupFileAdapterError(
          'file_too_large',
          'The selected backup is larger than the 25 MiB safety limit.',
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
        'Money Control could not read the selected file. Choose another file and try again.',
      );
    } finally {
      deleteIfPresent(file);
    }
  }

  async writeAndShare(fileName: string, contents: string): Promise<{ fileSize: number }> {
    const file = new File(Paths.cache, fileName);
    let generated = false;
    try {
      try {
        file.create({ intermediates: true, overwrite: true });
        file.write(contents);
        generated = true;
      } catch {
        throw new BackupFileAdapterError(
          'temporary_write_failed',
          'The backup could not be written. Check available device storage and try again.',
        );
      }

      if (!(await Sharing.isAvailableAsync())) {
        throw new BackupFileAdapterError(
          'sharing_unavailable',
          'The backup was generated, but the native save/share interface is unavailable.',
          true,
        );
      }
      try {
        await Sharing.shareAsync(file.uri, {
          dialogTitle: 'Save or share Money Control backup',
          mimeType: 'application/json',
          UTI: 'public.json',
        });
      } catch {
        throw new BackupFileAdapterError(
          'sharing_failed',
          'The backup was generated, but the native save/share interface could not be opened.',
          true,
        );
      }
      return { fileSize: file.size };
    } catch (cause) {
      if (cause instanceof BackupFileAdapterError) throw cause;
      throw new BackupFileAdapterError(
        generated ? 'sharing_failed' : 'temporary_write_failed',
        generated
          ? 'The backup was generated, but it could not be shared.'
          : 'The backup could not be written. Check available device storage and try again.',
        generated,
      );
    } finally {
      deleteIfPresent(file);
    }
  }
}
