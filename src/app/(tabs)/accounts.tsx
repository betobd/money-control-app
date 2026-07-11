import { StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/screen-container';
import { spacing, typography } from '@/constants/theme';
import { AccountCard } from '@/features/accounts/components/account-card';
import { AddAccountButton } from '@/features/accounts/components/add-account-button';
import { NetWorthSummary } from '@/features/accounts/components/net-worth-summary';
import { accountsOverviewMock } from '@/features/accounts/accounts.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function AccountsScreen() {
  const theme = useAppTheme();

  return (
    <ScreenContainer contentStyle={styles.content}>
      <Text accessibilityRole="header" style={[styles.brand, { color: theme.primaryText }]}>
        Money Control
      </Text>

      <View style={styles.heading}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          Accounts
        </Text>
        <Text style={[styles.description, { color: theme.secondaryText }]}>
          Manage your balances across all accounts.
        </Text>
      </View>

      <NetWorthSummary
        amount={accountsOverviewMock.netWorth.amount}
        currency={accountsOverviewMock.netWorth.currency}
      />

      <View accessibilityLabel="Active accounts" style={styles.accounts}>
        {accountsOverviewMock.accounts.map((account) => (
          <AccountCard account={account} key={account.id} />
        ))}
      </View>

      <AddAccountButton />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.lg,
  },
  brand: {
    ...typography.sectionTitle,
    textAlign: 'center',
  },
  heading: {
    gap: spacing.xs,
  },
  title: {
    ...typography.title,
  },
  description: {
    ...typography.body,
  },
  accounts: {
    gap: spacing.md,
  },
});
