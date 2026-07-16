import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { RecurringTransactionEditor } from '@/features/recurring-transactions/components/recurring-transaction-editor';
import { recurringTransactionService } from '@/features/recurring-transactions/recurring-transactions';
import type { RecurringRuleListItem } from '@/features/recurring-transactions/recurring-transaction.types';
import { bogotaToday } from '@/features/transactions/transaction-date';

export default function RecurringFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useAppTheme();
  const [rule, setRule] = useState<RecurringRuleListItem | null | undefined>(id ? undefined : null);
  const [error, setError] = useState<string>();

  useEffect(() => {
    if (!id) return;
    recurringTransactionService.getRule(id)
      .then((value) => {
        if (!value) throw new Error('Recurring transaction not found.');
        setRule(value);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Unable to load recurring transaction.'));
  }, [id]);

  if (error) return <View style={[styles.center, { backgroundColor: theme.appBackground }]}><Text style={{ color: theme.destructive }}>{error}</Text></View>;
  if (id && rule === undefined) return <View style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;

  const initial = rule
    ? {
        type: rule.type,
        amount: rule.amount,
        accountId: rule.accountId,
        destinationAccountId: rule.destinationAccountId,
        categoryId: rule.categoryId,
        note: rule.note,
        date: rule.startDate,
        frequency: rule.frequency,
        interval: rule.interval,
        endDate: rule.endDate,
      }
    : {
        type: 'expense' as const,
        amount: 0,
        accountId: '',
        destinationAccountId: null,
        categoryId: null,
        note: null,
        date: bogotaToday(),
        frequency: 'monthly' as const,
        interval: 1,
        endDate: null,
      };

  return (
    <RecurringTransactionEditor
      initial={initial}
      mode="rule"
      onSave={(input) => id
        ? recurringTransactionService.updateRule(id, input).then(() => undefined)
        : recurringTransactionService.createRule(input).then(() => undefined)}
      title={id ? 'Edit Future Rule' : 'Create Recurring Transaction'}
    />
  );
}

const styles = StyleSheet.create({ center: { alignItems: 'center', flex: 1, justifyContent: 'center' } });
