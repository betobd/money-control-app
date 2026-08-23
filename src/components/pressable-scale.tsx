import type { ReactNode } from 'react';
import { Pressable, type PressableProps, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
  Easing,
} from 'react-native-reanimated';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

const PRESS_IN_MS = 90;
const PRESS_OUT_MS = 160;

type PressableScaleProps = Omit<PressableProps, 'style'> & {
  children?: ReactNode;
  /** Scale applied while pressed. Lower = more pronounced. */
  activeScale?: number;
  /** Opacity applied while pressed. */
  activeOpacity?: number;
  style?: StyleProp<ViewStyle>;
};

/**
 * Pressable with a physical press response (scale + dim) driven on the UI thread.
 *
 * Every tappable card/row should use this instead of a bare Pressable so touch
 * feedback is consistent app-wide. It honours the OS "reduce motion" setting by
 * falling back to an opacity-only response.
 */
export function PressableScale({
  children,
  activeScale = 0.97,
  activeOpacity = 0.9,
  style,
  onPressIn,
  onPressOut,
  disabled,
  ...rest
}: PressableScaleProps) {
  const progress = useSharedValue(0);
  const reducedMotion = useReducedMotion();

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - progress.value * (1 - activeOpacity),
    transform: [{ scale: reducedMotion ? 1 : 1 - progress.value * (1 - activeScale) }],
  }));

  return (
    <AnimatedPressable
      disabled={disabled}
      onPressIn={(event) => {
        progress.value = withTiming(1, { duration: PRESS_IN_MS, easing: Easing.out(Easing.quad) });
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        progress.value = withTiming(0, { duration: PRESS_OUT_MS, easing: Easing.out(Easing.quad) });
        onPressOut?.(event);
      }}
      style={[style, animatedStyle, disabled ? { opacity: 0.5 } : null]}
      {...rest}>
      {children}
    </AnimatedPressable>
  );
}
