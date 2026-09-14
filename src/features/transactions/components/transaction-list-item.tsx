import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { IconChip } from '@/components/icon-chip';
import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import {
  categoryPathLabel,
  signedTransactionAmount,
  transactionAccountLabel,
  transactionIcon,
  transactionTitle,
  transactionTypeLabel,
} from '@/features/transactions/transaction-presentation';
import type { SupportedTransactionType, TransactionListItem as TransactionItem } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type TransactionListItemProps = {
  transaction: TransactionItem;
};

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const tone = getTone(transaction.type, theme);
  const tint = getTint(transaction.type, theme);
  const voided = transaction.status === 'voided';
  const metaLabel = `${transactionAccountLabel(transaction)} · ${
    transaction.type === 'transfer'
      ? t.transactions.types.transfer
      : transaction.type === 'refund'
        ? `${t.transactions.types.refund} · ${categoryPathLabel(transaction.categoryName, transaction.subcategoryName) ?? t.transactions.originalExpense}`
        : categoryPathLabel(transaction.categoryName, transaction.subcategoryName) ?? t.transactions.uncategorized
  }`;

  return (
    <PressableScale
      accessibilityHint={t.transactions.list.itemHint}
      accessibilityLabel={`${transactionTitle(transaction)}, ${transactionTypeLabel(transaction)}, ${transactionAccountLabel(transaction)}, ${signedTransactionAmount(transaction)}, ${voided ? t.transactions.status.voidedA11y : t.transactions.status.postedA11y}`}
      accessibilityRole="button"
      onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: transaction.id } })}
      style={[styles.card, voided && styles.voided, { backgroundColor: theme.surface }]}>
      <IconChip background={tint} color={tone} icon={transactionIcon(transaction)} iconSize={19} size={36} />
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, voided && styles.strike, { color: theme.primaryText }]}>
          {transactionTitle(transaction)}
        </Text>
        <Text numberOfLines={1} style={[styles.metadata, { color: theme.mutedText }]}>
          {metaLabel}
        </Text>
      </View>
      <View style={styles.amountColumn}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.7}
          numberOfLines={1}
          style={[styles.amount, voided && styles.strike, { color: voided ? theme.mutedText : tone }]}>
          {signedTransactionAmount(transaction)}
        </Text>
        <Text numberOfLines={1} style={[styles.kind, { color: theme.mutedText }]}>
          {voided ? t.transactions.status.voided : transactionTypeLabel(transaction)}
        </Text>
      </View>
    </PressableScale>
  );
}

function getTone(kind: SupportedTransactionType, theme: ReturnType<typeof useAppTheme>) {
  if (kind === 'income') return theme.income;
  if (kind === 'transfer') return theme.transfer;
  if (kind === 'refund') return theme.primaryAction;
  return theme.expense;
}

function getTint(kind: SupportedTransactionType, theme: ReturnType<typeof useAppTheme>) {
  if (kind === 'income') return theme.tintIncome;
  if (kind === 'transfer') return theme.tintTransfer;
  if (kind === 'refund') return theme.tintPrimary;
  return theme.tintExpense;
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 48,
    paddingHorizontal: spacing.md - spacing.xs,
    paddingVertical: spacing.sm + 3,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    fontFamily: fonts.sans.semibold,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  metadata: {
    fontFamily: fonts.sans.medium,
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  amountColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
    maxWidth: 128,
  },
  amount: {
    ...typography.moneyRow,
    textAlign: 'right',
  },
  kind: {
    fontFamily: fonts.sans.medium,
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
    marginTop: 1,
  },
  voided: { opacity: 0.72 },
  strike: { textDecorationLine: 'line-through' },
});
