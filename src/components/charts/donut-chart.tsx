import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Svg, { G, Path } from 'react-native-svg';

import { arcPath, donutSegments } from '@/components/charts/chart-math';
import { fonts, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type DonutSlice = {
  key: string;
  label: string;
  value: number;
  color: string;
};

type DonutChartProps = {
  slices: DonutSlice[];
  size?: number;
  thickness?: number;
  /** Large value rendered in the hole, e.g. the formatted total. */
  centerValue?: string;
  centerLabel?: string;
  selectedKey?: string;
  accessibilityLabel?: string;
};

/**
 * Composition ring for category spending.
 *
 * Answers "where did the money go" in one glance, which a ranked list only
 * answers after reading every row. Pair it with the list for exact figures —
 * the ring shows proportion, the list shows detail.
 */
export function DonutChart({
  slices,
  size = 168,
  thickness = 26,
  centerValue,
  centerLabel,
  selectedKey,
  accessibilityLabel,
}: DonutChartProps) {
  const theme = useAppTheme();
  const segments = useMemo(
    () => donutSegments(slices.map((slice) => ({ key: slice.key, value: slice.value }))),
    [slices],
  );
  const colorByKey = useMemo(
    () => new Map(slices.map((slice) => [slice.key, slice.color])),
    [slices],
  );

  const center = size / 2;
  const outerRadius = center;
  const innerRadius = center - thickness;

  return (
    <View accessibilityLabel={accessibilityLabel} accessible style={[styles.wrapper, { height: size, width: size }]}>
      <Svg height={size} width={size}>
        <G>
          {segments.length === 0 ? (
            <Path
              d={arcPath(center, center, outerRadius, innerRadius, -90, 269.999)}
              fill={theme.progressTrack}
            />
          ) : (
            segments.map((segment) => (
              <Path
                d={arcPath(center, center, outerRadius, innerRadius, segment.startAngle, segment.endAngle)}
                fill={colorByKey.get(segment.key) ?? theme.progressTrack}
                key={segment.key}
                opacity={!selectedKey || selectedKey === segment.key ? 1 : 0.35}
              />
            ))
          )}
        </G>
      </Svg>
      {centerValue ? (
        <View style={styles.center} pointerEvents="none">
          <Text adjustsFontSizeToFit numberOfLines={1} style={[styles.centerValue, { color: theme.primaryText }]}>
            {centerValue}
          </Text>
          {centerLabel ? (
            <Text numberOfLines={1} style={[styles.centerLabel, { color: theme.mutedText }]}>
              {centerLabel}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 2, paddingHorizontal: spacing.lg, position: 'absolute' },
  centerValue: { fontFamily: fonts.mono.bold, fontSize: 17, lineHeight: 22 },
  centerLabel: { ...typography.overline },
});
