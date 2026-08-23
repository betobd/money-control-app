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
import { formatCop } from '@/features/accounts/account-format';
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

export function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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
          Updating all report sections…
        </Text>
      ) : null}
      {reports.error ? (
        <View style={[styles.inlineError, { backgroundColor: theme.tintDestructive }]}>
          <Text accessibilityLiveRegion="assertive" style={[styles.errorText, { color: theme.destructive }]}>
            {reports.error}
          </Text>
          <Button label="Retry" onPress={reports.reload} size="sm" variant="ghost" />
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
                <Text style={[styles.emptyTitle, { color: theme.primaryText }]}>No posted income or expenses</Text>
                <Text style={[styles.emptyDescription, { color: theme.secondaryText }]}>
                  Totals remain zero for this period. Transfers, voided transactions, and pending or skipped recurring occurrences do not count.
                </Text>
              </View>
            </View>
          ) : null}

          <ReportSection
            description="Posted income and expenses in the selected period."
            title="Period summary">
            <PeriodHeadline comparison={data.comparison} summary={data.summary} />
            <CollapsibleDetails>
              <View style={styles.summaryGrid}>
                <SummaryMetric label="Gross expenses" tone="expense" value={formatCop(data.summary.grossExpenses)} />
                <SummaryMetric label="Refunds" tone="refund" value={formatCop(data.summary.refunds)} />
                <SummaryMetric label="Average expense" value={formatCop(data.summary.averageExpense)} />
                <SummaryMetric label="Expense transactions" value={String(data.summary.expenseCount)} />
                <SummaryMetric label="Income transactions" value={String(data.summary.incomeCount)} />
                <SummaryMetric label="Refund transactions" value={String(data.summary.refundCount)} />
              </View>
            </CollapsibleDetails>
            <View style={[styles.largest, { borderTopColor: theme.hairline }]}>
              <Text style={[styles.largestLabel, { color: theme.secondaryText }]}>Largest expense</Text>
              {data.summary.largestExpense ? (
                <>
                  <Text style={[styles.largestAmount, { color: theme.expense }]}>
                    {formatCop(data.summary.largestExpense.amount)}
                  </Text>
                  <Text style={[styles.largestMeta, { color: theme.secondaryText }]}>
                    {data.summary.largestExpense.categoryName} · {data.summary.largestExpense.accountName} ·{' '}
                    {formatReportDate(data.summary.largestExpense.transactionDate)}
                  </Text>
                </>
              ) : (
                <Text style={[styles.largestMeta, { color: theme.secondaryText }]}>No posted expenses in this period.</Text>
              )}
            </View>
          </ReportSection>

          <ReportSection
            description={`One column per ${data.period.grouping === 'day' ? 'Bogotá-local day' : 'calendar month'}. Income rises above the line, expenses fall below it.`}
            title="Income vs expenses">
            <CashFlowChart buckets={data.cashFlow} />
          </ReportSection>

          {data.pace.length > 1 ? (
            <ReportSection
              description={`Running total of net expenses, against the same point of ${data.comparison.previousPeriod.label}.`}
              title="Spending pace">
              <PaceChart pace={data.pace} previousLabel="Previous period" />
            </ReportSection>
          ) : null}

          {budgets.length > 0 ? (
            <ReportSection
              description="Category budgets against what was actually spent. Spending is already net of refunds and excludes transfers."
              title="Budget vs actual">
              <BudgetPerformanceList budgets={budgets} monthCount={monthCount} />
            </ReportSection>
          ) : null}

          {data.weekdaySpending.length > 0 ? (
            <ReportSection
              description="Average net expenses per weekday, divided by how many of each weekday the period contained."
              title="Spending by weekday">
              <WeekdayChart weekdays={data.weekdaySpending} />
            </ReportSection>
          ) : null}

          <ReportSection
            description="All posted expenses ranked by stable category ID, including archived historical categories."
            title="Expenses by category">
            {data.categoryExpenses.length > 0 ? (
              <>
                <CategoryDonut categories={data.categoryExpenses} />
                <View style={styles.donutDivider} />
                <CategoryExpenseList categories={data.categoryExpenses} />
              </>
            ) : (
              <SectionEmpty text="No posted expenses to rank for this period." />
            )}
          </ReportSection>

          <ReportSection
            description={`Starts with net worth before ${formatReportDate(data.period.dateFrom)}, then applies posted history through each ${data.period.grouping === 'day' ? 'day' : 'month end'}.`}
            title="Net worth evolution">
            <NetWorthChart points={data.netWorth} />
          </ReportSection>

          {portfolio.investmentAccountCount > 0 ? (
            <ReportSection
              description="Current investment position (estimated) plus realized investment income for the period. Unrealized valuation changes raise net worth but are never counted as ordinary income."
              title="Investments">
              <View style={styles.summaryGrid}>
                <SummaryMetric
                  label="Current value"
                  value={portfolio.totalCurrentValueCopMinor === null ? 'Estimated — incomplete' : formatCop(portfolio.totalCurrentValueCopMinor)}
                />
                <SummaryMetric
                  label="Net contributions"
                  value={portfolio.netContributionsCopMinor === null ? '—' : formatCop(portfolio.netContributionsCopMinor)}
                />
                <SummaryMetric
                  label="Estimated gain/loss"
                  tone={portfolio.estimatedGainLossCopMinor === null ? undefined : portfolio.estimatedGainLossCopMinor >= 0 ? 'income' : 'expense'}
                  value={portfolio.estimatedGainLossCopMinor === null ? '—' : formatCop(portfolio.estimatedGainLossCopMinor)}
                />
                <SummaryMetric label="Simple estimated return" value={formatEstimatedReturn(portfolio.estimatedReturn)} />
                <SummaryMetric label="Investment income (period)" tone="income" value={formatCop(data.investments.incomeCopMinor)} />
                <SummaryMetric label="Income transactions" value={String(data.investments.incomeCount)} />
              </View>
            </ReportSection>
          ) : null}

          <ReportSection
            description={`Compared with ${data.comparison.previousPeriod.label}. Expense increases use a negative semantic indicator.`}
            title="Previous period comparison">
            <View style={styles.comparisons}>
              <ComparisonRow label="Income" metric={data.comparison.income} />
              <ComparisonRow label="Net expenses" metric={data.comparison.expenses} />
              <ComparisonRow label="Net result" metric={data.comparison.net} />
              <ComparisonRow label="Average expense" metric={data.comparison.averageExpense} />
              <ComparisonRow count label="Expense transactions" metric={data.comparison.expenseCount} />
            </View>
          </ReportSection>
        </View>
      ) : null}
    </ScrollView>
  );
}

