import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View, type DimensionValue, type LayoutChangeEvent } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop } from '@/features/accounts/account-format';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { CashFlowBucket, CategoryExpenseSummary, NetWorthPoint } from '../report.types';

export function CashFlowBars({ buckets }: { buckets: CashFlowBucket[] }) {
  const theme = useAppTheme();
  const maximum = Math.max(0, ...buckets.flatMap((bucket) => [bucket.income, bucket.expenses]));
  const totals = buckets.reduce(
    (result, bucket) => ({ income: result.income + bucket.income, expenses: result.expenses + bucket.expenses }),
    { income: 0, expenses: 0 },
  );
  return (
    <View
      accessibilityLabel={`Cash flow chart. Total income ${formatCop(totals.income)}. Total expenses ${formatCop(totals.expenses)}.`}
      accessible
      style={styles.chartList}>
      {buckets.map((bucket) => (
        <View key={bucket.key} style={styles.bucket}>
          <Text style={[styles.bucketLabel, { color: theme.secondaryText }]}>{bucket.label}</Text>
          <Bar label="Income" value={bucket.income} maximum={maximum} color={theme.income} />
          <Bar label="Expenses" value={bucket.expenses} maximum={maximum} color={theme.expense} />
          <Text style={[styles.netLabel, { color: bucket.net >= 0 ? theme.income : theme.expense }]}>
            Net {formatCop(bucket.net)}
          </Text>
        </View>
      ))}
    </View>
  );
}

export function CategoryExpenseList({ categories }: { categories: CategoryExpenseSummary[] }) {
  const theme = useAppTheme();
  const maximum = Math.max(0, ...categories.map((category) => category.total));
  return (
    <View accessibilityLabel="Expenses ranked by category" style={styles.categoryList}>
      {categories.map((category) => (
        <View key={category.categoryId} style={[styles.categoryRow, { borderBottomColor: theme.border }]}>
          <View style={[styles.categoryIcon, { backgroundColor: theme.elevatedSurface }]}>
            <SymbolView name={getCategoryIcon(category.icon)} size={20} tintColor={theme.expense} />
          </View>
          <View style={styles.categoryContent}>
            <View style={styles.categoryHeader}>
              <Text style={[styles.categoryName, { color: theme.primaryText }]}>{category.categoryName}</Text>
              <Text style={[styles.categoryAmount, { color: theme.primaryText }]}>{formatCop(category.total)}</Text>
            </View>
            <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
              <View style={[
                styles.fill,
                {
                  backgroundColor: theme.expense,
                  width: percentageWidth(category.total, maximum),
                },
              ]} />
            </View>
            <Text style={[styles.categoryMeta, { color: theme.secondaryText }]}>
              {formatBasisPoints(category.percentageBasisPoints)} · {category.transactionCount}{' '}
              {category.transactionCount === 1 ? 'transaction' : 'transactions'}
            </Text>
          </View>
        </View>
      ))}
    </View>
  );
}

