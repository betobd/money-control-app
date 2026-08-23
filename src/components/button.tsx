import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, StyleSheet, Text, type StyleProp, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, fonts, spacing } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type ButtonVariant = 'primary' | 'tonal' | 'secondary' | 'ghost' | 'destructive';
export type ButtonSize = 'sm' | 'md' | 'lg';

/**
 * Visual metrics per size. Heights are deliberately below the 44px minimum touch
 * target — `hitSlop` restores the accessible area without inflating the shape,
 * which is what made the previous hand-rolled 48–56px pills look heavy.
 */
const sizes = {
  sm: { height: 32, fontSize: 13, paddingHorizontal: spacing.sm + spacing.xs, iconSize: 15, gap: spacing.xs + 2 },
  md: { height: 38, fontSize: 14, paddingHorizontal: spacing.md, iconSize: 17, gap: spacing.sm - 2 },
  lg: { height: 46, fontSize: 15, paddingHorizontal: spacing.lg - spacing.xs, iconSize: 19, gap: spacing.sm },
} as const;

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: SymbolViewProps['name'];
  disabled?: boolean;
  /** Replaces the label with a spinner and blocks presses. */
  busy?: boolean;
  /** Stretches to fill the row (for stacked, full-width calls to action). */
  fullWidth?: boolean;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The app's single button.
 *
 * Every screen previously rolled its own `Pressable` with an ad-hoc height,
 * radius and label weight, which is why buttons read as inconsistent and bulky.
 * Use this instead; reach for a raw Pressable only for genuinely non-button
 * affordances (list rows, cards, icon-only header controls).
 */
export function Button({
  label,
  onPress,
  variant = 'secondary',
  size = 'md',
  icon,
  disabled = false,
  busy = false,
  fullWidth = false,
  accessibilityLabel,
  accessibilityHint,
  style,
}: ButtonProps) {
  const theme = useAppTheme();
  const metrics = sizes[size];
  const inactive = disabled || busy;

  const background = inactive
    ? variant === 'ghost'
      ? 'transparent'
      : theme.disabledSurface
    : variant === 'primary'
      ? theme.primaryAction
      : variant === 'tonal'
        ? theme.tintPrimary
        : variant === 'destructive'
          ? theme.tintDestructive
          : variant === 'ghost'
            ? 'transparent'
            : theme.elevatedSurface;

  const foreground = inactive
    ? theme.disabledText
    : variant === 'primary'
      ? theme.onPrimaryAction
      : variant === 'destructive'
        ? theme.destructive
        : variant === 'tonal' || variant === 'ghost'
          ? theme.primaryAction
          : theme.primaryText;

  return (
    <PressableScale
      accessibilityHint={accessibilityHint}
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: inactive }}
      disabled={inactive}
      hitSlop={Math.max(0, Math.round((44 - metrics.height) / 2))}
      onPress={onPress}
      style={[
        styles.button,
        {
          backgroundColor: background,
          gap: metrics.gap,
          height: metrics.height,
          paddingHorizontal: metrics.paddingHorizontal,
        },
        fullWidth ? styles.fullWidth : null,
        style,
      ]}>
      {busy ? (
        <ActivityIndicator color={foreground} size="small" />
      ) : (
        <>
          {icon ? <SymbolView name={icon} size={metrics.iconSize} tintColor={foreground} /> : null}
          <Text numberOfLines={1} style={[styles.label, { color: foreground, fontSize: metrics.fontSize }]}>
            {label}
          </Text>
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    flexShrink: 1,
    justifyContent: 'center',
  },
  fullWidth: {
    alignSelf: 'stretch',
    flexGrow: 1,
  },
  label: {
    fontFamily: fonts.sans.semibold,
    fontWeight: '600',
    letterSpacing: 0.1,
  },
});
