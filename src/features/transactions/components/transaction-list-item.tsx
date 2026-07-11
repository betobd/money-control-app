import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import type { TransactionKind, TransactionMock } from '@/features/transactions/transactions.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

type TransactionListItemProps = {
  transaction: TransactionMock;
};

export function TransactionListItem({ transaction }: TransactionListItemProps) {
  const theme = useAppTheme();
  const tone = getTone(transaction.kind, theme);

  return (
    <View
      accessibilityLabel={`${transaction.title}, ${kindLabel(transaction.kind)}, ${transaction.classification}, ${transaction.account}, ${transaction.time}, ${transaction.amount}`}
      style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView name={transaction.icon} size={22} tintColor={tone} />
      </View>
      <View style={styles.copy}>
        <Text numberOfLines={1} style={[styles.title, { color: theme.primaryText }]}>
          {transaction.title}
        </Text>
        <Text numberOfLines={1} style={[styles.metadata, { color: theme.secondaryText }]}>
          {transaction.account}
        </Text>
        <Text numberOfLines={1} style={[styles.metadata, { color: theme.mutedText }]}>
          {transaction.classification} · {transaction.time}
        </Text>
      </View>
      <View style={styles.amountColumn}>
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.65}
          numberOfLines={1}
          style={[styles.amount, { color: tone }]}>
          {transaction.amount}
        </Text>
        <Text style={[styles.kind, { color: theme.secondaryText }]}>
          {kindLabel(transaction.kind)}
        </Text>
      </View>
    </View>
  );
}

function getTone(kind: TransactionKind, theme: ReturnType<typeof useAppTheme>) {
  if (kind === 'income') return theme.income;
  if (kind === 'transfer') return theme.transfer;
  return theme.expense;
}

function kindLabel(kind: TransactionKind) {
  if (kind === 'income') return 'Income';
  if (kind === 'transfer') return 'Transfer';
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
