import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { BackupFileAdapterError } from './backup-file.adapter';
import { UnsupportedBackupVersionError } from './backup-format-migrator';
import { BackupRestoreError } from './backup.repository';
import type { BackupOverview, RestoreCandidate } from './backup.types';
import { BackupValidationError } from './backup-validator';
import { backupService } from './backups';

export type BackupOperation = 'exporting' | 'selecting' | 'restoring' | null;

function userMessage(cause: unknown, action: BackupOperation): string {
  if (cause instanceof BackupValidationError) return cause.message;
  if (cause instanceof UnsupportedBackupVersionError) return cause.message;
  if (cause instanceof BackupFileAdapterError) {
    return cause.fileGenerated
      ? `${cause.message} Money Control cannot confirm that a destination copy was saved.`
      : cause.message;
  }
  if (cause instanceof BackupRestoreError) {
    return `${cause.message} Your original local data was kept unchanged.`;
  }
  if (action === 'restoring') {
    return 'Restore failed and was rolled back. Your original local data was kept unchanged. Try the backup again.';
  }
  if (action === 'exporting') {
    return 'The backup could not be created. Check available storage and try again.';
  }
  return 'The selected backup could not be opened. Choose another file and try again.';
}

export function useBackup() {
  const [overview, setOverview] = useState<BackupOverview>();
  const [candidate, setCandidate] = useState<RestoreCandidate>();
  const [loadingOverview, setLoadingOverview] = useState(true);
  const [operation, setOperation] = useState<BackupOperation>(null);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const loadOverview = useCallback(async () => {
    setLoadingOverview(true);
    try {
      setOverview(await backupService.getCurrentOverview());
    } catch {
      setError('Current backup counts could not be loaded. Try reopening this screen.');
    } finally {
      setLoadingOverview(false);
    }
  }, []);

  useFocusEffect(useCallback(() => {
    void loadOverview();
  }, [loadOverview]));

  const createBackup = useCallback(async () => {
    if (operation) return;
    setOperation('exporting');
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await backupService.createBackup();
      setNotice(
        `${result.fileName} was generated and the native save/share interface opened. Money Control cannot confirm whether you saved or shared the file.`,
      );
      setOverview({
        summary: result.summary,
        transactionDateRange: result.transactionDateRange,
      });
    } catch (cause) {
      setError(userMessage(cause, 'exporting'));
    } finally {
      setOperation(null);
    }
  }, [operation]);

  const selectBackup = useCallback(async () => {
    if (operation) return;
    setOperation('selecting');
    setError(undefined);
    setNotice(undefined);
    setCandidate(undefined);
    try {
      const result = await backupService.selectBackup();
      if (result.status === 'ready') setCandidate(result.candidate);
    } catch (cause) {
      setError(userMessage(cause, 'selecting'));
    } finally {
      setOperation(null);
    }
  }, [operation]);

  const restore = useCallback(async () => {
    if (operation || !candidate) return;
    setOperation('restoring');
    setError(undefined);
    setNotice(undefined);
    try {
      const result = await backupService.restore(candidate);
      setOverview(result);
      setCandidate(undefined);
      setNotice(
        `Restore complete: ${result.summary.accounts} accounts, ${result.summary.transactions} transactions, and ${result.summary.budgets} budgets are now active.`,
      );
    } catch (cause) {
      setError(userMessage(cause, 'restoring'));
    } finally {
      setOperation(null);
    }
  }, [candidate, operation]);

  return {
    candidate,
    createBackup,
    error,
    loadingOverview,
    notice,
    operation,
    overview,
    restore,
    selectBackup,
  };
}
