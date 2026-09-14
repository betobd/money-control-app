import type { SymbolViewProps } from 'expo-symbols';
import { Fragment } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { IconChip } from '@/components/icon-chip';
import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

export type SheetAction = {
  label: string;
  /** Optional supporting line explaining the consequence of the action. */
  description?: string;
  icon: SymbolViewProps['name'];
  onPress: () => void;
  /** `destructive` tints the row so irreversible actions read as such. */
  tone?: 'default' | 'destructive';
  /**
   * Shows the row greyed out and inert. Prefer this over omitting the action:
   * an option that silently disappears reads as the app being broken, while a
   * disabled row plus `description` says what would make it available.
   */
  disabled?: boolean;
};

type ActionSheetProps = {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  actions: SheetAction[];
};

/**
 * Bottom-sheet action menu.
 *
 * Replaces multi-button `Alert.alert` menus, which Android renders as a generic
 * system dialog with no icons, no descriptions and no theming. Selecting a row
 * dismisses the sheet before running the action so the two animations never
 * overlap.
 */
export function ActionSheet({ visible, onClose, title, description, actions }: ActionSheetProps) {
  const theme = useAppTheme();
  const t = useMessages();

  return (
    <BottomSheet description={description} onClose={onClose} title={title} visible={visible}>
      <View style={styles.actions}>
        {actions.map((action, index) => {
          const destructive = action.tone === 'destructive';
          const disabled = action.disabled === true;
          const color = disabled
            ? theme.mutedText
            : destructive ? theme.destructive : theme.primaryAction;
          return (
            <Fragment key={action.label}>
              {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.hairline }]} /> : null}
              <PressableScale
                accessibilityLabel={action.label}
                accessibilityHint={action.description}
                accessibilityRole="button"
                accessibilityState={{ disabled }}
                disabled={disabled}
                onPress={() => {
                  onClose();
                  action.onPress();
                }}
                style={StyleSheet.flatten([styles.row, disabled && styles.disabledRow])}>
                <IconChip
                  background={disabled ? theme.disabledSurface : destructive ? theme.tintDestructive : theme.tintPrimary}
                  color={color}
                  icon={action.icon}
                  iconSize={20}
                  size={40}
                />
                <View style={styles.text}>
                  <Text style={[styles.label, { color: disabled ? theme.mutedText : destructive ? theme.destructive : theme.primaryText }]}>
                    {action.label}
                  </Text>
                  {action.description ? (
                    <Text style={[styles.description, { color: theme.secondaryText }]}>{action.description}</Text>
                  ) : null}
                </View>
              </PressableScale>
            </Fragment>
          );
        })}
      </View>

      <PressableScale
        accessibilityLabel={t.common.cancel}
        accessibilityRole="button"
        onPress={onClose}
        style={StyleSheet.flatten([styles.cancel, { backgroundColor: theme.elevatedSurface }])}>
        <Text style={[styles.cancelLabel, { color: theme.secondaryText }]}>{t.common.cancel}</Text>
      </PressableScale>
    </BottomSheet>
  );
}

/** Convenience icons for the action rows shared across screens. */
export const actionIcons = {
  edit: { ios: 'pencil', android: 'edit', web: 'edit' },
  archive: { ios: 'archivebox.fill', android: 'archive', web: 'archive' },
  restore: { ios: 'arrow.uturn.backward', android: 'unarchive', web: 'unarchive' },
  delete: { ios: 'trash.fill', android: 'delete', web: 'delete' },
  open: { ios: 'arrow.up.right', android: 'open_in_new', web: 'open_in_new' },
} satisfies Record<string, SymbolViewProps['name']>;

const styles = StyleSheet.create({
  actions: { gap: 0 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: 40 + spacing.md },
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
  },
  disabledRow: { opacity: 0.6 },
  text: { flex: 1, gap: 2 },
  label: { ...typography.body, fontSize: 15 },
  description: { ...typography.caption, fontSize: 13, lineHeight: 18 },
  cancel: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    justifyContent: 'center',
    minHeight: 48,
  },
  cancelLabel: { ...typography.label, fontSize: 14 },
});
