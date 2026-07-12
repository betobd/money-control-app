import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { signedTransactionAmount, transactionIcon, transactionTitle } from '@/features/transactions/transaction-presentation';
import type { SupportedTransactionType, TransactionListItem as TransactionItem } from '@/features/transactions/transaction.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type TransactionListItemProps = {
  transaction: TransactionItem;
};

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const theme = useAppTheme();
  const tone = getTone(transaction.type, theme);

  return (
    <View
      accessibilityLabel={`${transactionTitle(transaction)}, ${kindLabel(transaction.type)}, ${transaction.categoryName}, ${transaction.accountName}, ${signedTransactionAmount(transaction)}`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView name={transactionIcon(transaction)} size={22} tintColor={tone} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.primaryText }]}>
          {transactionTitle(transaction)}
        </Text>
        <Text numberOfLines={1} style={[styles.metadata, { color: theme.secondaryText }]}>
          {transaction.accountName}
        </Text>
        <Text numberOfLines={1} style={[styles.metadata, { color: theme.mutedText }]}>
          {transaction.categoryName} · {transaction.status}
        </Text>
      </View>
      <View style={styles.amountColumn}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[styles.amount, { color: tone }]}>
          {signedTransactionAmount(transaction)}
        </Text>
        <Text style={[styles.kind, { color: theme.secondaryText }]}>
          {kindLabel(transaction.type)}
        </Text>
      </View>
    </View>
  );
}

function getTone(kind: SupportedTransactionType, theme: ReturnType<typeof useAppTheme>) {
  if (kind === 'income') return theme.income;
  return theme.expense;
}

function kindLabel(kind: SupportedTransactionType) {
  if (kind === 'income') return 'Income';
  return 'Expense';
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 104,
    padding: spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  copy: {
    flex: 1,
    minWidth: 0,
  },
  title: {
    ...typography.body,
    fontWeight: '700',
  },
  metadata: {
    ...typography.caption,
  },
  amountColumn: {
    alignItems: 'flex-end',
    flexShrink: 0,
    width: 120,
  },
  amount: {
    ...typography.money,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    textAlign: 'right',
    width: '100%',
  },
  kind: {
    ...typography.label,
    marginTop: spacing.xs,
  },
});