function ReportsHeader({ onBack, topInset }: { onBack: () => void; topInset: number }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.header, { paddingTop: topInset }]}>
      <Pressable
        accessibilityLabel="Back from Reports"
        accessibilityRole="button"
        onPress={onBack}
        style={styles.headerButton}>
        <SymbolView
          name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
          size={24}
          tintColor={theme.primaryText}
        />
      </Pressable>
      <View style={styles.headerText}>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Reports</Text>
        <Text style={[styles.subtitle, { color: theme.secondaryText }]}>Persisted financial history</Text>
      </View>
      <View style={styles.headerButton} />
    </View>
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
  const positive = summary.net >= 0;
  const netColor = positive ? theme.income : theme.expense;

  return (
    <View style={styles.headline}>
      <View style={styles.headlineTop}>
        <View style={styles.headlineMain}>
          <Text style={[styles.headlineLabel, { color: theme.mutedText }]}>Net result</Text>
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.headlineValue, { color: netColor }]}>
            {positive ? '+' : '-'}{formatCop(Math.abs(summary.net))}
          </Text>
        </View>
        <DeltaChip metric={comparison.net} />
      </View>

      {summary.savingsRateBasisPoints === null ? (
        <Text style={[styles.headlineHint, { color: theme.mutedText }]}>
          No income this period, so a savings rate does not apply.
        </Text>
      ) : (
        <Text style={[styles.headlineHint, { color: theme.secondaryText }]}>
          You kept {formatPercentage(summary.savingsRateBasisPoints)} of what you earned.
        </Text>
      )}

      <View style={styles.headlineRow}>
        <SummaryMetric label="Income" tone="income" value={formatCop(summary.income)} />
        <SummaryMetric label="Net expenses" tone="expense" value={formatCop(summary.expenses)} />
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
          ? formatCop(Math.abs(metric.difference))
          : formatPercentage(Math.abs(metric.percentageChangeBasisPoints))}
      </Text>
    </View>
  );
}

