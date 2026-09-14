import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { formatBase } from '@/features/accounts/account-format';
import { formatEstimatedReturn } from '@/features/investments/investment-format';
import { useInvestments } from '@/features/investments/use-investments';
import { formatReportDate } from '../report-period';
import type {
  ComparisonMetric,
  PeriodSummary,
  PreviousPeriodComparison,
  ReportPeriodSelection,
} from '../report.types';
import { useReports } from '../use-reports';
import { ReportPeriodSelector } from './report-period-selector';
import {
  BudgetPerformanceList,
  CashFlowChart,
  CategoryDonut,
  CategoryExpenseList,
  NetWorthChart,
  PaceChart,
  WeekdayChart,
} from './report-visualizations';
import { budgetPerformance } from '../report-insights';
import { useReportBudgets } from '../use-report-budgets';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ScreenHeader } from '@/components/screen-header';
import { getIntlLocale } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';

export function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const [selection, setSelection] = useState<ReportPeriodSelection>({ preset: 'current-month' });
  const reports = useReports(selection);
  const { portfolio } = useInvestments();
  const data = reports.data;
  const { limits, monthCount } = useReportBudgets(data?.period);
  const budgets = data ? budgetPerformance(limits, data.categoryExpenses) : [];

  if (reports.loading && !data) {
    return <ReportsLoading onBack={() => router.back()} />;
  }

  if (reports.error && !data) {
    return <ReportsError message={reports.error} onBack={() => router.back()} onRetry={reports.reload} />;
  }

  return (
    <ScrollView
      contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}
      refreshControl={(
        <RefreshControl
          colors={[theme.primaryAction]}
          onRefresh={reports.refresh}
          refreshing={reports.refreshing}
          tintColor={theme.primaryAction}
        />
      )}
      showsVerticalScrollIndicator={false}
      style={{ backgroundColor: theme.appBackground }}>
      <ReportsHeader onBack={() => router.back()} topInset={insets.top} />
      <ReportPeriodSelector
        onChange={setSelection}
        periodLabel={data?.period.label}
        selection={selection}
      />

      {reports.loading ? (
        <Text accessibilityLiveRegion="polite" style={[styles.updating, { color: theme.secondaryText }]}>
          {t.reports.updating}
        </Text>
      ) : null}
      {reports.error ? (
        <View style={[styles.inlineError, { backgroundColor: theme.tintDestructive }]}>
          <Text accessibilityLiveRegion="assertive" style={[styles.errorText, { color: theme.destructive }]}>
            {reports.error}
          </Text>
          <Button label={t.common.retry} onPress={reports.reload} size="sm" variant="ghost" />
        </View>
      ) : null}

      {data ? (
        <View style={styles.content}>
          {data.summary.incomeCount + data.summary.expenseCount === 0 ? (
            <View style={[styles.emptyNotice, { backgroundColor: theme.elevatedSurface }]}>
              <SymbolView
                name={{ ios: 'chart.bar', android: 'monitoring', web: 'monitoring' }}
                size={24}
                tintColor={theme.secondaryText}
              />
              <View style={styles.emptyText}>
                <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>{t.reports.emptyTitle}</Text>
                <Text style={[styles.emptyDescription, { color: theme.secondaryText }]}>
                  {t.reports.emptyDescription}
                </Text>
              </View>
            </View>
          ) : null}

          <ReportSection
            description={t.reports.summaryDescription}
            title={t.reports.summaryTitle}>
            <PeriodHeadline comparison={data.comparison} summary={data.summary} />
            <CollapsibleDetails>
              <View style={styles.summaryGrid}>
                <SummaryMetric label={t.reports.grossExpenses} tone="expense" value={formatBase(data.summary.grossExpenses)} />
                <SummaryMetric label={t.reports.refunds} tone="refund" value={formatBase(data.summary.refunds)} />
                <SummaryMetric label={t.reports.averageExpense} value={formatBase(data.summary.averageExpense)} />
                <SummaryMetric label={t.reports.expenseTransactions} value={String(data.summary.expenseCount)} />
                <SummaryMetric label={t.reports.incomeTransactions} value={String(data.summary.incomeCount)} />
                <SummaryMetric label={t.reports.refundTransactions} value={String(data.summary.refundCount)} />
              </View>
            </CollapsibleDetails>
            <View style={[styles.largest, { borderTopColor: theme.hairline }]}>
              <Text style={[styles.largestLabel, { color: theme.secondaryText }]}>{t.reports.largestExpense}</Text>
              {data.summary.largestExpense ? (
                <>
                  <Text style={[styles.largestAmount, { color: theme.expense }]}>
                    {formatBase(data.summary.largestExpense.amount)}
                  </Text>
                  <Text style={[styles.largestMeta, { color: theme.secondaryText }]}>
                    {data.summary.largestExpense.categoryName} · {data.summary.largestExpense.accountName} ·{' '}
                    {formatReportDate(data.summary.largestExpense.transactionDate)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.largestMeta, { color: theme.secondaryText }]}>{t.reports.noLargestExpense}</Text>
              )}
            </View>
          </ReportSection>

          <ReportSection
            description={data.period.grouping === 'day' ? t.reports.cashFlowDescriptionDay : t.reports.cashFlowDescriptionMonth}
            title={t.reports.cashFlowTitle}>
            <CashFlowChart buckets={data.cashFlow} />
          </ReportSection>

          {data.pace.length > 1 ? (
            <ReportSection
              description={t.reports.paceDescription(data.comparison.previousPeriod.label)}
              title={t.reports.paceTitle}>
              <PaceChart pace={data.pace} previousLabel={t.reports.previousPeriod} />
            </ReportSection>
          ) : null}

          {budgets.length > 0 ? (
            <ReportSection
              description={t.reports.budgetDescription}
              title={t.reports.budgetTitle}>
              <BudgetPerformanceList budgets={budgets} monthCount={monthCount} />
            </ReportSection>
          ) : null}

          {data.weekdaySpending.length > 0 ? (
            <ReportSection
              description={t.reports.weekdayDescription}
              title={t.reports.weekdayTitle}>
              <WeekdayChart weekdays={data.weekdaySpending} />
            </ReportSection>
          ) : null}

          <ReportSection
            description={t.reports.categoryDescription}
            title={t.reports.categoryTitle}>
            {data.categoryExpenses.length > 0 ? (
              <>
                <CategoryDonut categories={data.categoryExpenses} />
                <View style={styles.donutDivider} />
                <CategoryExpenseList categories={data.categoryExpenses} />
              </>
            ) : (
              <SectionEmpty text={t.reports.categoryEmpty} />
            )}
          </ReportSection>

          <ReportSection
            description={data.period.grouping === 'day'
              ? t.reports.netWorthDescriptionDay(formatReportDate(data.period.dateFrom))
              : t.reports.netWorthDescriptionMonth(formatReportDate(data.period.dateFrom))}
            title={t.reports.netWorthTitle}>
            <NetWorthChart points={data.netWorth} />
          </ReportSection>

          {portfolio.investmentAccountCount > 0 ? (
            <ReportSection
              description={t.reports.investmentsDescription}
              title={t.reports.investmentsTitle}>
              <View style={styles.summaryGrid}>
                <SummaryMetric
                  label={t.reports.currentValue}
                  value={portfolio.totalCurrentValueBaseMinor === null ? t.reports.estimatedIncomplete : formatBase(portfolio.totalCurrentValueBaseMinor)}
                />
                <SummaryMetric
                  label={t.reports.netContributions}
                  value={portfolio.netContributionsBaseMinor === null ? '—' : formatBase(portfolio.netContributionsBaseMinor)}
                />
                <SummaryMetric
                  label={t.reports.estimatedGainLoss}
                  tone={portfolio.estimatedGainLossBaseMinor === null ? undefined : portfolio.estimatedGainLossBaseMinor >= 0 ? 'income' : 'expense'}
                  value={portfolio.estimatedGainLossBaseMinor === null ? '—' : formatBase(portfolio.estimatedGainLossBaseMinor)}
                />
                <SummaryMetric label={t.reports.simpleEstimatedReturn} value={formatEstimatedReturn(portfolio.estimatedReturn)} />
                <SummaryMetric label={t.reports.investmentIncomePeriod} tone="income" value={formatBase(data.investments.incomeBaseMinor)} />
                <SummaryMetric label={t.reports.incomeTransactions} value={String(data.investments.incomeCount)} />
              </View>
            </ReportSection>
          ) : null}

          <ReportSection
            description={t.reports.comparisonDescription(data.comparison.previousPeriod.label)}
            title={t.reports.comparisonTitle}>
            <View style={styles.comparisons}>
              <ComparisonRow label={t.reports.income} metric={data.comparison.income} />
              <ComparisonRow label={t.reports.netExpenses} metric={data.comparison.expenses} />
              <ComparisonRow label={t.reports.netResult} metric={data.comparison.net} />
              <ComparisonRow label={t.reports.averageExpense} metric={data.comparison.averageExpense} />
              <ComparisonRow count label={t.reports.expenseTransactions} metric={data.comparison.expenseCount} />
            </View>
          </ReportSection>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ReportsHeader({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  const t = useMessages();
  return (
    <ScreenHeader
      leading="back"
      leadingAccessibilityLabel={t.reports.backFromReports}
      onLeadingPress={onBack}
      subtitle={t.reports.headerSubtitle}
      title={t.reports.title}
      topInset={topInset}
    />
  );
}

function ReportSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeading}>
        <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
        <Text style={[styles.sectionDescription, { color: theme.secondaryText }]}>{description}</Text>
      </View>
      <Card>{children}</Card>
    </View>
  );
}