export function NetWorthLineChart({ points }: { points: NetWorthPoint[] }) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);
  const values = points.map((point) => point.netWorth);
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const ending = points.at(-1)?.netWorth ?? 0;
  const coordinates = chartCoordinates(points, width, minimum, maximum);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  return (
    <View
      accessibilityLabel={`Net worth evolution chart. Starts at ${formatCop(points[0]?.netWorth ?? 0)}, ends at ${formatCop(ending)}, minimum ${formatCop(minimum)}, maximum ${formatCop(maximum)}.`}
      accessible>
      <View onLayout={onLayout} style={[styles.lineChart, { backgroundColor: theme.elevatedSurface }]}>
        {coordinates.slice(1).map((point, index) => {
          const previous = coordinates[index];
          const dx = point.x - previous.x;
          const dy = point.y - previous.y;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          return (
            <View
              key={`line-${points[index + 1].key}`}
              style={[
                styles.lineSegment,
                {
                  backgroundColor: theme.primaryAction,
                  left: (previous.x + point.x) / 2 - length / 2,
                  top: (previous.y + point.y) / 2 - 1,
                  transform: [{ rotate: `${angle}deg` }],
                  width: length,
                },
              ]}
            />
          );
        })}
        {coordinates.map((point, index) => (
          <View
            key={`point-${points[index].key}`}
            style={[
              styles.dot,
              {
                backgroundColor: theme.surface,
                borderColor: theme.primaryAction,
                left: point.x - 4,
                top: point.y - 4,
              },
            ]}
          />
        ))}
      </View>
      <View style={styles.axisLabels}>
        {axisLabelPoints(points).map((point) => (
          <Text key={point.key} style={[styles.axisLabel, { color: theme.secondaryText }]}>{point.label}</Text>
        ))}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pointSummary}>
        {points.map((point) => (
          <View key={point.key} style={[styles.pointCard, { borderColor: theme.border }]}>
            <Text style={[styles.pointLabel, { color: theme.secondaryText }]}>{point.label}</Text>
            <Text style={[styles.pointValue, { color: theme.primaryText }]}>{formatCop(point.netWorth)}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Bar({
  label,
  value,
  maximum,
  color,
}: {
  label: string;
  value: number;
  maximum: number;
  color: string;
}) {
  const theme = useAppTheme();
  return (
    <View accessibilityLabel={`${label}, ${formatCop(value)}`} style={styles.barRow}>
      <Text style={[styles.barLabel, { color: theme.secondaryText }]}>{label}</Text>
      <View style={[styles.track, { backgroundColor: theme.progressTrack }]}>
        <View style={[styles.fill, { backgroundColor: color, width: percentageWidth(value, maximum) }]} />
      </View>
      <Text style={[styles.barValue, { color: theme.primaryText }]}>{formatCop(value)}</Text>
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

function chartCoordinates(
  points: NetWorthPoint[],
  width: number,
  minimum: number,
  maximum: number,
): { x: number; y: number }[] {
  const horizontalPadding = 10;
  const verticalPadding = 14;
  const plotWidth = Math.max(0, width - horizontalPadding * 2);
  const plotHeight = 152 - verticalPadding * 2;
  const range = maximum - minimum;
  return points.map((point, index) => ({
    x: horizontalPadding + (points.length <= 1 ? plotWidth / 2 : plotWidth * index / (points.length - 1)),
    y: verticalPadding + (range === 0 ? plotHeight / 2 : plotHeight * (maximum - point.netWorth) / range),
  }));
}

function axisLabelPoints(points: NetWorthPoint[]): NetWorthPoint[] {
  if (points.length <= 2) return points;
  return [points[0], points[Math.floor((points.length - 1) / 2)], points[points.length - 1]];
}

const styles = StyleSheet.create({
  chartList: { gap: spacing.md },
  bucket: { gap: spacing.xs },
  bucketLabel: { ...typography.label },
  barRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm },
  barLabel: { ...typography.label, width: 58 },
  track: { borderRadius: borderRadii.full, flex: 1, height: 8, overflow: 'hidden' },
  fill: { borderRadius: borderRadii.full, height: '100%' },
  barValue: { ...typography.label, minWidth: 84, textAlign: 'right' },
  netLabel: { ...typography.label, textAlign: 'right' },
  categoryList: {},
  categoryRow: {
    alignItems: 'center',
    borderBottomWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 80,
    paddingVertical: spacing.sm,
  },
  categoryIcon: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  categoryContent: { flex: 1, gap: spacing.xs },
  categoryHeader: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'space-between' },
  categoryName: { ...typography.caption, flex: 1, fontWeight: '700' },
  categoryAmount: { ...typography.caption, fontWeight: '700' },
  categoryMeta: { ...typography.label },
  lineChart: { borderRadius: borderRadii.md, height: 152, overflow: 'hidden', position: 'relative' },
  lineSegment: { height: 2, position: 'absolute' },
  dot: { borderRadius: 4, borderWidth: 2, height: 8, position: 'absolute', width: 8 },
  axisLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.xs },
  axisLabel: { ...typography.label },
  pointSummary: { marginTop: spacing.md },
  pointCard: {
    borderLeftWidth: borderWidths.thin,
    gap: 2,
    minWidth: 108,
    paddingHorizontal: spacing.sm,
  },
  pointLabel: { ...typography.label },
  pointValue: { ...typography.caption, fontWeight: '700' },
});
