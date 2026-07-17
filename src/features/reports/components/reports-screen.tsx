import { SymbolView } from 'expo-symbols';
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

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import { formatReportDate } from '../report-period';
import type { ComparisonMetric, ReportPeriodSelection } from '../report.types';
import { useReports } from '../use-reports';
import { ReportPeriodSelector } from './report-period-selector';
import { CashFlowBars, CategoryExpenseList, NetWorthLineChart } from './report-visualizations';
import { useAppTheme } from '@/hooks/use-app-theme';

export function ReportsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [selection, setSelection] = useState<ReportPeriodSelection>({ preset: 'current-month' });
  const reports = useReports(selection);
  const data = reports.data;

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
        <View style={[styles.inlineError, { backgroundColor: theme.surface, borderColor: theme.destructive }]}>
          <Text accessibilityLiveRegion="assertive" style={[styles.errorText, { color: theme.destructive }]}>
            {reports.error}
          </Text>
          <Pressable accessibilityRole="button" onPress={reports.reload} style={styles.retryButton}>
            <Text style={[styles.retryText, { color: theme.primaryAction }]}>Retry</Text>
          </Pressable>
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
            <View style={styles.summaryGrid}>
              <SummaryMetric label="Income" tone="income" value={formatCop(data.summary.income)} />
              <SummaryMetric label="Expenses" tone="expense" value={formatCop(data.summary.expenses)} />
              <SummaryMetric label="Net result" tone={data.summary.net >= 0 ? 'income' : 'expense'} value={formatCop(data.summary.net)} />
              <SummaryMetric label="Average expense" value={formatCop(data.summary.averageExpense)} />
              <SummaryMetric label="Expense transactions" value={String(data.summary.expenseCount)} />
              <SummaryMetric label="Income transactions" value={String(data.summary.incomeCount)} />
            </View>
            <View style={[styles.largest, { borderTopColor: theme.border }]}>
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
            description={`Grouped by ${data.period.grouping === 'day' ? 'Bogotá-local day' : 'calendar month'}; missing buckets are shown as zero.`}
            title="Income vs expenses">
            <CashFlowBars buckets={data.cashFlow} />
          </ReportSection>

          <ReportSection
            description="All posted expenses ranked by stable category ID, including archived historical categories."
            title="Expenses by category">
            {data.categoryExpenses.length > 0 ? (
              <CategoryExpenseList categories={data.categoryExpenses} />
            ) : (
              <SectionEmpty text="No posted expenses to rank for this period." />
            )}
          </ReportSection>

          <ReportSection
            description={`Starts with net worth before ${formatReportDate(data.period.dateFrom)}, then applies posted history through each ${data.period.grouping === 'day' ? 'day' : 'month end'}.`}
            title="Net worth evolution">
            <NetWorthLineChart points={data.netWorth} />
          </ReportSection>

          <ReportSection
            description={`Compared with ${data.comparison.previousPeriod.label}. Expense increases use a negative semantic indicator.`}
            title="Previous period comparison">
            <View style={styles.comparisons}>
              <ComparisonRow label="Income" metric={data.comparison.income} />
              <ComparisonRow label="Expenses" metric={data.comparison.expenses} />
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
      <View style={[styles.sectionBody, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {children}
      </View>
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
  tone?: 'income' | 'expense';
}) {
  const theme = useAppTheme();
  const valueColor = tone === 'income' ? theme.income : tone === 'expense' ? theme.expense : theme.primaryText;
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
    <View accessibilityLabel={`${label}. Current ${currentValue}. ${change}.`} style={[styles.comparisonRow, { borderBottomColor: theme.border }]}>
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
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
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
  sectionBody: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, padding: spacing.md },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.lg },
  metric: { gap: spacing.xs, minWidth: '50%', paddingRight: spacing.sm, width: '50%' },
  metricLabel: { ...typography.label },
  metricValue: { ...typography.money },
  largest: { borderTopWidth: borderWidths.thin, gap: spacing.xs, marginTop: spacing.lg, paddingTop: spacing.md },
  largestLabel: { ...typography.label },
  largestAmount: { ...typography.money },
  largestMeta: { ...typography.caption },
  sectionEmpty: { ...typography.caption, paddingVertical: spacing.lg, textAlign: 'center' },
  comparisons: {},
  comparisonRow: { borderBottomWidth: borderWidths.thin, gap: spacing.xs, minHeight: 72, paddingVertical: spacing.sm },
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