/**
 * Headline block: the number that answers "did I come out ahead", with its
 * savings rate and previous-period delta, then the three supporting totals.
 *
 * The previous grid gave "Net result" and "Income transactions" identical weight,
 * so nothing stood out. Counts and averages now live behind "Show details".
 */
function PeriodHeadline({ summary, comparison }: { summary: PeriodSummary; comparison: PreviousPeriodComparison }) {
  const theme = useAppTheme();
  const t = useMessages();
  const positive = summary.net >= 0;
  const netColor = positive ? theme.income : theme.expense;

  return (
    <View style={styles.headline}>
      <View style={styles.headlineTop}>
        <View style={styles.headlineMain}>
          <Text style={[styles.headlineLabel, { color: theme.mutedText }]}>{t.reports.netResult}</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.headlineValue, { color: netColor }]}>
            {positive ? '+' : '-'}{formatBase(Math.abs(summary.net))}
          </Text>
        </View>
        <DeltaChip metric={comparison.net} />
      </View>

      {summary.savingsRateBasisPoints === null ? (
        <Text style={[styles.headlineHint, { color: theme.mutedText }]}>
          {t.reports.savingsRateNotApplicable}
        </Text>
      ) : (
        <Text style={[styles.headlineHint, { color: theme.secondaryText }]}>
          {t.reports.savingsRate(formatPercentage(summary.savingsRateBasisPoints))}
        </Text>
      )}

      <View style={styles.headlineRow}>
        <SummaryMetric label={t.reports.income} tone="income" value={formatBase(summary.income)} />
        <SummaryMetric label={t.reports.netExpenses} tone="expense" value={formatBase(summary.expenses)} />
      </View>
    </View>
  );
}

