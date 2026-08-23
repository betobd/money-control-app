import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';

import { ProgressBar } from '@/components/progress-bar';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { accountTypeLabels } from '@/features/accounts/account-format';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import {
  accessibleMoney,
  convertUsdMinorToCopMinor,
  formatMoney,
  formatMoneyNumber,
  type ScaledRate,
} from '@/features/currency/currency';
import { CreditCardCycleService } from '@/features/credit-cards/credit-card-cycle.service';
import { calculateCreditCardUtilization } from '@/features/credit-cards/credit-card-utilization';
import { bogotaToday, formatTransactionDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountCardProps = {
  account: AccountWithBalance;
  onActions: (account: AccountWithBalance) => void;
  onOpen?: (account: AccountWithBalance) => void;
  /** Current USD/COP valuation rate, for the estimated-COP line on USD accounts. */
  valuationRate?: ScaledRate | null;
};

export function AccountCard({ account, onActions, onOpen, valuationRate }: AccountCardProps) {
  const theme = useAppTheme();
  const isCard = account.type === 'credit_card';
  const isDebt = isCard && account.balance < 0;
  const isCredit = isCard && account.balance > 0;
  const isForeign = account.currency !== 'COP';
  const balanceLabel = isCard
    ? isCredit
      ? 'Credit balance'
      : 'Current debt'
    : account.type === 'cash'
      ? 'Current balance'
      : 'Available balance';
  const displayMagnitude = isCard ? Math.abs(account.balance) : account.balance;
  const formattedBalance = formatMoneyNumber(displayMagnitude, account.currency);
  const estimatedCopMinor = isForeign && valuationRate
    ? convertUsdMinorToCopMinor(displayMagnitude, valuationRate)
    : null;
  const utilization = account.type === 'credit_card'
    ? calculateCreditCardUtilization(account.balance, account.creditLimit)
    : null;
  const cycle = account.type === 'credit_card' && account.statementClosingDay !== null && account.paymentDueDay !== null
    ? new CreditCardCycleService().resolve(account.statementClosingDay, account.paymentDueDay, bogotaToday())
    : null;

  return (
    <View
      accessibilityLabel={`${account.name}, ${accountTypeLabels[account.type]}, ${balanceLabel}, ${accessibleMoney(displayMagnitude, account.currency)}${account.isArchived ? ', archived' : ''}`}
      style={[
        styles.card,
        { backgroundColor: account.isArchived ? theme.disabledSurface : theme.surface },
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

      <PressableScale
        accessibilityHint={onOpen ? 'Opens credit card details' : undefined}
        accessibilityRole={onOpen ? 'button' : undefined}
        activeScale={onOpen ? 0.98 : 1}
        activeOpacity={onOpen ? 0.9 : 1}
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
          <Text style={[styles.currency, { color: theme.mutedText }]}>{account.currency}</Text>
        </View>
        {isForeign ? (
          estimatedCopMinor !== null ? (
            <Text style={[styles.estimate, { color: theme.mutedText }]}>
              ≈ {formatMoney(estimatedCopMinor, 'COP')} · Estimated in COP
            </Text>
          ) : (
            <Text style={[styles.estimate, { color: theme.warning }]}>
              Add an exchange rate to include this account in estimated net worth.
            </Text>
          )
        ) : null}
        {isDebt ? (
          <Text style={[styles.debtNote, { color: theme.expense }]}>Debt · reduces net worth</Text>
        ) : null}
        {isCredit ? (
          <Text style={[styles.debtNote, { color: theme.income }]}>Credit balance · increases net worth</Text>
        ) : null}
        {isCard && account.balance === 0 ? (
          <Text style={[styles.debtNote, { color: theme.secondaryText }]}>No debt</Text>
        ) : null}
        {utilization ? (
          <View style={styles.cardDetails}>
            {utilization.utilizationBasisPoints !== null ? (
              <ProgressBar
                color={utilization.utilizationBasisPoints >= 10000 ? theme.destructive : theme.warning}
                value={utilization.utilizationBasisPoints / 10000}
              />
            ) : null}
            <Text style={[styles.debtNote, { color: theme.secondaryText }]}>Available credit {utilization.availableCredit === null ? 'unavailable' : formatMoney(utilization.availableCredit, account.currency)} · Credit utilization {utilization.utilizationBasisPoints === null ? 'unavailable' : `${(utilization.utilizationBasisPoints / 100).toFixed(0)}%`}</Text>
            {cycle ? <Text style={[styles.debtNote, { color: theme.secondaryText }]}>Next calculated due {formatTransactionDate(cycle.nextDueDate)}</Text> : <Text style={[styles.debtNote, { color: theme.warning }]}>Complete card cycle setup</Text>}
          </View>
        ) : null}
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: borderRadii.card, gap: spacing.md, padding: spacing.md },
  header: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + 2 },
  identity: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontFamily: typography.sectionTitle.fontFamily, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  type: { ...typography.caption, fontSize: 12, lineHeight: 16 },
  menuButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 32 },
  archivedBadge: { borderRadius: borderRadii.full, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  archivedText: { ...typography.label },
  balance: { gap: spacing.xs },
  balanceLabel: { ...typography.overline },
  amountRow: { alignItems: 'baseline', flexDirection: 'row', maxWidth: '100%' },
  amount: { ...typography.moneyHero, flexShrink: 1, fontSize: 24, lineHeight: 30 },
  currency: { ...typography.caption, marginLeft: spacing.xs },
  estimate: { ...typography.caption },
  debtNote: { ...typography.caption, fontWeight: '600' },
  cardDetails: { gap: spacing.sm, paddingTop: spacing.xs },
});
