import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function EmptyTransactionsState() {
  return (
    <TransactionState
      body="Transactions you add will appear here."
      icon={{ ios: 'tray.fill', android: 'inbox', web: 'inbox' }}
      title="No transactions yet"
    />
  );
}

export function NoTransactionResultsState() {
  return (
    <TransactionState
      body="Try changing the search text or clearing a filter."
      icon={{ ios: 'magnifyingglass', android: 'search_off', web: 'search_off' }}
      title="No matching transactions"
    />
  );
}

export function LoadingTransactionRow() {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel="Loading transaction"
      accessibilityRole="progressbar"
      style={[styles.loadingRow, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.loadingIcon, { backgroundColor: theme.disabledSurface }]} />
      <View style={styles.loadingCopy}>
        <View style={[styles.loadingLineWide, { backgroundColor: theme.disabledSurface }]} />
        <View style={[styles.loadingLineShort, { backgroundColor: theme.disabledSurface }]} />
      </View>
      <View style={[styles.loadingAmount, { backgroundColor: theme.disabledSurface }]} />
    </View>
  );
}

type TransactionStateProps = {
  title: string;
  body: string;
  icon: React.ComponentProps<typeof SymbolView>['name'];
};

function TransactionState({ title, body, icon }: TransactionStateProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.state, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.stateIcon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView name={icon} size={28} tintColor={theme.secondaryText} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: theme.secondaryText }]}>{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateIcon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  stateTitle: {
    ...typography.sectionTitle,
    textAlign: 'center',
  },
  stateBody: {
    ...typography.body,
    textAlign: 'center',
  },
  loadingRow: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 104,
    padding: spacing.md,
  },
  loadingIcon: {
    borderRadius: borderRadii.full,
    height: 44,
    width: 44,
  },
  loadingCopy: {
    flex: 1,
    gap: spacing.sm,
  },
  loadingLineWide: {
    borderRadius: borderRadii.sm,
    height: 16,
    width: '78%',
  },
  loadingLineShort: {
    borderRadius: borderRadii.sm,
    height: 12,
    width: '55%',
  },
  loadingAmount: {
    borderRadius: borderRadii.sm,
    height: 18,
    width: 76,
  },
});