/** Compact previous-period delta, shown next to the metric it belongs to. */
function DeltaChip({ metric }: { metric: ComparisonMetric }) {
  const theme = useAppTheme();
  if (!metric.hasPreviousData) return null;
  const toneColor = metric.tone === 'positive'
    ? theme.income
    : metric.tone === 'negative'
      ? theme.expense
      : theme.secondaryText;
  const arrow: SymbolViewProps['name'] = metric.direction === 'increased'
    ? { ios: 'arrow.up', android: 'arrow_upward', web: 'arrow_upward' }
    : metric.direction === 'decreased'
      ? { ios: 'arrow.down', android: 'arrow_downward', web: 'arrow_downward' }
      : { ios: 'minus', android: 'remove', web: 'remove' };
  return (
    <View style={[styles.deltaChip, { backgroundColor: theme.elevatedSurface }]}>
      <SymbolView name={arrow} size={13} tintColor={toneColor} />
      <Text style={[styles.deltaChipText, { color: toneColor }]}>
        {metric.percentageChangeBasisPoints === null
          ? formatBase(Math.abs(metric.difference))
          : formatPercentage(Math.abs(metric.percentageChangeBasisPoints))}
      </Text>
    </View>
  );
}

function CollapsibleDetails({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const t = useMessages();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.details}>
      <Pressable
        accessibilityLabel={open ? t.reports.hideSummaryDetails : t.reports.showSummaryDetails}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={spacing.sm}
        onPress={() => setOpen((value) => !value)}
        style={styles.detailsToggle}>
        <Text style={[styles.detailsToggleLabel, { color: theme.primaryAction }]}>
          {open ? t.reports.hideDetails : t.reports.showDetails}
        </Text>
        <SymbolView
          name={open
            ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
            : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={16}
          tintColor={theme.primaryAction}
        />
      </Pressable>
      {open ? children : null}
    </View>
  );
}

