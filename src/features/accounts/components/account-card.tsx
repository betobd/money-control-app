import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { accountTypeLabels, formatCop } from '@/features/accounts/account-format';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import { CreditCardCycleService } from '@/features/credit-cards/credit-card-cycle.service';
import { calculateCreditCardUtilization } from '@/features/credit-cards/credit-card-utilization';
import { bogotaToday, formatTransactionDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountCardProps = {
  account: AccountWithBalance;
  onActions: (account: AccountWithBalance) => void;
  onOpen?: (account: AccountWithBalance) => void;
};

export function AccountCard({ account, onActions, onOpen }: AccountCardProps) {
  const theme = useAppTheme();
  const isDebt = account.type === 'credit_card' && account.balance < 0;
  const balanceLabel = account.type === 'credit_card'
    ? 'Amount owed'
    : account.type === 'cash'
      ? 'Current balance'
      : 'Available balance';
  const formattedBalance = formatCop(
    account.type === 'credit_card' ? Math.abs(account.balance) : account.balance,
  );
  const utilization = account.type === 'credit_card'
    ? calculateCreditCardUtilization(account.balance, account.creditLimit)
    : null;
  const cycle = account.type === 'credit_card' && account.statementClosingDay !== null && account.paymentDueDay !== null
    ? new CreditCardCycleService().resolve(account.statementClosingDay, account.paymentDueDay, bogotaToday())
    : null;

  return (
    <View
      accessibilityLabel={`${account.name}, ${accountTypeLabels[account.type]}, ${balanceLabel}, ${formattedBalance} COP${account.isArchived ? ', archived' : ''}`}
      style={[
        styles.card,
        {
          backgroundColor: account.isArchived ? theme.disabledSurface : theme.surface,
          borderColor: theme.border,
        },
      ]}>
      <View style={styles.header}>
        <AccountTypeIcon kind={account.type} />
        <View style={styles.identity}>
          <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>
            {account.name}
          </Text>
          <Text numberOfLines={1} style={[styles.type, { color: theme.secondaryText }]}>
            {accountTypeLabels[account.type]}
          </Text>
        </View>
        {account.isArchived ? (
          <View style={[styles.archivedBadge, { backgroundColor: theme.elevatedSurface }]}>
            <Text style={[styles.archivedText, { color: theme.secondaryText }]}>Archived</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={`More actions for ${account.name}`}
          accessibilityRole="button"
          hitSlop={4}
          onPress={() => onActions(account)}
          style={styles.menuButton}>
          <SymbolView
            name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }}
            size={22}
            tintColor={theme.secondaryText}
          />
        </Pressable>
      </View>

      <Pressable
        accessibilityHint={onOpen ? 'Opens credit card details' : undefined}
        accessibilityRole={onOpen ? 'button' : undefined}
        disabled={!onOpen}
        onPress={() => onOpen?.(account)}
        style={styles.balance}>
        <Text style={[styles.balanceLabel, { color: theme.secondaryText }]}>{balanceLabel}</Text>
        <View style={styles.amountRow}>
          <Text
            adjustsFontSizeToFit
            minimumFontScale={0.65}
            numberOfLines={1}
            style={[styles.amount, { color: isDebt ? theme.expense : theme.primaryText }]}>
            {formattedBalance}
          </Text>
          <Text style={[styles.currency, { color: theme.mutedText }]}>COP</Text>
        </View>
        {isDebt ? (
          <Text style={[styles.debtNote, { color: theme.expense }]}>Debt · reduces net worth</Text>
        ) : null}
        {utilization ? (
          <View style={styles.cardDetails}>
            <Text style={[styles.debtNote, { color: theme.secondaryText }]}>Available {utilization.availableCredit === null ? 'unavailable' : formatCop(utilization.availableCredit)} · Utilization {utilization.utilizationBasisPoints === null ? 'unavailable' : `${(utilization.utilizationBasisPoints / 100).toFixed(0)}%`}</Text>
            {cycle ? <Text style={[styles.debtNote, { color: theme.secondaryText }]}>Next calculated due {formatTransactionDate(cycle.nextDueDate)}</Text> : <Text style={[styles.debtNote, { color: theme.warning }]}>Complete card cycle setup</Text>}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.lg, padding: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  identity: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: '700' },
  type: { ...typography.caption },
  menuButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  archivedBadge: { borderRadius: borderRadii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  archivedText: { ...typography.label },
  balance: { gap: spacing.xs },
  balanceLabel: { ...typography.label, textTransform: 'uppercase' },
  amountRow: { alignItems: 'baseline', flexDirection: 'row', maxWidth: '100%' },
  amount: { ...typography.display, flexShrink: 1, fontSize: 28, fontVariant: ['tabular-nums'], lineHeight: 34 },
  currency: { ...typography.caption, marginLeft: spacing.xs },
  debtNote: { ...typography.caption, fontWeight: '600' },
  cardDetails: { gap: spacing.xs, paddingTop: spacing.xs },
});
