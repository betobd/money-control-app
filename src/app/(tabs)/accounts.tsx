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
import { AddAccountButton } from '@/features/accounts/components/add-account-button';
import { NetWorthSummary } from '@/features/accounts/components/net-worth-summary';
import { useAccounts } from '@/features/accounts/use-accounts';
import { InvestmentCard } from '@/features/investments/components/investment-card';
import { withInvestmentCurrentValues } from '@/features/investments/investment-portfolio.service';
import { useInvestments } from '@/features/investments/use-investments';
import { useAppTheme } from '@/hooks/use-app-theme';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

type AccountMenu = { account: AccountWithBalance; canDelete: boolean };

export default function AccountsScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const theme = useAppTheme();
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
      setActionError(toUserMessage(cause, 'Unable to load account actions.'));
    }
  }

  function menuActions({ account, canDelete }: AccountMenu): SheetAction[] {
    const actions: SheetAction[] = [
      {
        icon: actionIcons.edit,
        label: 'Edit',
        description: 'Change the name, type, or details',
        onPress: () => router.push({ pathname: '/account-form', params: { id: account.id } }),
      },
    ];
    if (account.isArchived) {
      actions.push({
        icon: actionIcons.restore,
        label: 'Restore account',
        description: 'Make it available for new transactions again',
        onPress: () => void restoreAccount(account),
      });
    } else {
      actions.push({
        icon: actionIcons.archive,
        label: 'Archive',
        description: 'Keeps history and balance, blocks new transactions',
        onPress: () => confirmArchive(account),
        tone: 'destructive',
      });
    }
    if (canDelete) {
      actions.push({
        icon: actionIcons.delete,
        label: 'Delete permanently',
        description: 'Only possible because it has no financial history',
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
      if (cause instanceof AccountActionError) dialog.notice({ title: 'Unable to restore account', message: cause.message });
      else setActionError(toUserMessage(cause, 'Unable to restore account.'));
    }
  }

  function confirmPermanentDelete(account: AccountWithBalance) {
    dialog.confirm({
      title: 'Delete account permanently?',
      message: `${account.name} will be permanently deleted. This cannot be undone.`,
      confirmLabel: 'Delete permanently',
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
      if (cause instanceof AccountActionError) dialog.notice({ title: 'Unable to delete account', message: cause.message });
      else setActionError(toUserMessage(cause, 'Unable to delete account.'));
    }
  }

  function confirmArchive(account: AccountWithBalance) {
    dialog.confirm({
      title: 'Archive account?',
      message: `${account.name} will remain in history and net worth while it has a balance. It cannot be used for new transactions.`,
      confirmLabel: 'Archive',
      tone: 'destructive',
      onConfirm: () => void accountService.archive(account.id).then(reload),
    });
  }

  return (
    <ScreenContainer contentStyle={styles.content} {...pullToRefresh}>
      <PrimaryScreenHeader title="Accounts" />

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
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Active accounts</Text>
        {archivedAccounts.length > 0 ? (
          <Pressable
            accessibilityLabel={showArchived ? 'Hide archived accounts' : 'Show archived accounts'}
            accessibilityRole="button"
            onPress={() => setShowArchived((value) => !value)}
            style={[styles.filter, { backgroundColor: showArchived ? theme.tintPrimary : theme.elevatedSurface }]}>
            <Text style={[styles.filterText, { color: showArchived ? theme.primaryAction : theme.secondaryText }]}>{showArchived ? 'Hide archived' : `Archived (${archivedAccounts.length})`}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <View style={styles.accounts}><LoadingAccountCard /><LoadingAccountCard /></View> : null}
      {!loading && error ? <AccountsErrorState message={error} onRetry={() => void reload()} /> : null}
      {!loading && !error && activeAccounts.length === 0 ? <EmptyAccountsState /> : null}
      {!loading && !error && activeAccounts.length > 0 ? (
        <View accessibilityLabel="Active accounts" style={styles.accounts}>
          {activeAccounts.map((account) => <AccountCard account={account} key={account.id} rates={rates} onActions={(selected) => void openActions(selected)} onOpen={account.type === 'credit_card' ? (selected) => router.push({ pathname: '/accounts/[id]', params: { id: selected.id } }) : undefined} />)}
        </View>
      ) : null}

      {!loading && !error && activeInvestments.length > 0 ? (
        <View style={styles.archivedSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Investments</Text>
            <Pressable
              accessibilityLabel="View all investments"
              accessibilityRole="button"
              onPress={() => router.push('/investments')}
              style={[styles.filter, { backgroundColor: theme.elevatedSurface }]}>
              <Text style={[styles.filterText, { color: theme.primaryAction }]}>View all</Text>
            </Pressable>
          </View>
          <View accessibilityLabel="Investments" style={styles.accounts}>
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
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Archived accounts</Text>
          <View accessibilityLabel="Archived accounts" style={styles.accounts}>
            {archivedAccounts.map((account) => <AccountCard account={account} key={account.id} rates={rates} onActions={(selected) => void openActions(selected)} onOpen={account.type === 'credit_card' ? (selected) => router.push({ pathname: '/accounts/[id]', params: { id: selected.id } }) : undefined} />)}
          </View>
        </View>
      ) : null}

      <AddAccountButton onPress={() => router.push('/account-form')} />

      <ActionSheet
        actions={menu ? menuActions(menu) : []}
        description={menu?.account.isArchived ? 'This account is archived.' : 'Choose an account action.'}
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