function SummaryMetric({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: 'income' | 'expense' | 'refund';
}) {
  const theme = useAppTheme();
  const valueColor = tone === 'income'
    ? theme.income
    : tone === 'expense'
      ? theme.expense
      : tone === 'refund'
        ? theme.primaryAction
        : theme.primaryText;
  return (
    <View style={styles.metric}>
      <Text style={[styles.metricLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.metricValue, { color: valueColor }]}>{value}</Text>
    </View>
  );
}

function ComparisonRow({
  label,
  metric,
  count = false,
}: {
  label: string;
  metric: ComparisonMetric;
  count?: boolean;
}) {
  const theme = useAppTheme();
  const t = useMessages();
  const toneColor = metric.tone === 'positive'
    ? theme.income
    : metric.tone === 'negative'
      ? theme.expense
      : theme.secondaryText;
  const currentValue = count ? String(metric.current) : formatBase(metric.current);
  const differenceValue = count ? String(Math.abs(metric.difference)) : formatBase(Math.abs(metric.difference));
  let change = t.reports.noChange;
  if (!metric.hasPreviousData) {
    change = t.reports.noPreviousData;
  } else if (metric.direction !== 'unchanged') {
    const percentage = metric.percentageChangeBasisPoints === null
      ? t.reports.percentageUnavailable
      : formatPercentage(Math.abs(metric.percentageChangeBasisPoints));
    change = metric.direction === 'increased'
      ? t.reports.increasedBy(differenceValue, percentage)
      : t.reports.decreasedBy(differenceValue, percentage);
  }
  return (
    <View accessibilityLabel={t.reports.comparisonRowLabel(label, currentValue, change)} style={[styles.comparisonRow, { borderBottomColor: theme.hairline }]}>
      <View style={styles.comparisonValues}>
        <Text style={[styles.comparisonLabel, { color: theme.primaryText }]}>{label}</Text>
        <Text style={[styles.comparisonCurrent, { color: theme.primaryText }]}>{currentValue}</Text>
      </View>
      <Text style={[styles.comparisonChange, { color: toneColor }]}>{change}</Text>
    </View>
  );
}

function SectionEmpty({ text }: { text: string }) {
  const theme = useAppTheme();
  return <Text style={[styles.sectionEmpty, { color: theme.secondaryText }]}>{text}</Text>;
}

