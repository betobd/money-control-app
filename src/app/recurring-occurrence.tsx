import { useLocalSearchParams } from 'expo-router';
import { toUserMessage } from '@/errors/user-error';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RecurringTransactionEditor } from '@/features/recurring-transactions/components/recurring-transaction-editor';
import { recurringTransactionService } from '@/features/recurring-transactions/recurring-transactions';
import type { RecurringOccurrenceListItem } from '@/features/recurring-transactions/recurring-transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getMessages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';

export default function RecurringOccurrenceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const t = useMessages();
  const [occurrence, setOccurrence] = useState<RecurringOccurrenceListItem>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    recurringTransactionService.getOccurrence(id)
      .then((value) => {
        if (!value) throw new Error(getMessages().recurring.occurrenceNotFound);
        setOccurrence(value);
      })
      .catch((cause) => setError(toUserMessage(cause, getMessages().recurring.occurrenceLoadError)));
  }, [id]);

  if (error) return <View style={[styles.center, { backgroundColor: theme.appBackground }]}><Text style={{ color: theme.destructive }}>{error}</Text></View>;
  if (!occurrence) return <View style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;

  return (
    <RecurringTransactionEditor
      initial={{
        type: occurrence.type,
        amount: occurrence.amount,
        accountId: occurrence.accountId,
        destinationAccountId: occurrence.destinationAccountId,
        categoryId: occurrence.categoryId,
        subcategoryId: occurrence.subcategoryId,
        note: occurrence.note,
        date: occurrence.scheduledDate,
      }}
      mode="occurrence"
      onSave={(input) => recurringTransactionService.updateOccurrence(id, input)}
      title={t.recurring.editOccurrenceTitle}
    />
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' } });
