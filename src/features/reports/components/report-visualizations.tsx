import { useMemo, useState } from 'react';
import { StyleSheet, Text, View, type DimensionValue } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { AreaLineChart } from '@/components/charts/area-line-chart';
import { DivergingBarChart } from '@/components/charts/diverging-bar-chart';
import { DonutChart } from '@/components/charts/donut-chart';
import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, budgetSwatches, fonts, spacing, typography } from '@/constants/theme';
import { formatBase } from '@/features/accounts/account-format';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import type {
  BudgetPerformance,
  CashFlowBucket,
  CategoryExpenseSummary,
  NetWorthPoint,
  PacePoint,
  WeekdaySpending,
} from '../report.types';

/** Palette for category slices, reusing the budget swatches for one visual language. */
const sliceKeys = ['blue', 'teal', 'amber', 'coral', 'purple', 'indigo', 'pink', 'green'] as const;

/* -------------------------------------------------------------------------- */
/* Cash flow                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * Income against expenses over the period, one column per bucket.
 *
 * Selecting a column reveals its exact figures above the chart, which keeps the
 * detail available without printing a row for every single day.
 */
export function CashFlowChart({ buckets }: { buckets: CashFlowBucket[] }) {
  const theme = useAppTheme();
  const [selectedKey, setSelectedKey] = useState<string>();
  const selected = buckets.find((bucket) => bucket.key === selectedKey);
  const totals = useMemo(
    () => buckets.reduce(
      (result, bucket) => ({
        income: result.income + bucket.income,
        expenses: result.expenses + bucket.expenses,
      }),
      { income: 0, expenses: 0 },
    ),
    [buckets],
  );
  const shown = selected ?? { label: 'Whole period', income: totals.income, expenses: totals.expenses, net: totals.income - totals.expenses };

  return (
    <View style={styles.block}>
      <View style={styles.readout}>
        <Text style={[styles.readoutLabel, { color: theme.mutedText }]}>{shown.label}</Text>
        <View style={styles.readoutRow}>
          <ReadoutValue color={theme.income} label="Income" value={formatBase(shown.income)} />
          <ReadoutValue color={theme.expense} label="Expenses" value={formatBase(shown.expenses)} />
          <ReadoutValue
            color={shown.net >= 0 ? theme.income : theme.expense}
            label="Net"
            value={`${shown.net < 0 ? '-' : ''}${formatBase(Math.abs(shown.net))}`}
          />
        </View>
      </View>
      <DivergingBarChart
        accessibilityLabel={`Cash flow chart. Total income ${formatBase(totals.income)}. Total expenses ${formatBase(totals.expenses)}.`}
        buckets={buckets.map((bucket) => ({
          key: bucket.key,
          label: bucket.label,
          positive: bucket.income,
          negative: bucket.expenses,
        }))}
        negativeColor={theme.expense}
        onSelect={(key) => setSelectedKey((current) => (current === key ? undefined : key))}
        positiveColor={theme.income}
        selectedKey={selectedKey}
      />
      <Text style={[styles.hint, { color: theme.mutedText }]}>
        {selected ? 'Tap the column again to see the whole period.' : 'Tap a column for that day’s detail.'}
      </Text>
    </View>
  );
}

function ReadoutValue({ label, value, color }: { label: string; value: string; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.readoutValue}>
      <Text style={[styles.readoutValueLabel, { color: theme.mutedText }]}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.readoutValueAmount, { color }]}>{value}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Categories                                                                  */
/* -------------------------------------------------------------------------- */