function CollapsibleDetails({ children }: { children: React.ReactNode }) {
  const theme = useAppTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.details}>
      <Pressable
        accessibilityLabel={open ? 'Hide summary details' : 'Show summary details'}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        hitSlop={spacing.sm}
        onPress={() => setOpen((value) => !value)}
        style={styles.detailsToggle}>
        <Text style={[styles.detailsToggleLabel, { color: theme.primaryAction }]}>
          {open ? 'Hide details' : 'Show details'}
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
  const toneColor = metric.tone === 'positive'
    ? theme.income
    : metric.tone === 'negative'
      ? theme.expense
      : theme.secondaryText;
  const currentValue = count ? String(metric.current) : formatCop(metric.current);
  const differenceValue = count ? String(Math.abs(metric.difference)) : formatCop(Math.abs(metric.difference));
  let change = 'No change';
  if (!metric.hasPreviousData) {
    change = 'No previous-period data';
  } else if (metric.direction !== 'unchanged') {
    const percentage = metric.percentageChangeBasisPoints === null
      ? 'percentage unavailable'
      : `${formatPercentage(Math.abs(metric.percentageChangeBasisPoints))}`;
    change = `${metric.direction === 'increased' ? 'Increased' : 'Decreased'} by ${differenceValue} (${percentage})`;
  }
  return (
    <View accessibilityLabel={`${label}. Current ${currentValue}. ${change}.`} style={[styles.comparisonRow, { borderBottomColor: theme.hairline }]}>
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
  return (
    <View style={[styles.stateScreen, { backgroundColor: theme.appBackground }]}>
      <ReportsHeader onBack={onBack} topInset={insets.top} />
      <View accessibilityLabel="Loading reports" style={styles.skeletons}>
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
  return (
    <View style={[styles.stateScreen, { backgroundColor: theme.appBackground }]}>
      <ReportsHeader onBack={onBack} topInset={insets.top} />
      <View style={styles.errorState}>
        <Text accessibilityLiveRegion="assertive" style={[styles.errorTitle, { color: theme.primaryText }]}>Unable to load reports</Text>
        <Text style={[styles.errorDescription, { color: theme.secondaryText }]}>{message}</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={[styles.primaryRetry, { backgroundColor: theme.primaryAction }]}>
          <Text style={[styles.retryText, { color: theme.onPrimaryAction }]}>Try again</Text>
        </Pressable>
      </View>
    </View>
  );
}

function formatPercentage(basisPoints: number): string {
  return `${(basisPoints / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 72, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerText: { alignItems: 'center', flex: 1 },
  title: { ...typography.sectionTitle, fontSize: 24 },
  subtitle: { ...typography.label },
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
  retryButton: { justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.sm },
  retryText: { ...typography.caption, fontWeight: '700' },
  emptyNotice: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  emptyText: { flex: 1, gap: spacing.xs },
  emptyTitle: { ...typography.caption, fontWeight: '700' },
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
  comparisonLabel: { ...typography.caption, fontWeight: '700' },
  comparisonCurrent: { ...typography.caption, fontWeight: '700' },
  comparisonChange: { ...typography.label },
  stateScreen: { flex: 1 },
  skeletons: { gap: spacing.lg, padding: spacing.md },
  skeleton: { borderRadius: borderRadii.md, height: 150 },
  errorState: { alignItems: 'center', gap: spacing.md, padding: spacing.xl },
  errorTitle: { ...typography.sectionTitle, textAlign: 'center' },
  errorDescription: { ...typography.body, textAlign: 'center' },
  primaryRetry: { borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.lg },
});
