import { useEffect } from 'react';
import { type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useAppTheme } from '@/hooks/use-app-theme';

const PULSE_MS = 850;

/**
 * Pulsing placeholder block for loading states.
 *
 * Drop-in replacement for a plain `View` filled with `disabledSurface`: the
 * pulse tells the user the screen is working rather than stuck. Falls back to a
 * static block when the OS asks to reduce motion.
 *
 * The caller supplies size and radius through `style`; wrap a group of these in
 * a container carrying `accessibilityRole="progressbar"` so screen readers
 * announce the load once instead of once per block.
 */
export function Skeleton({ style }: { style?: StyleProp<ViewStyle> }) {
  const theme = useAppTheme();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (reducedMotion) return;
    progress.value = withRepeat(
      withTiming(1, { duration: PULSE_MS, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [progress, reducedMotion]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: 0.45 + progress.value * 0.55 }));

  return <Animated.View style={[{ backgroundColor: theme.disabledSurface }, style, animatedStyle]} />;
}
