import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { BackupFileAdapterError } from './backup-file.adapter';
import { UnsupportedBackupVersionError } from './backup-format-migrator';
import { BackupRestoreError } from './backup.repository';
import type { BackupOverview, RestoreCandidate } from './backup.types';
import { BackupValidationError } from './backup-validator';
import { backupService } from './backups';
import { getMessages } from '@/i18n/messages';

export type BackupOperation = 'exporting' | 'selecting' | 'restoring' | null;

function userMessage(cause: unknown, action: BackupOperation): string {
  const text = getMessages().backup;
  if (cause instanceof BackupValidationError) return cause.message;
  if (cause instanceof UnsupportedBackupVersionError) return cause.message;
  if (cause instanceof BackupFileAdapterError) {
    return cause.fileGenerated
      ? text.unconfirmedCopy(cause.message)
      : cause.message;
  }
  if (cause instanceof BackupRestoreError) {
    return text.originalDataKept(cause.message);
  }
  if (action === 'restoring') {
    return text.restoreFailed;
  }
  if (action === 'exporting') {
    return text.exportFailed;
  }
  return text.openFailed;
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
      setError(getMessages().backup.overviewFailed);
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
      setNotice(getMessages().backup.backupCreated(result.fileName));
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
      setNotice(getMessages().backup.restoreComplete(
        result.summary.accounts,
        result.summary.transactions,
        result.summary.budgets,
      ));
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
