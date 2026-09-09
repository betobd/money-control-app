import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type Segment<T extends string> = {
  value: T;
  label: string;
  /** Optional count shown as a pill after the label. `0` is rendered too. */
  badge?: number;
};

type SegmentedControlProps<T extends string> = {
  accessibilityLabel: string;
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
};

/**
 * Equal-width tonal switch for splitting one screen into a few sections.
 *
 * Replaces stacking every section in one long scroll: the sections stay
 * reachable in one tap instead of a scroll of unknown length. Use it only when
 * the sections are genuinely alternatives — content the user reads *together*
 * belongs on the same segment.
 */
export function SegmentedControl<T extends string>({
  accessibilityLabel,
  segments,
  value,
  onChange,
}: SegmentedControlProps<T>) {
  const theme = useAppTheme();
  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radiogroup"
      style={[styles.track, { backgroundColor: theme.elevatedSurface }]}>
      {segments.map((segment) => {
        const selected = segment.value === value;
        return (
          <Pressable
            accessibilityLabel={segment.badge === undefined ? segment.label : `${segment.label}, ${segment.badge}`}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            key={segment.value}
            onPress={() => onChange(segment.value)}
            style={[styles.segment, selected && { backgroundColor: theme.tintPrimary }]}>
            <Text
              numberOfLines={1}
              style={[styles.label, { color: selected ? theme.primaryAction : theme.secondaryText }]}>
              {segment.label}
            </Text>
            {segment.badge === undefined ? null : (
              <View
                style={[
                  styles.badge,
                  { backgroundColor: selected ? theme.primaryAction : theme.surface },
                ]}>
                <Text style={[styles.badgeLabel, { color: selected ? theme.onPrimaryAction : theme.mutedText }]}>
                  {segment.badge}
                </Text>
              </View>
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: { borderRadius: borderRadii.full, flexDirection: 'row', gap: spacing.xs, padding: spacing.xs },
  segment: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  label: { ...typography.caption, flexShrink: 1, fontWeight: '700' },
  badge: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minWidth: 22, paddingHorizontal: spacing.xs },
  badgeLabel: { ...typography.label, fontWeight: '700' },
});
