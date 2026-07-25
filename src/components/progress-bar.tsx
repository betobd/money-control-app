import { StyleSheet, View, type ViewProps, type ViewStyle } from 'react-native';

import { borderRadii } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type ProgressBarProps = ViewProps & {
  /** Progress in the range 0..1 (values above 1 are clamped for the fill width). */
  value: number;
  color: string;
  trackColor?: string;
  height?: number;
  style?: ViewStyle | ViewStyle[];
};

export function ProgressBar({ value, color, trackColor, height = 6, style, ...rest }: ProgressBarProps) {
  const theme = useAppTheme();
  const clamped = Math.max(0, Math.min(value, 1));

  return (
    <View
      style={[styles.track, { backgroundColor: trackColor ?? theme.progressTrack, height, borderRadius: borderRadii.full }, style]}
      {...rest}>
      <View style={[styles.fill, { backgroundColor: color, width: `${clamped * 100}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    overflow: 'hidden',
    width: '100%',
  },
  fill: {
    borderRadius: borderRadii.full,
    height: '100%',
  },
});
