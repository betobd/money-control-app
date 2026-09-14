import { useRouter } from 'expo-router';
import { toUserMessage } from '@/errors/user-error';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { ActionSheet, actionIcons, type SheetAction } from '@/components/action-sheet';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenContainer } from '@/components/screen-container';
import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { AccountActionError } from '@/features/accounts/account.service';
import { accountService } from '@/features/accounts/accounts';
import { formatMoneyNumber } from '@/features/currency/currency';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AccountsErrorState, EmptyAccountsState, LoadingAccountCard } from '@/features/accounts/components/account-states';
import { NetWorthSummary } from '@/features/accounts/components/net-worth-summary';
import { useAccounts } from '@/features/accounts/use-accounts';
import { InvestmentCard } from '@/features/investments/components/investment-card';
import { withInvestmentCurrentValues } from '@/features/investments/investment-portfolio.service';
import { useInvestments } from '@/features/investments/use-investments';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';
import { useMessages } from '@/i18n/use-messages';

type AccountMenu = { account: AccountWithBalance; canDelete: boolean };

export default function AccountsScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const theme = useAppTheme();
  const t = useMessages();
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const [menu, setMenu] = useState<AccountMenu | null>(null);
  const { accounts, rates, error, loading, reload } = useAccounts();
  const { portfolio, reload: reloadInvestments } = useInvestments();
  const pullToRefresh = usePullToRefresh(() => Promise.all([reload(), reloadInvestments()]));
  // Investment accounts live in their own section (and screen); exclude them from the
  // cash/credit lists so their misleading ledger balance is never shown as spendable.
  const activeAccounts = useMemo(
    () => accounts.filter((account) => !account.isArchived && account.type !== 'investment'),
    [accounts],
  );
  const archivedAccounts = useMemo(
    () => accounts.filter((account) => account.isArchived && account.type !== 'investment'),
    [accounts],
  );
  const activeInvestments = useMemo(
    () => portfolio.accounts.filter((view) => !view.account.isArchived),
    [portfolio],
  );
  // Net worth counts investment accounts at their current valuation, not their
  // transaction-derived balance (one source per account, no double counting).
  const netWorth = useMemo(
    () => accountService.estimateNetWorth(withInvestmentCurrentValues(accounts, portfolio.accounts), rates),
    [accounts, portfolio, rates],
  );

  async function openActions(account: AccountWithBalance) {
    setActionError(undefined);
    try {
      setMenu({ account, canDelete: await accountService.canPermanentlyDelete(account.id) });
    } catch (cause) {
      setActionError(toUserMessage(cause, t.accounts.errors.loadActions));
    }
  }

  function menuActions({ account, canDelete }: AccountMenu): SheetAction[] {
    const actions: SheetAction[] = [
      {
        icon: actionIcons.edit,
        label: t.common.edit,
        description: t.accounts.list.editDescription,
        onPress: () => router.push({ pathname: '/account-form', params: { id: account.id } }),
      },
    ];
    if (account.isArchived) {
      actions.push({
        icon: actionIcons.restore,
        label: t.accounts.list.restoreAccount,
        description: t.accounts.list.restoreDescription,
        onPress: () => void restoreAccount(account),
      });
    } else {
      actions.push({
        icon: actionIcons.archive,
        label: t.accounts.list.archive,
        description: t.accounts.list.archiveDescription,
        onPress: () => confirmArchive(account),
        tone: 'destructive',
      });
    }
    if (canDelete) {
      actions.push({
        icon: actionIcons.delete,
        label: t.accounts.list.deletePermanently,
        description: t.accounts.list.deleteDescription,
        onPress: () => confirmPermanentDelete(account),
        tone: 'destructive',
      });
    }
    return actions;
  }

  async function restoreAccount(account: AccountWithBalance) {
    setActionError(undefined);
    try {
      await accountService.restore(account.id);
      await reload();
    } catch (cause) {
      if (cause instanceof AccountActionError) dialog.notice({ title: t.accounts.errors.restoreTitle, message: cause.message });
      else setActionError(toUserMessage(cause, t.accounts.errors.restore));
    }
  }

  function confirmPermanentDelete(account: AccountWithBalance) {
    dialog.confirm({
      title: t.accounts.list.deleteTitle,
      message: t.accounts.list.deleteMessage(account.name),
      confirmLabel: t.accounts.list.deletePermanently,
      tone: 'destructive',
      onConfirm: () => void deletePermanently(account),
    });
  }

  async function deletePermanently(account: AccountWithBalance) {
    setActionError(undefined);
    try {
      await accountService.permanentlyDelete(account.id);
      await reload();
    } catch (cause) {
      if (cause instanceof AccountActionError) dialog.notice({ title: t.accounts.errors.deleteTitle, message: cause.message });
      else setActionError(toUserMessage(cause, t.accounts.errors.delete));
    }
  }

  function confirmArchive(account: AccountWithBalance) {
    dialog.confirm({
      title: t.accounts.list.archiveTitle,
      message: t.accounts.list.archiveMessage(account.name),
      confirmLabel: t.accounts.list.archive,
      tone: 'destructive',
      onConfirm: () => void accountService.archive(account.id).then(reload),
    });
  }

  return (
    <ScreenContainer contentStyle={styles.content} {...pullToRefresh}>
      <PrimaryScreenHeader onAdd={{ accessibilityLabel: t.accounts.list.addAccount, onPress: () => router.push('/account-form') }} title={t.common.tabs.accounts} />

      {actionError ? (
        <Text accessibilityLiveRegion="assertive" style={[styles.actionError, { color: theme.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      {!loading && !error ? (
        <NetWorthSummary
          amount={netWorth.totalBaseMinor === null ? '' : formatMoneyNumber(netWorth.totalBaseMinor, netWorth.baseCurrency)}
          currency={netWorth.baseCurrency}
          estimated={netWorth.includesForeign && !netWorth.incomplete}
          incomplete={netWorth.incomplete}
          missingCurrencies={netWorth.missingCurrencies}
        />
      ) : null}

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.accounts.list.activeAccounts}</Text>
        {archivedAccounts.length > 0 ? (
          <Pressable
            accessibilityLabel={showArchived ? t.accounts.list.hideArchivedAccounts : t.accounts.list.showArchivedAccounts}
            accessibilityRole="button"
            onPress={() => setShowArchived((value) => !value)}
            style={[styles.filter, { backgroundColor: showArchived ? theme.tintPrimary : theme.elevatedSurface }]}>
            <Text style={[styles.filterText, { color: showArchived ? theme.primaryAction : theme.secondaryText }]}>{showArchived ? t.accounts.list.hideArchived : t.accounts.list.archivedCount(archivedAccounts.length)}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <View style={styles.accounts}><LoadingAccountCard /><LoadingAccountCard /></View> : null}
      {!loading && error ? <AccountsErrorState message={error} onRetry={() => void reload()} /> : null}
      {!loading && !error && activeAccounts.length === 0 ? <EmptyAccountsState onCreate={() => router.push('/account-form')} /> : null}
      {!loading && !error && activeAccounts.length > 0 ? (
        <View accessibilityLabel={t.accounts.list.activeAccounts} style={styles.accounts}>
          {activeAccounts.map((account) => <AccountCard account={account} key={account.id} rates={rates} onActions={(selected) => void openActions(selected)} onOpen={account.type === 'credit_card' ? (selected) => router.push({ pathname: '/accounts/[id]', params: { id: selected.id } }) : undefined} />)}
        </View>
      ) : null}

      {!loading && !error && activeInvestments.length > 0 ? (
        <View style={styles.archivedSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.accounts.list.investments}</Text>
            <Pressable
              accessibilityLabel={t.accounts.list.viewAllInvestments}
              accessibilityRole="button"
              onPress={() => router.push('/investments')}
              style={[styles.filter, { backgroundColor: theme.elevatedSurface }]}>
              <Text style={[styles.filterText, { color: theme.primaryAction }]}>{t.accounts.list.viewAll}</Text>
            </Pressable>
          </View>
          <View accessibilityLabel={t.accounts.list.investments} style={styles.accounts}>
            {activeInvestments.map((view) => (
              <InvestmentCard
                key={view.account.id}
                view={view}
                onPress={() => router.push({ pathname: '/investments/[id]', params: { id: view.account.id } })}
              />
            ))}
          </View>
        </View>
      ) : null}

      {showArchived && archivedAccounts.length > 0 ? (
        <View style={styles.archivedSection}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.accounts.list.archivedAccounts}</Text>
          <View accessibilityLabel={t.accounts.list.archivedAccounts} style={styles.accounts}>
            {archivedAccounts.map((account) => <AccountCard account={account} key={account.id} rates={rates} onActions={(selected) => void openActions(selected)} onOpen={account.type === 'credit_card' ? (selected) => router.push({ pathname: '/accounts/[id]', params: { id: selected.id } }) : undefined} />)}
          </View>
        </View>
      ) : null}


      <ActionSheet
        actions={menu ? menuActions(menu) : []}
        description={menu?.account.isArchived ? t.accounts.list.archivedMenuDescription : t.accounts.list.menuDescription}
        onClose={() => setMenu(null)}
        title={menu?.account.name ?? ''}
        visible={menu !== null}
      />
      <DialogHost dialog={dialog} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.md },
  actionError: { ...typography.caption },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  sectionTitle: { ...typography.sectionTitle, fontSize: 15, lineHeight: 20 },
  filter: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 34, paddingHorizontal: spacing.sm + spacing.xs },
  filterText: { ...typography.label },
  accounts: { gap: spacing.sm + spacing.xs },
  archivedSection: { gap: spacing.sm + spacing.xs },
});
