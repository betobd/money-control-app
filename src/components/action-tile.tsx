import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type ActionTileSpec = {
  /**
   * One or two words — the tile is narrow. Put the full phrase in
   * `accessibilityLabel`. Also the React key, so keep it stable across renders.
   */
  label: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
  /** `primary` for the object's main action, `destructive` for void/archive/end. */
  tone?: 'default' | 'primary' | 'destructive';
  disabled?: boolean;
  busy?: boolean;
  accessibilityLabel?: string;
};

/**
 * Tiles per row. Three keeps each tile around 105dp on a phone, wide enough for a
 * one- or two-word label; at four, labels such as "Contribute" truncate. More
 * actions wrap onto another row instead of shrinking.
 */
const MAX_PER_ROW = 3;

type ActionTileRowProps = {
  actions: readonly ActionTileSpec[];
  /**
   * Why an action is unavailable. Rendered under the row, because a disabled tile
   * that says nothing reads as broken rather than as a rule.
   */
  hints?: readonly string[];
};

/**
 * Actions on one object — a transaction, a credit card, an investment.
 *
 * The single component for that role (docs/design-system.md). Form commands
 * such as Save stay `Button`; creating another item is the header `+`.
 * Unavailable actions stay visible and disabled rather than disappearing.
 */
export function ActionTileRow({ actions, hints = [] }: ActionTileRowProps) {
  const theme = useAppTheme();
  const rows: ActionTileSpec[][] = [];
  for (let index = 0; index < actions.length; index += MAX_PER_ROW) {
    rows.push(actions.slice(index, index + MAX_PER_ROW));
  }
  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map((action) => <ActionTile action={action} key={action.label} />)}
          {/* Keep a short last row's tiles the same width as the full row above. */}
          {rowIndex > 0 && row.length < MAX_PER_ROW && rows[0].length === MAX_PER_ROW
            ? Array.from({ length: MAX_PER_ROW - row.length }, (_, index) => <View key={`gap-${index}`} style={styles.spacer} />)
            : null}
        </View>
      ))}
      {hints.map((hint) => (
        <Text key={hint} style={[styles.hint, { color: theme.secondaryText }]}>{hint}</Text>
      ))}
    </View>
  );
}

function ActionTile({ action }: { action: ActionTileSpec }) {
  const theme = useAppTheme();
  const { busy = false, disabled = false, tone = 'default' } = action;
  const inactive = disabled || busy;
  const background = inactive
    ? theme.disabledSurface
    : tone === 'primary'
      ? theme.primaryAction
      : tone === 'destructive'
        ? theme.tintDestructive
        : theme.tintPrimary;
  const foreground = inactive
    ? theme.disabledText
    : tone === 'primary'
      ? theme.onPrimaryAction
      : tone === 'destructive'
        ? theme.destructive
        : theme.primaryAction;
  return (
    <Pressable
      accessibilityLabel={action.accessibilityLabel ?? action.label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled: inactive }}
      disabled={inactive}
      onPress={action.onPress}
      style={[styles.tile, { backgroundColor: background }]}>
      {busy ? (
        <ActivityIndicator color={foreground} />
      ) : (
        <SymbolView name={action.icon} size={22} tintColor={foreground} />
      )}
      <Text numberOfLines={1} style={[styles.label, { color: foreground }]}>{action.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { flexDirection: 'row', gap: spacing.sm },
  tile: { alignItems: 'center', borderRadius: borderRadii.md, flex: 1, gap: spacing.xs, justifyContent: 'center', minHeight: 72, minWidth: 0, paddingHorizontal: spacing.xs },
  spacer: { flex: 1 },
  label: { ...typography.captionStrong },
  hint: { ...typography.caption, textAlign: 'center' },
});
