import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';

import { ProgressBar } from '@/components/progress-bar';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { accountTypeLabels } from '@/features/accounts/account-format';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import {
  accessibleMoney,
  formatMoney,
  formatMoneyNumber,
} from '@/features/currency/currency';
import type { ValuationRates } from '@/features/exchange-rates/valuation-rates';
import { CreditCardCycleService } from '@/features/credit-cards/credit-card-cycle.service';
import { calculateCreditCardUtilization } from '@/features/credit-cards/credit-card-utilization';
import { bogotaToday, formatTransactionDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type AccountCardProps = {
  account: AccountWithBalance;
  onActions: (account: AccountWithBalance) => void;
  onOpen?: (account: AccountWithBalance) => void;
  /** Saved valuation rates, for the estimated-base-currency line on foreign accounts. */
  rates: ValuationRates;
};

export function AccountCard({ account, onActions, onOpen, rates }: AccountCardProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const isCard = account.type === 'credit_card';
  const isDebt = isCard && account.balance < 0;
  const isCredit = isCard && account.balance > 0;
  const isForeign = account.currency !== rates.baseCurrency;
  const balanceLabel = isCard
    ? isCredit
      ? t.accounts.card.creditBalance
      : t.accounts.card.currentDebt
    : account.type === 'cash'
      ? t.accounts.card.currentBalance
      : t.accounts.card.availableBalance;
  const displayMagnitude = isCard ? Math.abs(account.balance) : account.balance;
  const formattedBalance = formatMoneyNumber(displayMagnitude, account.currency);
  const estimatedBaseMinor = isForeign ? rates.toBase(displayMagnitude, account.currency) : null;
  const utilization = account.type === 'credit_card'
    ? calculateCreditCardUtilization(account.balance, account.creditLimit)
    : null;
  const cycle = account.type === 'credit_card' && account.statementClosingDay !== null && account.paymentDueDay !== null
    ? new CreditCardCycleService().resolve(account.statementClosingDay, account.paymentDueDay, bogotaToday())
    : null;

  return (
    <View
      accessibilityLabel={t.accounts.card.accessibilityLabel(account.name, accountTypeLabels[account.type], balanceLabel, accessibleMoney(displayMagnitude, account.currency), account.isArchived)}
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
            <Text style={[styles.archivedText, { color: theme.secondaryText }]}>{t.accounts.card.archived}</Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={t.accounts.card.moreActions(account.name)}
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
        accessibilityHint={onOpen ? t.accounts.card.opensDetails : undefined}
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
          estimatedBaseMinor !== null ? (
            <Text style={[styles.estimate, { color: theme.mutedText }]}>
              {t.accounts.card.estimatedIn(formatMoney(estimatedBaseMinor, rates.baseCurrency), rates.baseCurrency)}
            </Text>
          ) : (
            <Text style={[styles.estimate, { color: theme.warning }]}>
              {t.accounts.card.missingRate(account.currency, rates.baseCurrency)}
            </Text>
          )
        ) : null}
        {isDebt ? (
          <Text style={[styles.debtNote, { color: theme.expense }]}>{t.accounts.card.debtNote}</Text>
        ) : null}
        {isCredit ? (
          <Text style={[styles.debtNote, { color: theme.income }]}>{t.accounts.card.creditNote}</Text>
        ) : null}
        {isCard && account.balance === 0 ? (
          <Text style={[styles.debtNote, { color: theme.secondaryText }]}>{t.accounts.card.noDebt}</Text>
        ) : null}
        {utilization ? (
          <View style={styles.cardDetails}>
            {utilization.utilizationBasisPoints !== null ? (
              <ProgressBar
                color={utilization.utilizationBasisPoints >= 10000 ? theme.destructive : theme.warning}
                value={utilization.utilizationBasisPoints / 10000}
              />
            ) : null}
            <Text style={[styles.debtNote, { color: theme.secondaryText }]}>{t.accounts.card.creditSummary(utilization.availableCredit === null ? null : formatMoney(utilization.availableCredit, account.currency), utilization.utilizationBasisPoints === null ? null : `${(utilization.utilizationBasisPoints / 100).toFixed(0)}%`)}</Text>
            {cycle ? <Text style={[styles.debtNote, { color: theme.secondaryText }]}>{t.accounts.card.nextDue(formatTransactionDate(cycle.nextDueDate))}</Text> : <Text style={[styles.debtNote, { color: theme.warning }]}>{t.accounts.card.completeCycleSetup}</Text>}
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
  debtNote: { ...typography.caption, fontFamily: fonts.sans.semibold, fontWeight: '600' },
  cardDetails: { gap: spacing.sm, paddingTop: spacing.xs },
});
