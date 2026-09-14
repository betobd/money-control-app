import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionTileRow } from '@/components/action-tile';
import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { AccountActionError } from '@/features/accounts/account.service';
import { accountService } from '@/features/accounts/accounts';
import { formatMoney, formatMoneyWithSymbol } from '@/features/currency/currency';
import { useBaseCurrency } from '@/features/settings/use-base-currency';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { formatEstimatedReturn, investmentLiquidityLabels, investmentTypeLabels } from '../investment-format';
import { InvestmentValuationError } from '../investment-valuation.service';
import { investmentValuationService } from '../investments';
import type { InvestmentValuation } from '../investment.types';
import { useInvestmentDetails } from '../use-investments';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';

export function InvestmentDetailsScreen({ accountId }: { accountId: string }) {
  const baseCurrency = useBaseCurrency();
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const router = useRouter();
  const { view, valuations, loading, error, reload } = useInvestmentDetails(accountId);
  const [actionError, setActionError] = useState<string>();

  function confirmDeleteValuation(valuation: InvestmentValuation) {
    dialog.confirm({
      title: t.investments.deleteValuationTitle,
      message: t.investments.deleteValuationMessage(formatTransactionDate(valuation.valuationDate)),
      confirmLabel: t.common.delete,
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
      if (cause instanceof InvestmentValuationError) dialog.notice({ title: t.investments.deleteValuationErrorTitle, message: cause.message });
      else setActionError(toUserMessage(cause, t.investments.deleteValuationErrorFallback));
    }
  }

  function confirmArchive() {
    if (!view) return;
    dialog.confirm({
      title: t.investments.archiveTitle,
      message: t.investments.archiveMessage(view.account.name),
      confirmLabel: t.investments.archive,
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
      if (cause instanceof AccountActionError) dialog.notice({ title: t.investments.archiveErrorTitle, message: cause.message });
      else setActionError(toUserMessage(cause, t.investments.archiveErrorFallback));
    }
  }

  if (loading && !view) {
    return (
      <View accessibilityLabel={t.investments.loadingInvestment} style={[styles.center, { backgroundColor: theme.appBackground }]}>
        <ActivityIndicator color={theme.primaryAction} size="large" />
      </View>
    );
  }

  if (error || !view) {
    return (
      <View style={[styles.center, { backgroundColor: theme.appBackground, padding: spacing.lg }]}>
        <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.investments.loadInvestmentError}</Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>{error ?? t.investments.notAnInvestment}</Text>
        <Button label={t.common.retry} onPress={() => void reload()} variant="primary" />
      </View>
    );
  }

  const { account, metadata } = view;
  const currency = account.currency;
  const isForeign = currency !== baseCurrency;
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
      <ScreenHeader leading="back" title={account.name} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}>
        {actionError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{actionError}</Text>
        ) : null}
        {isArchived ? (
          <View style={[styles.notice, { backgroundColor: theme.tintWarning }]}>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{t.investments.archivedNotice}</Text>
          </View>
        ) : null}

        <Card variant="hero" padding={spacing.lg} style={styles.hero}>
          <Overline color={theme.secondaryText}>{t.investments.currentValue}</Overline>
          <Text adjustsFontSizeToFit minimumFontScale={0.65} numberOfLines={1} style={[styles.amount, { color: theme.primaryText }]}>{money(view.currentValueMinor)}</Text>
          {isForeign ? (
            <Text style={[styles.caption, { color: theme.mutedText }]}>
              {view.estimatedValueBaseMinor === null
                ? t.investments.estimatedBaseUnavailable(baseCurrency)
                : `≈ ${formatMoney(view.estimatedValueBaseMinor, baseCurrency)}`}
            </Text>
          ) : null}
          <View style={styles.gainRow}>
            <Text style={[styles.bodyStrong, { color: gainColor }]}>
              {view.estimatedGainLossMinor > 0 ? '+' : ''}{money(view.estimatedGainLossMinor)}
            </Text>
            <Text style={[styles.bodyStrong, { color: gainColor }]}>{formatEstimatedReturn(view.estimatedReturn)}</Text>
          </View>
        </Card>

        <Section title={t.investments.position}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <MetricRow label={t.investments.netContributions} value={money(view.netContributionsMinor)} />
            <MetricRow label={t.investments.totalContributions} value={money(view.totalContributionsMinor)} />
            <MetricRow label={t.investments.totalWithdrawals} value={money(view.totalWithdrawalsMinor)} />
            <MetricRow label={t.investments.latestValuation} value={view.latestValuation ? formatTransactionDate(view.latestValuation.valuationDate) : t.investments.noValuationYet} />
          </View>
        </Section>

        <Section title={t.investments.details}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            <MetricRow label={t.investments.type} value={investmentTypeLabels[metadata.investmentType]} />
            <MetricRow label={t.investments.liquidity} value={investmentLiquidityLabels[metadata.liquidity]} />
            <MetricRow label={t.investments.currency} value={currency} />
            <MetricRow label={t.investments.provider} value={metadata.providerName ?? '—'} />
            <MetricRow label={t.investments.startDate} value={metadata.startDate ? formatTransactionDate(metadata.startDate) : '—'} />
            <MetricRow label={t.investments.maturityDate} value={metadata.maturityDate ? formatTransactionDate(metadata.maturityDate) : '—'} />
            {metadata.note ? (
              <View style={styles.noteBlock}>
                <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{t.investments.note}</Text>
                <Text style={[styles.body, { color: theme.primaryText }]}>{metadata.note}</Text>
              </View>
            ) : null}
          </View>
        </Section>

        {!isArchived ? (
          <Section title={t.investments.actions}>
            <ActionTileRow
              actions={[
                { label: t.investments.updateValue, accessibilityLabel: t.investments.updateValueLabel, icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }, onPress: () => router.push({ pathname: '/investment-valuation-form', params: { accountId } }), tone: 'primary' },
                { label: t.investments.contribute, accessibilityLabel: t.investments.contributeLabel, icon: { ios: 'plus.circle.fill', android: 'add_circle', web: 'add_circle' }, onPress: () => router.push('/add-transaction') },
                { label: t.investments.withdraw, icon: { ios: 'minus.circle.fill', android: 'do_not_disturb_on', web: 'do_not_disturb_on' }, onPress: () => router.push('/add-transaction') },
                { label: t.common.edit, accessibilityLabel: t.investments.editLabel, icon: { ios: 'pencil', android: 'edit', web: 'edit' }, onPress: () => router.push({ pathname: '/investment-form', params: { id: accountId } }) },
                { label: t.investments.archive, accessibilityLabel: t.investments.archiveLabel, icon: { ios: 'archivebox.fill', android: 'archive', web: 'archive' }, onPress: confirmArchive, tone: 'destructive' },
              ]}
            />
          </Section>
        ) : null}

        <Section title={t.investments.valuationHistory}>
          {valuations.length === 0 ? (
            <View style={[styles.empty, { backgroundColor: theme.surface }]}>
              <Text style={[styles.body, { color: theme.secondaryText }]}>{t.investments.noValuations}</Text>
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
                      accessibilityLabel={t.investments.deleteValuationLabel(formatTransactionDate(valuation.valuationDate))}
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  center: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center' },
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
  bodyStrong: { ...typography.bodyStrong },
  caption: { ...typography.caption },
});
