import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View, type AlertButton } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { PrimaryScreenHeader } from '@/components/primary-screen-header';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import { AccountActionError } from '@/features/accounts/account.service';
import { accountService } from '@/features/accounts/accounts';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AccountsErrorState, EmptyAccountsState, LoadingAccountCard } from '@/features/accounts/components/account-states';
import { AddAccountButton } from '@/features/accounts/components/add-account-button';
import { NetWorthSummary } from '@/features/accounts/components/net-worth-summary';
import { useAccounts } from '@/features/accounts/use-accounts';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function AccountsScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const [showArchived, setShowArchived] = useState(false);
  const [actionError, setActionError] = useState<string>();
  const { accounts, error, loading, reload } = useAccounts();
  const activeAccounts = useMemo(() => accounts.filter((account) => !account.isArchived), [accounts]);
  const archivedAccounts = useMemo(() => accounts.filter((account) => account.isArchived), [accounts]);
  const netWorth = accountService.calculateNetWorth(accounts);

  async function openActions(account: AccountWithBalance) {
    setActionError(undefined);
    let canDelete = false;
    try {
      canDelete = await accountService.canPermanentlyDelete(account.id);
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'Unable to load account actions.');
      return;
    }
    const actions: AlertButton[] = [
      { text: 'Cancel', style: 'cancel' as const },
      { text: 'Edit', onPress: () => router.push({ pathname: '/account-form', params: { id: account.id } }) },
    ];
    if (account.isArchived) {
      actions.push({ text: 'Restore account', onPress: () => void restoreAccount(account) });
    } else {
      actions.push({
        text: 'Archive',
        style: 'destructive',
        onPress: () => confirmArchive(account),
      });
    }
    if (canDelete) {
      actions.push({
        text: 'Delete permanently',
        style: 'destructive',
        onPress: () => confirmPermanentDelete(account),
      });
    }
    Alert.alert(account.name, 'Choose an account action.', actions);
  }

  async function restoreAccount(account: AccountWithBalance) {
    setActionError(undefined);
    try {
      await accountService.restore(account.id);
      await reload();
    } catch (cause) {
      if (cause instanceof AccountActionError) Alert.alert('Unable to restore account', cause.message);
      else setActionError(cause instanceof Error ? cause.message : 'Unable to restore account.');
    }
  }

  function confirmPermanentDelete(account: AccountWithBalance) {
    Alert.alert(
      'Delete account permanently?',
      `${account.name} will be permanently deleted. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete permanently', style: 'destructive', onPress: () => void deletePermanently(account) },
      ],
    );
  }

  async function deletePermanently(account: AccountWithBalance) {
    setActionError(undefined);
    try {
      await accountService.permanentlyDelete(account.id);
      await reload();
    } catch (cause) {
      if (cause instanceof AccountActionError) Alert.alert('Unable to delete account', cause.message);
      else setActionError(cause instanceof Error ? cause.message : 'Unable to delete account.');
    }
  }

  function confirmArchive(account: AccountWithBalance) {
    Alert.alert(
      'Archive account?',
      `${account.name} will remain in history and net worth while it has a balance. It cannot be used for new transactions.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Archive', style: 'destructive', onPress: () => void accountService.archive(account.id).then(reload) },
      ],
    );
  }

  return (
    <ScreenContainer contentStyle={styles.content}>
      <PrimaryScreenHeader />
      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Accounts</Text>
        <Text style={[styles.description, { color: theme.secondaryText }]}>Manage your balances across all accounts.</Text>
      </View>

      {actionError ? (
        <Text accessibilityLiveRegion="assertive" style={[styles.actionError, { color: theme.destructive }]}>
          {actionError}
        </Text>
      ) : null}

      <NetWorthSummary amount={formatCop(netWorth)} currency="COP" />

      <View style={styles.sectionHeader}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Active accounts</Text>
        {archivedAccounts.length > 0 ? (
          <Pressable
            accessibilityLabel={showArchived ? 'Hide archived accounts' : 'Show archived accounts'}
            accessibilityRole="button"
            onPress={() => setShowArchived((value) => !value)}
            style={[styles.filter, { backgroundColor: showArchived ? theme.selectedNavigationBackground : theme.surface, borderColor: showArchived ? theme.primaryAction : theme.border }]}>
            <Text style={[styles.filterText, { color: showArchived ? theme.selectedNavigationForeground : theme.secondaryText }]}>{showArchived ? 'Hide archived' : `Archived (${archivedAccounts.length})`}</Text>
          </Pressable>
        ) : null}
      </View>

      {loading ? <View style={styles.accounts}><LoadingAccountCard /><LoadingAccountCard /></View> : null}
      {!loading && error ? <AccountsErrorState message={error} onRetry={() => void reload()} /> : null}
      {!loading && !error && activeAccounts.length === 0 ? <EmptyAccountsState /> : null}
      {!loading && !error && activeAccounts.length > 0 ? (
        <View accessibilityLabel="Active accounts" style={styles.accounts}>
          {activeAccounts.map((account) => <AccountCard account={account} key={account.id} onActions={(selected) => void openActions(selected)} onOpen={account.type === 'credit_card' ? (selected) => router.push({ pathname: '/accounts/[id]', params: { id: selected.id } }) : undefined} />)}
        </View>
      ) : null}

      {showArchived && archivedAccounts.length > 0 ? (
        <View style={styles.archivedSection}>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Archived accounts</Text>
          <View accessibilityLabel="Archived accounts" style={styles.accounts}>
            {archivedAccounts.map((account) => <AccountCard account={account} key={account.id} onActions={(selected) => void openActions(selected)} onOpen={account.type === 'credit_card' ? (selected) => router.push({ pathname: '/accounts/[id]', params: { id: selected.id } }) : undefined} />)}
          </View>
        </View>
      ) : null}

      <AddAccountButton onPress={() => router.push('/account-form')} />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: { gap: spacing.lg },
  heading: { gap: spacing.xs },
  title: { ...typography.title },
  description: { ...typography.body },
  actionError: { ...typography.caption },
  sectionHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  sectionTitle: { ...typography.sectionTitle },
  filter: { borderRadius: borderRadii.full, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  filterText: { ...typography.caption, fontWeight: '700' },
  accounts: { gap: spacing.md },
  archivedSection: { gap: spacing.md },
});
