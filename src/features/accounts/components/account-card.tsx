import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import type { AccountMock } from '@/features/accounts/accounts.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export function AccountCard({ account }: { account: AccountMock }) {
  const theme = useAppTheme();
  const amountColor = account.balanceTone === 'debt' ? theme.expense : theme.primaryText;

  return (
    <View
      accessibilityLabel={`${account.name}, ${account.typeLabel}, ${account.balanceLabel}, ${account.amount} ${account.currency}${account.archived ? ', archived' : ''}`}
      style={[
        styles.card,
        {
          backgroundColor: account.archived ? theme.disabledSurface : theme.surface,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.header}>
        <AccountTypeIcon kind={account.kind} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>
            {account.name}
          </Text>
          <Text numberOfLines={1} style={[styles.type, { color: theme.secondaryText }]}>
            {account.typeLabel}
          </Text>
        </View>
        {account.archived ? (
          <View style={[styles.archivedBadge, { backgroundColor: theme.elevatedSurface }]}>
            <Text style={[styles.archivedText, { color: theme.secondaryText }]}>Archived</Text>
          </View>
        ) : (
          <Pressable
            accessibilityHint="Account actions are not active in this preview"
            accessibilityLabel={`More actions for ${account.name}`}
            accessibilityRole="button"
            hitSlop={4}
            onPress={() => undefined}
            style={styles.menuButton}>
            <SymbolView
              name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
              size={22}
              tintColor={theme.secondaryText}
            />
          </Pressable>
        )}
      </View>

      <View style={styles.balance}>
        <Text style={[styles.balanceLabel, { color: theme.secondaryText }]}>
          {account.balanceLabel}
        </Text>
        <View style={styles.amountRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={[styles.amount, { color: amountColor }]}>
            {account.amount}
          </Text>
          <Text style={[styles.currency, { color: theme.mutedText }]}>{account.currency}</Text>
        </View>
        {account.balanceTone === 'debt' ? (
          <Text style={[styles.debtNote, { color: theme.expense }]}>Debt · reduces net worth</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.lg,
    padding: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.body,
    fontWeight: '700',
  },
  type: {
    ...typography.caption,
  },
  menuButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  archivedBadge: {
    borderRadius: borderRadii.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  archivedText: {
    ...typography.label,
  },
  balance: {
    gap: spacing.xs,
  },
  balanceLabel: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  amountRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    maxWidth: '100%',
  },
  amount: {
    ...typography.display,
    flexShrink: 1,
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    lineHeight: 34,
  },
  currency: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
  debtNote: {
    ...typography.caption,
    fontWeight: '600',
  },
});
