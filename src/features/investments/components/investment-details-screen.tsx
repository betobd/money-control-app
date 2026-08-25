import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { AccountActionError } from '@/features/accounts/account.service';
import { accountService } from '@/features/accounts/accounts';
import { formatMoneyNumber, formatMoneyWithSymbol } from '@/features/currency/currency';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatEstimatedReturn, investmentLiquidityLabels, investmentTypeLabels } from '../investment-format';
import { InvestmentValuationError } from '../investment-valuation.service';
import { investmentValuationService } from '../investments';
import type { InvestmentValuation } from '../investment.types';
import { useInvestmentDetails } from '../use-investments';
import { DialogHost, useDialog } from '@/components/dialog';

export function InvestmentDetailsScreen({ accountId }: { accountId: string }) {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const router = useRouter();
  const { view, valuations, loading, error, reload } = useInvestmentDetails(accountId);
  const [actionError, setActionError] = useState<string>();

  function confirmDeleteValuation(valuation: InvestmentValuation) {
    dialog.confirm({
      title: 'Delete valuation?',
      message: `The valuation from ${formatTransactionDate(valuation.valuationDate)} will be removed. This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'destructive',
      onConfirm: () => void deleteValuation(valuation),
    });
  }

  async function deleteValuation(valuation: InvestmentValuation) {
    setActionError(undefined);
    try {
      await investmentValuationService.delete(valuation.id);
      await reload();
    } catch (cause) {
      if (cause instanceof InvestmentValuationError) dialog.notice({ title: 'Unable to delete valuation', message: cause.message });
      else setActionError(toUserMessage(cause, 'Unable to delete valuation.'));
    }
  }

  function confirmArchive() {
    if (!view) return;
    dialog.confirm({
      title: 'Archive investment?',
      message: `${view.account.name} will remain in history and net worth while it has value. It cannot be revalued or used for new transactions.`,
      confirmLabel: 'Archive',
      tone: 'destructive',
      onConfirm: () => void archive(),
    });
  }

  async function archive() {
    setActionError(undefined);
    try {
      await accountService.archive(accountId);
      router.back();
    } catch (cause) {
      if (cause instanceof AccountActionError) dialog.notice({ title: 'Unable to archive investment', message: cause.message });
      else setActionError(toUserMessage(cause, 'Unable to archive investment.'));
    }
  }

  if (loading && !view) {
    return (
      <View accessibilityLabel="Loading investment" style={[styles.center, { backgroundColor: theme.appBackground }]}>
        <ActivityIndicator color={theme.primaryAction} size="large" />
      </View>
    );
  }

  if (error || !view) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground, padding: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Unable to load investment</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>{error ?? 'This account is not an investment.'}</Text>
        <Action label="Retry" onPress={() => void reload()} primary />
      </View>
    );
  }

  const { account, metadata } = view;
  const currency = account.currency;
  const isForeign = currency !== 'COP';
  const money = (value: number) => formatMoneyWithSymbol(value, currency);
  const gainColor =
    view.estimatedGainLossMinor > 0
      ? theme.income
      : view.estimatedGainLossMinor < 0
        ? theme.expense
        : theme.mutedText;
  const isArchived = account.isArchived;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.hairline }]}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.headerTitle, { color: theme.primaryText }]}>{account.name}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {actionError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{actionError}</Text>
        ) : null}
        {isArchived ? (
          <View style={[styles.notice, { backgroundColor: theme.tintWarning }]}>
            <Text style={[styles.body, { color: theme.secondaryText }]}>This investment is archived. Restore it from Accounts to revalue or record activity.</Text>
          </View>
        ) : null}

        <Card variant="hero" padding={spacing.lg} style={styles.hero}>
          <Overline color={theme.secondaryText}>Current value</Overline>
          <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.amount, { color: theme.primaryText }]}>{money(view.currentValueMinor)}</Text>
          {isForeign ? (
            <Text style={[styles.caption, { color: theme.mutedText }]}>
              {view.estimatedValueCopMinor === null
                ? 'Estimated COP — rate unavailable'
                : `≈ COP ${formatMoneyNumber(view.estimatedValueCopMinor, 'COP')}`}
            </Text>
          ) : null}
          <View style={styles.gainRow}>
            <Text style={[styles.bodyStrong, { color: gainColor }]}>
              {view.estimatedGainLossMinor > 0 ? '+' : ''}{money(view.estimatedGainLossMinor)}
            </Text>
            <Text style={[styles.bodyStrong, { color: gainColor }]}>{formatEstimatedReturn(view.estimatedReturn)}</Text>
          </View>
        </Card>

        <Section title="Position">
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <MetricRow label="Net contributions" value={money(view.netContributionsMinor)} />
            <MetricRow label="Total contributions" value={money(view.totalContributionsMinor)} />
            <MetricRow label="Total withdrawals" value={money(view.totalWithdrawalsMinor)} />
            <MetricRow label="Latest valuation" value={view.latestValuation ? formatTransactionDate(view.latestValuation.valuationDate) : 'No valuation yet'} />
          </View>
        </Section>

        <Section title="Details">
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <MetricRow label="Type" value={investmentTypeLabels[metadata.investmentType]} />
            <MetricRow label="Liquidity" value={investmentLiquidityLabels[metadata.liquidity]} />
            <MetricRow label="Currency" value={currency} />
            <MetricRow label="Provider" value={metadata.providerName ?? '—'} />
            <MetricRow label="Start date" value={metadata.startDate ? formatTransactionDate(metadata.startDate) : '—'} />
            <MetricRow label="Maturity date" value={metadata.maturityDate ? formatTransactionDate(metadata.maturityDate) : '—'} />
            {metadata.note ? (
              <View style={styles.noteBlock}>
                <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>Note</Text>
                <Text style={[styles.body, { color: theme.primaryText }]}>{metadata.note}</Text>
              </View>
            ) : null}
          </View>
        </Section>

        {!isArchived ? (
          <Section title="Actions">
            <View style={styles.actions}>
              <Action label="Update value" onPress={() => router.push({ pathname: '/investment-valuation-form', params: { accountId } })} primary />
              <Action label="Add contribution" onPress={() => router.push('/add-transaction')} />
              <Action label="Withdraw" onPress={() => router.push('/add-transaction')} />
              <Action label="Edit" onPress={() => router.push({ pathname: '/investment-form', params: { id: accountId } })} />
              <Action label="Archive" onPress={confirmArchive} destructive />
            </View>
          </Section>
        ) : null}

        <Section title="Valuation history">
          {valuations.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.surface }]}>
              <Text style={[styles.body, { color: theme.secondaryText }]}>No valuations recorded yet.</Text>
            </View>
          ) : (
            valuations.map((valuation) => (
              <View key={valuation.id} style={[styles.valuationCard, { backgroundColor: theme.surface }]}>
                <View style={styles.valuationHead}>
                  <View style={styles.valuationText}>
                    <Text style={[styles.bodyStrong, { color: theme.primaryText }]}>{formatTransactionDate(valuation.valuationDate)}</Text>
                    <Text style={[styles.moneyText, { color: theme.primaryText }]}>{money(valuation.valueMinor)}</Text>
                    {valuation.note ? <Text style={[styles.caption, { color: theme.secondaryText }]}>{valuation.note}</Text> : null}
                  </View>
                  {!isArchived ? (
                    <Pressable
                      accessibilityLabel={`Delete valuation from ${formatTransactionDate(valuation.valuationDate)}`}
                      accessibilityRole="button"
                      hitSlop={8}
                      onPress={() => confirmDeleteValuation(valuation)}
                      style={styles.deleteButton}>
                      <SymbolView name={{ ios: 'trash', android: 'delete', web: 'delete' }} size={20} tintColor={theme.destructive} />
                    </Pressable>
                  ) : null}
                </View>
              </View>
            ))
          )}
        </Section>
      </ScrollView>
      <DialogHost dialog={dialog} />
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      {children}
    </View>
  );
}

function MetricRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.metricRow}>
      <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.metricValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function Action({ label, onPress, primary = false, destructive = false }: { label: string; onPress: () => void; primary?: boolean; destructive?: boolean }) {
  const theme = useAppTheme();
  const background = primary ? theme.primaryAction : destructive ? theme.tintDestructive : theme.elevatedSurface;
  const color = primary ? theme.onPrimaryAction : destructive ? theme.destructive : theme.primaryText;
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[styles.action, { backgroundColor: background }]}>
      <Text style={[styles.actionText, { color }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
  header: { alignItems: 'center', borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md },
  hero: { gap: spacing.xs },
  amount: { ...typography.moneyHero, fontVariant: ['tabular-nums'] },
  gainRow: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.xs },
  notice: { borderRadius: borderRadii.card, padding: spacing.md },
  section: { gap: spacing.sm },
  sectionTitle: { ...typography.sectionTitle },
  card: { borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.md },
  metricRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  metricLabel: { ...typography.caption, flexShrink: 1 },
  metricValue: { ...typography.moneyRow, flexShrink: 1, textAlign: 'right' },
  noteBlock: { gap: spacing.xs },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  action: { alignItems: 'center', borderRadius: borderRadii.full, flexGrow: 1, justifyContent: 'center', minHeight: 52, minWidth: 145, paddingHorizontal: spacing.md },
  actionText: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
  empty: { borderRadius: borderRadii.card, padding: spacing.md },
  valuationCard: { borderRadius: borderRadii.card, padding: spacing.md },
  valuationHead: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  valuationText: { flex: 1, gap: spacing.xs },
  deleteButton: { alignItems: 'center', height: 40, justifyContent: 'center', width: 40 },
  moneyText: { ...typography.moneyRow },
  error: { ...typography.caption },
  body: { ...typography.body },
  bodyStrong: { ...typography.body, fontWeight: '700' },
  caption: { ...typography.caption },
});