/** Composition ring plus a tappable legend that highlights one slice at a time. */
export function CategoryDonut({ categories }: { categories: CategoryExpenseSummary[] }) {
  const theme = useAppTheme();
  const isDark = theme.appBackground === '#060E1E';
  const [selectedKey, setSelectedKey] = useState<string>();

  // Beyond eight slices the ring becomes unreadable, so the tail is grouped.
  const { slices, total } = useMemo(() => {
    const sum = categories.reduce((value, category) => value + category.total, 0);
    const top = categories.slice(0, sliceKeys.length - 1);
    const rest = categories.slice(sliceKeys.length - 1);
    const restTotal = rest.reduce((value, category) => value + category.total, 0);
    const entries = top.map((category, index) => ({
      key: category.categoryId,
      label: category.categoryName,
      value: category.total,
      color: budgetSwatches[sliceKeys[index]][isDark ? 'dark' : 'light'],
    }));
    if (restTotal > 0) {
      entries.push({
        key: '__other__',
        label: `Other (${rest.length})`,
        value: restTotal,
        color: budgetSwatches[sliceKeys[sliceKeys.length - 1]][isDark ? 'dark' : 'light'],
      });
    }
    return { slices: entries, total: sum };
  }, [categories, isDark]);

  const selected = slices.find((slice) => slice.key === selectedKey);

  return (
    <View style={styles.donutBlock}>
      <DonutChart
        accessibilityLabel={`Expenses by category. Total ${formatBase(total)}.`}
        centerLabel={selected ? selected.label : 'Total expenses'}
        centerValue={formatBase(selected ? selected.value : total)}
        selectedKey={selectedKey}
        slices={slices}
      />
      <View style={styles.legend}>
        {slices.map((slice) => (
          <PressableScale
            accessibilityLabel={`${slice.label}, ${formatBase(slice.value)}`}
            accessibilityRole="button"
            accessibilityState={{ selected: slice.key === selectedKey }}
            key={slice.key}
            onPress={() => setSelectedKey((current) => (current === slice.key ? undefined : slice.key))}
            style={styles.legendRow}>
            <View style={[styles.legendDot, { backgroundColor: slice.color }]} />
            <Text numberOfLines={1} style={[styles.legendLabel, { color: theme.secondaryText }]}>{slice.label}</Text>
            <Text style={[styles.legendValue, { color: theme.primaryText }]}>
              {total === 0 ? '0%' : `${Math.round((slice.value / total) * 100)}%`}
            </Text>
          </PressableScale>
        ))}
      </View>
    </View>
  );
}