function ReportsLoading({ onBack }: { onBack: () => void }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <View style={[styles.stateScreen, { backgroundColor: theme.appBackground }]}>
      <ReportsHeader onBack={onBack} topInset={insets.top} />
      <View accessibilityLabel={t.reports.loadingReports} style={styles.skeletons}>
        {[0, 1, 2].map((item) => (
          <View key={item} style={[styles.skeleton, { backgroundColor: theme.elevatedSurface }]} />
        ))}
      </View>
    </View>
  );
}

function ReportsError({
  message,
  onBack,
  onRetry,
}: {
  message: string;
  onBack: () => void;
  onRetry: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <View style={[styles.stateScreen, { backgroundColor: theme.appBackground }]}>
      <ReportsHeader onBack={onBack} topInset={insets.top} />
      <View style={styles.errorState}>
        <Text accessibilityLiveRegion="assertive" style={[styles.errorTitle, { color: theme.primaryText }]}>{t.reports.loadErrorTitle}</Text>
        <Text style={[styles.errorDescription, { color: theme.secondaryText }]}>{message}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.primaryRetry, { backgroundColor: theme.primaryAction }]}>
          <Text style={[styles.retryText, { color: theme.onPrimaryAction }]}>{t.common.tryAgain}</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatPercentage(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString(getIntlLocale(), { maximumFractionDigits: 2 })}%`;
}

const styles = StyleSheet.create({
  content: { gap: spacing.xl, paddingHorizontal: spacing.md, paddingTop: spacing.lg },
  updating: { ...typography.caption, paddingHorizontal: spacing.md, paddingTop: spacing.sm, textAlign: 'center' },
  inlineError: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    flexDirection: 'row',
    gap: spacing.sm,
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
  },
  errorText: { ...typography.caption, flex: 1 },
  retryText: { ...typography.captionStrong },
  emptyNotice: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  emptyText: { flex: 1, gap: spacing.xs },
  emptyTitle: { ...typography.captionStrong },
  emptyDescription: { ...typography.caption },
  section: { gap: spacing.sm },
  sectionHeading: { gap: spacing.xs },
  sectionTitle: { ...typography.sectionTitle },
  sectionDescription: { ...typography.caption },
  headline: { gap: spacing.sm },
  headlineTop: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  headlineMain: { flex: 1, gap: spacing.xs, minWidth: 0 },
  headlineLabel: { ...typography.overline },
  headlineValue: { ...typography.moneyHero },
  headlineHint: { ...typography.caption },
  headlineRow: { borderTopColor: 'transparent', flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs },
  deltaChip: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaChipText: { ...typography.label, fontSize: 11 },
  details: { gap: spacing.sm, marginTop: spacing.sm },
  detailsToggle: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs, minHeight: 32 },
  detailsToggleLabel: { ...typography.label },
  donutDivider: { height: spacing.md },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  metric: { gap: spacing.xs, minWidth: '50%', paddingRight: spacing.sm, width: '50%' },
  metricLabel: { ...typography.label },
  metricValue: { ...typography.money },
  largest: { borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs, marginTop: spacing.lg, paddingTop: spacing.md },
  largestLabel: { ...typography.label },
  largestAmount: { ...typography.money },
  largestMeta: { ...typography.caption },
  sectionEmpty: { ...typography.caption, paddingVertical: spacing.lg, textAlign: 'center' },
  comparisons: {},
  comparisonRow: { borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs, minHeight: 72, paddingVertical: spacing.sm },
  comparisonValues: { alignItems: 'baseline', flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  comparisonLabel: { ...typography.captionStrong },
  comparisonCurrent: { ...typography.captionStrong },
  comparisonChange: { ...typography.label },
  stateScreen: { flex: 1 },
  skeletons: { gap: spacing.lg, padding: spacing.md },
  skeleton: { borderRadius: borderRadii.md, height: 150 },
  errorState: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  errorTitle: { ...typography.sectionTitle, textAlign: 'center' },
  errorDescription: { ...typography.body, textAlign: 'center' },
  primaryRetry: { borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
});
