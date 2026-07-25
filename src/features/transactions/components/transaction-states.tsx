import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
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

export function NoTransactionResultsState({
  hasSearch,
  onClearFilters,
  onClearSearch,
}: {
  hasSearch: boolean;
  onClearFilters: () => void;
  onClearSearch: () => void;
}) {
  return (
    <TransactionState
      actions={(
        <View style={styles.actions}>
          <StateButton label="Clear filters" onPress={onClearFilters} />
          {hasSearch ? <StateButton label="Clear search" onPress={onClearSearch} /> : null}
        </View>
      )}
      body="Try changing the search text or clearing a filter."
      icon={{ ios: 'magnifyingglass', android: 'search_off', web: 'search_off' }}
      title="No matching transactions"
    />
  );
}

export function TransactionErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <TransactionState
      actions={<StateButton label="Try again" onPress={onRetry} />}
      body={message}
      icon={{ ios: 'exclamationmark.triangle.fill', android: 'error', web: 'error' }}
      title="Unable to load transactions"
    />
  );
}

export function LoadingTransactionRow() {
  const theme = useAppTheme();

  return (
    <View
      accessibilityLabel="Loading transaction"
      accessibilityRole="progressbar"
      style={[styles.loadingRow, { backgroundColor: theme.surface }]}>
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
  actions?: React.ReactNode;
};

function TransactionState({ title, body, icon, actions }: TransactionStateProps) {
  const theme = useAppTheme();

  return (
    <View style={[styles.state, { backgroundColor: theme.surface }]}>
      <View style={[styles.stateIcon, { backgroundColor: theme.tintPrimary }]}>
        <SymbolView name={icon} size={28} tintColor={theme.primaryAction} />
      </View>
      <Text style={[styles.stateTitle, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.stateBody, { color: theme.secondaryText }]}>{body}</Text>
      {actions}
    </View>
  );
}

function StateButton({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useAppTheme();
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.stateButton, { backgroundColor: theme.tintPrimary }]}>
      <Text style={[styles.stateButtonLabel, { color: theme.primaryAction }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  state: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    gap: spacing.sm,
    padding: spacing.xl,
  },
  stateIcon: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'center' },
  stateButton: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  stateButtonLabel: { ...typography.caption, fontWeight: '700' },
  loadingRow: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 68,
    paddingHorizontal: spacing.md - spacing.xs,
    paddingVertical: spacing.sm + 3,
  },
  loadingIcon: {
    borderRadius: borderRadii.md,
    height: 36,
    width: 36,
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