export function CategoryExpenseList({ categories }: { categories: CategoryExpenseSummary[] }) {
  const theme = useAppTheme();
  const [expanded, setExpanded] = useState<readonly string[]>([]);
  const maximum = Math.max(0, ...categories.map((category) => category.total));

  function toggle(categoryId: string) {
    setExpanded((current) => current.includes(categoryId)
      ? current.filter((id) => id !== categoryId)
      : [...current, categoryId]);
  }

  return (
    <View accessibilityLabel="Expenses ranked by category" style={styles.categoryList}>
      {categories.map((category) => {
        const breakdown = category.subcategories;
        const isOpen = expanded.includes(category.categoryId);
        const summary = (
          <>
            <View style={[styles.categoryIcon, { backgroundColor: theme.elevatedSurface }]}>
              <SymbolView name={getCategoryIcon(category.icon)} size={20} tintColor={theme.expense} />
            </View>
            <View style={styles.categoryContent}>
              <View style={styles.categoryHeader}>
                <Text style={[styles.categoryName, { color: theme.primaryText }]}>{category.categoryName}</Text>
                <Text style={[styles.categoryAmount, { color: theme.primaryText }]}>{formatBase(category.total)}</Text>
              </View>
              <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
                <View style={[styles.fill, { backgroundColor: theme.expense, width: percentageWidth(category.total, maximum) }]} />
              </View>
              <Text style={[styles.categoryMeta, { color: theme.secondaryText }]}>
                {formatBasisPoints(category.percentageBasisPoints)} · {category.transactionCount}{' '}
                {category.transactionCount === 1 ? 'transaction' : 'transactions'}
                {breakdown.length > 0 ? ` · ${breakdown.length} in detail` : ''}
              </Text>
            </View>
            {breakdown.length > 0 ? (
              <SymbolView
                name={isOpen
                  ? { ios: 'chevron.up', android: 'expand_less', web: 'expand_less' }
                  : { ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                size={14}
                tintColor={theme.mutedText}
              />
            ) : null}
          </>
        );

        return (
          <View key={category.categoryId}>
            {breakdown.length > 0 ? (
              <PressableScale
                accessibilityHint={isOpen ? 'Hides the subcategory breakdown' : 'Shows the subcategory breakdown'}
                accessibilityLabel={`${category.categoryName}, ${formatBase(category.total)}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: isOpen }}
                onPress={() => toggle(category.categoryId)}
                style={[styles.categoryRow, { borderBottomColor: theme.hairline }]}>
                {summary}
              </PressableScale>
            ) : (
              <View style={[styles.categoryRow, { borderBottomColor: theme.hairline }]}>{summary}</View>
            )}

            {isOpen ? (
              <View style={styles.breakdown}>
                {breakdown.map((subcategory) => (
                  <View
                    // The unclassified bucket has no id of its own; the parent id
                    // keys it, and there is at most one per category.
                    key={subcategory.subcategoryId ?? `${category.categoryId}-none`}
                    style={styles.breakdownRow}>
                    <View style={styles.breakdownCopy}>
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.breakdownName,
                          { color: subcategory.subcategoryId ? theme.secondaryText : theme.mutedText },
                        ]}>
                        {subcategory.name}
                      </Text>
                      <Text style={[styles.breakdownAmount, { color: theme.secondaryText }]}>
                        {formatBase(subcategory.total)}
                      </Text>
                    </View>
                    <View style={[styles.breakdownTrack, { backgroundColor: theme.progressTrack }]}>
                      <View
                        style={[
                          styles.fill,
                          {
                            backgroundColor: subcategory.subcategoryId ? theme.expense : theme.mutedText,
                            width: percentageWidth(subcategory.total, category.total),
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownMeta, { color: theme.mutedText }]}>
                      {formatBasisPoints(subcategory.percentageBasisPoints)} of {category.categoryName} ·{' '}
                      {subcategory.transactionCount}{' '}
                      {subcategory.transactionCount === 1 ? 'transaction' : 'transactions'}
                    </Text>
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        );
      })}
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Net worth                                                                   */
/* -------------------------------------------------------------------------- */

export function NetWorthChart({ points }: { points: NetWorthPoint[] }) {
  const theme = useAppTheme();
  if (points.length === 0) {
    return <Text style={[styles.hint, { color: theme.secondaryText }]}>No net-worth history for this period.</Text>;
  }
  const values = points.map((point) => point.netWorth);
  const start = values[0];
  const end = values[values.length - 1];
  const change = end - start;
  const changeColor = change > 0 ? theme.income : change < 0 ? theme.expense : theme.mutedText;

  return (
    <View style={styles.block}>
      <View style={styles.netWorthHeader}>
        <View>
          <Text style={[styles.readoutValueLabel, { color: theme.mutedText }]}>Ending net worth</Text>
          <Text style={[styles.netWorthValue, { color: theme.primaryText }]}>{formatBase(end)}</Text>
        </View>
        <View style={[styles.deltaChip, { backgroundColor: theme.elevatedSurface }]}>
          <SymbolView
            name={change >= 0
              ? { ios: 'arrow.up.right', android: 'trending_up', web: 'trending_up' }
              : { ios: 'arrow.down.right', android: 'trending_down', web: 'trending_down' }}
            size={14}
            tintColor={changeColor}
          />
          <Text style={[styles.deltaText, { color: changeColor }]}>
            {change < 0 ? '-' : '+'}{formatBase(Math.abs(change))}
          </Text>
        </View>
      </View>
      <AreaLineChart
        accessibilityLabel={`Net worth evolution. Starts at ${formatBase(start)}, ends at ${formatBase(end)}.`}
        endLabel={points[points.length - 1].label}
        series={[{ key: 'net-worth', values, color: theme.primaryAction, fill: true }]}
        startLabel={points[0].label}
      />
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Behaviour insights                                                          */
/* -------------------------------------------------------------------------- */

/** Which days of the week the money actually leaves. */
export function WeekdayChart({ weekdays }: { weekdays: WeekdaySpending[] }) {
  const theme = useAppTheme();
  const peak = Math.max(0, ...weekdays.map((entry) => entry.average));
  const busiest = weekdays.reduce<WeekdaySpending | null>(
    (top, entry) => (top === null || entry.average > top.average ? entry : top),
    null,
  );

  return (
    <View style={styles.block}>
      <View style={styles.weekdayRow}>
        {weekdays.map((entry) => {
          const isBusiest = busiest !== null && entry.average === busiest.average && busiest.average > 0;
          return (
            <View
              accessibilityLabel={`${entry.label}, average ${formatBase(entry.average)} across ${entry.dayCount} days`}
              key={entry.weekday}
              style={styles.weekdayColumn}>
              <View style={styles.weekdayBarArea}>
                <View
                  style={[
                    styles.weekdayBar,
                    {
                      backgroundColor: isBusiest ? theme.expense : theme.progressTrack,
                      height: peak === 0 ? 2 : Math.max(2, Math.round((entry.average / peak) * 92)),
                    },
                  ]}
                />
              </View>
              <Text style={[styles.weekdayLabel, { color: isBusiest ? theme.primaryText : theme.mutedText }]}>
                {entry.label}
              </Text>
            </View>
          );
        })}
      </View>
      {busiest && busiest.average > 0 ? (
        <Text style={[styles.hint, { color: theme.secondaryText }]}>
          {busiest.label} is your heaviest day — {formatBase(busiest.average)} on average.
        </Text>
      ) : (
        <Text style={[styles.hint, { color: theme.secondaryText }]}>No expenses to compare across weekdays.</Text>
      )}
    </View>
  );
}

/** Cumulative spending against the same point of the previous period. */
export function PaceChart({ pace, previousLabel }: { pace: PacePoint[]; previousLabel: string }) {
  const theme = useAppTheme();
  const current = pace.map((point) => point.current ?? 0);
  const previous = pace.filter((point) => point.previous !== null).map((point) => point.previous as number);
  const spentSoFar = current[current.length - 1] ?? 0;
  const previousAtSamePoint = previous[Math.min(current.length, previous.length) - 1] ?? 0;
  const difference = spentSoFar - previousAtSamePoint;
  const ahead = difference > 0;
  const toneColor = ahead ? theme.expense : theme.income;

  return (
    <View style={styles.block}>
      <View style={styles.netWorthHeader}>
        <View>
          <Text style={[styles.readoutValueLabel, { color: theme.mutedText }]}>Spent so far</Text>
          <Text style={[styles.netWorthValue, { color: theme.primaryText }]}>{formatBase(spentSoFar)}</Text>
        </View>
        {previous.length > 0 ? (
          <View style={[styles.deltaChip, { backgroundColor: theme.elevatedSurface }]}>
            <Text style={[styles.deltaText, { color: toneColor }]}>
              {ahead ? '+' : '-'}{formatBase(Math.abs(difference))} vs last
            </Text>
          </View>
        ) : null}
      </View>
      <AreaLineChart
        accessibilityLabel={`Cumulative spending. ${formatBase(spentSoFar)} so far, against ${formatBase(previousAtSamePoint)} at the same point of ${previousLabel}.`}
        endLabel={pace[pace.length - 1]?.label}
        series={[
          ...(previous.length > 0
            ? [{ key: 'previous', values: previous, color: theme.mutedText, dashed: true }]
            : []),
          { key: 'current', values: current, color: theme.expense, fill: true },
        ]}
        startLabel={pace[0]?.label}
      />
      <View style={styles.legendInline}>
        <LegendKey color={theme.expense} label="This period" />
        {previous.length > 0 ? <LegendKey color={theme.mutedText} dashed label={previousLabel} /> : null}
      </View>
    </View>
  );
}

function LegendKey({ label, color, dashed = false }: { label: string; color: string; dashed?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.legendKey}>
      <View style={[styles.legendLine, { backgroundColor: color, opacity: dashed ? 0.6 : 1 }]} />
      <Text style={[styles.legendKeyLabel, { color: theme.secondaryText }]}>{label}</Text>
    </View>
  );
}

/* -------------------------------------------------------------------------- */
/* Budgets                                                                     */
/* -------------------------------------------------------------------------- */

export function BudgetPerformanceList({ budgets, monthCount }: { budgets: BudgetPerformance[]; monthCount: number }) {
  const theme = useAppTheme();
  return (
    <View style={styles.block}>
      {monthCount > 1 ? (
        <Text style={[styles.hint, { color: theme.mutedText }]}>
          Limits are the sum of {monthCount} monthly budgets; budgets are never prorated.
        </Text>
      ) : null}
      {budgets.map((budget) => {
        const color = budget.status === 'over'
          ? theme.destructive
          : budget.status === 'near'
            ? theme.warning
            : theme.progressFill;
        return (
          <View
            accessibilityLabel={`${budget.categoryName}, ${formatBase(budget.spent)} spent of ${formatBase(budget.limit)}, ${budget.percentageUsed}% used`}
            key={budget.categoryId}
            style={styles.budgetRow}>
            <View style={styles.budgetHeader}>
              <Text numberOfLines={1} style={[styles.budgetName, { color: theme.primaryText }]}>
                {budget.categoryName}
              </Text>
              <Text style={[styles.budgetPercent, { color }]}>{budget.percentageUsed}%</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
              <View style={[styles.fill, { backgroundColor: color, width: percentageWidth(Math.min(budget.spent, budget.limit), budget.limit) }]} />
            </View>
            <Text style={[styles.categoryMeta, { color: theme.secondaryText }]}>
              {formatBase(budget.spent)} of {formatBase(budget.limit)} ·{' '}
              {budget.remaining >= 0
                ? `${formatBase(budget.remaining)} remaining`
                : `${formatBase(Math.abs(budget.remaining))} over`}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function percentageWidth(value: number, maximum: number): DimensionValue {
  if (maximum <= 0 || value <= 0) return '0%';
  return `${Math.max(2, Math.min(100, (value / maximum) * 100))}%`;
}

function formatBasisPoints(value: number): string {
  return `${(value / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}%`;
}

const styles = StyleSheet.create({
  block: { gap: spacing.sm },
  hint: { ...typography.label, fontSize: 11, lineHeight: 15 },

  readout: { gap: spacing.xs },
  readoutLabel: { ...typography.overline },
  readoutRow: { flexDirection: 'row', gap: spacing.sm },
  readoutValue: { flex: 1, gap: 1, minWidth: 0 },
  readoutValueLabel: { ...typography.overline },
  readoutValueAmount: { fontFamily: fonts.mono.bold, fontSize: 14, lineHeight: 19 },

  donutBlock: { alignItems: 'center', gap: spacing.md },
  legend: { alignSelf: 'stretch', gap: 2 },
  legendRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 30 },
  legendDot: { borderRadius: 3, height: 10, width: 10 },
  legendLabel: { ...typography.caption, flex: 1, fontSize: 13 },
  legendValue: { fontFamily: fonts.mono.bold, fontSize: 12, lineHeight: 16 },
  legendInline: { flexDirection: 'row', gap: spacing.md },
  legendKey: { alignItems: 'center', flexDirection: 'row', gap: spacing.xs },
  legendLine: { borderRadius: 1, height: 2, width: 14 },
  legendKeyLabel: { ...typography.label, fontSize: 11 },

  categoryList: {},
  categoryRow: {
    alignItems: 'center',
    borderBottomWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 80,
    paddingVertical: spacing.sm,
  },
  categoryIcon: { alignItems: 'center', borderRadius: borderRadii.md, height: 40, justifyContent: 'center', width: 40 },
  categoryContent: { flex: 1, gap: spacing.xs },
  categoryHeader: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  categoryName: { ...typography.caption, flex: 1, fontWeight: '700' },
  categoryAmount: { ...typography.caption, fontWeight: '700' },
  categoryMeta: { ...typography.label },
  breakdown: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: 40 + spacing.sm,
    paddingTop: spacing.sm,
  },
  breakdownRow: { gap: spacing.xs },
  breakdownCopy: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  breakdownName: { ...typography.label, flex: 1 },
  breakdownAmount: { ...typography.label },
  breakdownTrack: { borderRadius: borderRadii.full, height: 4, overflow: 'hidden', width: '100%' },
  breakdownMeta: { ...typography.label, fontSize: 11 },
  track: { borderRadius: borderRadii.full, height: 8, overflow: 'hidden', width: '100%' },
  fill: { borderRadius: borderRadii.full, height: '100%' },

  netWorthHeader: { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'space-between' },
  netWorthValue: { fontFamily: fonts.mono.bold, fontSize: 20, lineHeight: 26 },
  deltaChip: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  deltaText: { fontFamily: fonts.mono.bold, fontSize: 12, lineHeight: 16 },

  weekdayRow: { alignItems: 'flex-end', flexDirection: 'row', gap: spacing.xs },
  weekdayColumn: { alignItems: 'center', flex: 1, gap: spacing.xs },
  weekdayBarArea: { height: 96, justifyContent: 'flex-end' },
  weekdayBar: { borderRadius: 3, width: 18 },
  weekdayLabel: { ...typography.label, fontSize: 10 },

  budgetRow: { gap: spacing.xs, paddingVertical: spacing.xs },
  budgetHeader: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  budgetName: { ...typography.caption, flex: 1, fontWeight: '700' },
  budgetPercent: { fontFamily: fonts.mono.bold, fontSize: 12, lineHeight: 16 },
});
