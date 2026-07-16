import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { RecurringTransactionEditor } from '@/features/recurring-transactions/components/recurring-transaction-editor';
import { recurringTransactionService } from '@/features/recurring-transactions/recurring-transactions';
import type { RecurringOccurrenceListItem } from '@/features/recurring-transactions/recurring-transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function RecurringOccurrenceRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useAppTheme();
  const [occurrence, setOccurrence] = useState<RecurringOccurrenceListItem>();
  const [error, setError] = useState<string>();

  useEffect(() => {
    recurringTransactionService.getOccurrence(id)
      .then((value) => {
        if (!value) throw new Error('Recurring occurrence not found.');
        setOccurrence(value);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load occurrence.'));
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
        note: occurrence.note,
        date: occurrence.scheduledDate,
      }}
      mode="occurrence"
      onSave={(input) => recurringTransactionService.updateOccurrence(id, input)}
      title="Edit This Occurrence"
    />
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' } });
