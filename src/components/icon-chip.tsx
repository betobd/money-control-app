import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { borderRadii } from '@/constants/theme';

type IconChipProps = {
  icon: SymbolViewProps['name'];
  /** Foreground (icon) color. */
  color: string;
  /** Chip fill — typically a tint token or elevatedSurface. */
  background: string;
  size?: number;
  iconSize?: number;
  radius?: number;
  style?: ViewStyle | ViewStyle[];
};

/**
 * Rounded-square icon chip with a tinted fill — replaces the repeated
 * 44px circle-on-elevatedSurface pattern from the previous design.
 */
export function IconChip({
  icon,
  color,
  background,
  size = 38,
  iconSize = 20,
  radius = borderRadii.md,
  style,
}: IconChipProps) {
  return (
    <View style={[styles.chip, { backgroundColor: background, borderRadius: radius, height: size, width: size }, style]}>
      <SymbolView name={icon} size={iconSize} tintColor={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    flexShrink: 0,
    justifyContent: 'center',
  },
});
