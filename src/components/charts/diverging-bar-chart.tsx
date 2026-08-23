import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, fonts, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type DivergingBucket = {
  key: string;
  /** Short axis label, e.g. `Aug 3` or `Aug 2026`. */
  label: string;
  /** Non-negative magnitude drawn above the baseline. */
  positive: number;
  /** Non-negative magnitude drawn below the baseline. */
  negative: number;
};

type DivergingBarChartProps = {
  buckets: DivergingBucket[];
  positiveColor: string;
  negativeColor: string;
  selectedKey?: string;
  onSelect?: (key: string) => void;
  /** Combined height of both halves. */
  height?: number;
  accessibilityLabel?: string;
};

const MAX_BAR_WIDTH = 22;
const MIN_BAR_WIDTH = 3;

/**
 * Two-sided bar chart: one column per bucket, positives above a shared baseline
 * and negatives below.
 *
 * This replaces a stacked list of one row per bucket, which made a 31-day period
 * ~2,400px tall and mostly empty. Here a full month is one glance, and periods
 * with no activity read as a flat baseline instead of pages of zeros.
 *
 * Bars are plain Views rather than SVG so each column is natively tappable.
 */
export function DivergingBarChart({
  buckets,
  positiveColor,
  negativeColor,
  selectedKey,
  onSelect,
  height = 148,
  accessibilityLabel,
}: DivergingBarChartProps) {
  const theme = useAppTheme();
  const half = height / 2;

  const scale = useMemo(() => {
    const peak = buckets.reduce((max, bucket) => Math.max(max, bucket.positive, bucket.negative), 0);
    return peak === 0 ? 0 : half / peak;
  }, [buckets, half]);

  // Wide bars for a handful of monthly buckets, hairlines for a full month of days.
  const barWidth = Math.max(MIN_BAR_WIDTH, Math.min(MAX_BAR_WIDTH, Math.floor(280 / Math.max(buckets.length, 1))));

  if (buckets.length === 0) return null;

  return (
    <View accessibilityLabel={accessibilityLabel} accessible={!onSelect} style={styles.wrapper}>
      <View style={[styles.plot, { height }]}>
        <View style={[styles.baseline, { backgroundColor: theme.border, top: half }]} />
        {buckets.map((bucket) => {
          const selected = bucket.key === selectedKey;
          const positiveHeight = Math.min(half, Math.round(bucket.positive * scale));
          const negativeHeight = Math.min(half, Math.round(bucket.negative * scale));
          const empty = positiveHeight === 0 && negativeHeight === 0;
          return (
            <Pressable
              accessibilityLabel={`${bucket.label}`}
              accessibilityRole={onSelect ? 'button' : undefined}
              accessibilityState={{ selected }}
              disabled={!onSelect}
              key={bucket.key}
              onPress={() => onSelect?.(bucket.key)}
              style={styles.column}>
              {selected ? (
                <View style={[styles.selection, { backgroundColor: theme.elevatedSurface }]} />
              ) : null}
              <View style={[styles.halfTop, { height: half }]}>
                <View
                  style={[
                    styles.bar,
                    styles.barTop,
                    {
                      backgroundColor: positiveColor,
                      height: positiveHeight,
                      opacity: selected || !selectedKey ? 1 : 0.45,
                      width: barWidth,
                    },
                  ]}
                />
              </View>
              <View style={[styles.halfBottom, { height: half }]}>
                <View
                  style={[
                    styles.bar,
                    styles.barBottom,
                    {
                      backgroundColor: negativeColor,
                      height: negativeHeight,
                      opacity: selected || !selectedKey ? 1 : 0.45,
                      width: barWidth,
                    },
                  ]}
                />
              </View>
              {empty ? (
                <View style={[styles.emptyDot, { backgroundColor: theme.border, top: half - 1 }]} />
              ) : null}
            </Pressable>
          );
        })}
      </View>
      <View style={styles.axis}>
        <Text style={[styles.axisLabel, { color: theme.mutedText }]}>{buckets[0].label}</Text>
        {buckets.length > 1 ? (
          <Text style={[styles.axisLabel, { color: theme.mutedText }]}>{buckets[buckets.length - 1].label}</Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  plot: { flexDirection: 'row', width: '100%' },
  baseline: { height: StyleSheet.hairlineWidth, left: 0, position: 'absolute', right: 0 },
  column: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  selection: { borderRadius: borderRadii.xs, bottom: 0, left: 1, position: 'absolute', right: 1, top: 0 },
  halfTop: { justifyContent: 'flex-end' },
  halfBottom: { justifyContent: 'flex-start' },
  bar: { minHeight: 0 },
  barTop: { borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  barBottom: { borderBottomLeftRadius: 2, borderBottomRightRadius: 2 },
  emptyDot: { borderRadius: 1, height: 2, position: 'absolute', width: 2 },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontFamily: fonts.mono.medium, fontSize: 10, lineHeight: 14 },
});
