import { useState } from 'react';
import { StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import Svg, { Circle, Defs, G, LinearGradient, Line, Path, Stop } from 'react-native-svg';

import { areaPath, projectSeries, smoothLinePath, type ChartBox } from '@/components/charts/chart-math';
import { fonts, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type LineSeries = {
  key: string;
  values: number[];
  color: string;
  /** Fills the area under the line with a fading gradient. */
  fill?: boolean;
  dashed?: boolean;
};

type AreaLineChartProps = {
  series: LineSeries[];
  height?: number;
  /** Labels for the first and last points, drawn under the plot. */
  startLabel?: string;
  endLabel?: string;
  /** Draws a horizontal reference line at this value (e.g. zero, or a budget). */
  referenceValue?: number;
  accessibilityLabel?: string;
};

const PADDING = 10;

/**
 * Line chart with optional gradient fill, for the net-worth timeline and the
 * cumulative-spending pace comparison.
 *
 * Replaces a polyline faked from rotated 2px Views, which could not fill, curve,
 * or mark extremes. All series share one value axis so two lines are directly
 * comparable.
 */
export function AreaLineChart({
  series,
  height = 168,
  startLabel,
  endLabel,
  referenceValue,
  accessibilityLabel,
}: AreaLineChartProps) {
  const theme = useAppTheme();
  const [width, setWidth] = useState(0);

  function onLayout(event: LayoutChangeEvent) {
    setWidth(event.nativeEvent.layout.width);
  }

  const all = series.flatMap((entry) => entry.values);
  const hasData = all.length > 0;
  // A shared axis keeps series comparable; the reference line must stay in frame.
  const rawMin = hasData ? Math.min(...all, referenceValue ?? Infinity) : 0;
  const rawMax = hasData ? Math.max(...all, referenceValue ?? -Infinity) : 0;
  const min = Math.min(rawMin, rawMax);
  const max = Math.max(rawMin, rawMax);
  const box: ChartBox = { width, height, padding: PADDING };

  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={styles.wrapper}>
      <View onLayout={onLayout} style={[styles.plot, { backgroundColor: theme.elevatedSurface, height }]}>
        {width > 0 && hasData ? (
          <Svg height={height} width={width}>
            <Defs>
              {series.filter((entry) => entry.fill).map((entry) => (
                <LinearGradient id={`fill-${entry.key}`} key={entry.key} x1="0" x2="0" y1="0" y2="1">
                  <Stop offset="0" stopColor={entry.color} stopOpacity="0.32" />
                  <Stop offset="1" stopColor={entry.color} stopOpacity="0.02" />
                </LinearGradient>
              ))}
            </Defs>

            {referenceValue !== undefined ? (
              <Line
                stroke={theme.border}
                strokeDasharray="4 4"
                strokeWidth={1}
                x1={PADDING}
                x2={width - PADDING}
                y1={projectSeries([referenceValue], box, min, max)[0].y}
                y2={projectSeries([referenceValue], box, min, max)[0].y}
              />
            ) : null}

            {series.map((entry) => {
              const points = projectSeries(entry.values, box, min, max);
              const last = points[points.length - 1];
              return (
                <G key={entry.key}>
                  {entry.fill ? (
                    <Path d={areaPath(points, height - PADDING)} fill={`url(#fill-${entry.key})`} />
                  ) : null}
                  <Path
                    d={smoothLinePath(points)}
                    fill="none"
                    stroke={entry.color}
                    strokeDasharray={entry.dashed ? '5 5' : undefined}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                  />
                  {last ? (
                    <Circle cx={last.x} cy={last.y} fill={theme.surface} r={5} stroke={entry.color} strokeWidth={2} />
                  ) : null}
                </G>
              );
            })}
          </Svg>
        ) : null}
      </View>
      {startLabel || endLabel ? (
        <View style={styles.axis}>
          <Text style={[styles.axisLabel, { color: theme.mutedText }]}>{startLabel ?? ''}</Text>
          <Text style={[styles.axisLabel, { color: theme.mutedText }]}>{endLabel ?? ''}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { gap: spacing.xs },
  plot: { borderRadius: 12, overflow: 'hidden', width: '100%' },
  axis: { flexDirection: 'row', justifyContent: 'space-between' },
  axisLabel: { fontFamily: fonts.mono.medium, fontSize: 10, lineHeight: 14 },
});
