import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

/**
 * The right-hand slot. `add` is the one place a screen offers "create another";
 * see docs/design-system.md. `text` is for a secondary command such as "Clear all".
 */
export type ScreenHeaderAction =
  | { kind: 'add'; accessibilityLabel: string; onPress: () => void }
  | { kind: 'text'; label: string; accessibilityLabel?: string; onPress: () => void };

type ScreenHeaderProps = {
  title: string;
  /** Optional second line under the title. */
  subtitle?: string;
  /**
   * `close` for a screen presented modally, `back` for one pushed onto the stack —
   * the icon tells the user whether leaving discards the context or returns to it.
   */
  leading: 'close' | 'back';
  /** Defaults to `router.back()`. */
  onLeadingPress?: () => void;
  leadingAccessibilityLabel?: string;
  /** Blocks leaving while the screen is mid-operation (backup, export, PIN change). */
  leadingDisabled?: boolean;
  action?: ScreenHeaderAction;
  /**
   * Extra top padding for screens that do not already pad their root for the
   * status bar, such as a header rendered inside a native Modal.
   */
  topInset?: number;
};

/**
 * Header for every screen that is not a primary tab.
 *
 * Twenty-five screens used to hand-roll this with nine different title sizes and
 * an inconsistent bottom border. It is rendered outside the ScrollView, so it
 * stays fixed while content scrolls. Primary tabs use `PrimaryScreenHeader`.
 */
export function ScreenHeader({
  title,
  subtitle,
  leading,
  onLeadingPress,
  leadingAccessibilityLabel,
  leadingDisabled = false,
  action,
  topInset = 0,
}: ScreenHeaderProps) {
  const router = useRouter();
  const theme = useAppTheme();
  const t = useMessages();
  const icon = leading === 'close'
    ? { ios: 'xmark', android: 'close', web: 'close' } as const
    : { ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' } as const;

  return (
    <View style={[styles.header, { paddingTop: topInset }]}>
      <Pressable
        accessibilityLabel={leadingAccessibilityLabel ?? (leading === 'close' ? t.common.closeScreen(title) : t.common.back)}
        accessibilityRole="button"
        accessibilityState={{ disabled: leadingDisabled }}
        disabled={leadingDisabled}
        onPress={onLeadingPress ?? (() => router.back())}
        style={styles.slot}>
        <SymbolView name={icon} size={24} tintColor={leadingDisabled ? theme.disabledText : theme.primaryText} />
      </Pressable>

      <View style={styles.titleBlock}>
        <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.primaryText }]}>
          {title}
        </Text>
        {subtitle ? (
          <Text numberOfLines={1} style={[styles.subtitle, { color: theme.secondaryText }]}>{subtitle}</Text>
        ) : null}
      </View>

      {action?.kind === 'add' ? (
        <Pressable
          accessibilityLabel={action.accessibilityLabel}
          accessibilityRole="button"
          onPress={action.onPress}
          style={styles.slot}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={26} tintColor={theme.primaryAction} />
        </Pressable>
      ) : action?.kind === 'text' ? (
        <Pressable
          accessibilityLabel={action.accessibilityLabel ?? action.label}
          accessibilityRole="button"
          onPress={action.onPress}
          style={styles.textSlot}>
          <Text numberOfLines={1} style={[styles.textAction, { color: theme.primaryAction }]}>{action.label}</Text>
        </Pressable>
      ) : (
        // Mirrors the leading slot so the title stays optically centered.
        <View style={styles.slot} />
      )}
    </View>
  );
}

const SLOT = 48;

const styles = StyleSheet.create({
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  slot: { alignItems: 'center', height: SLOT, justifyContent: 'center', width: SLOT },
  // Wide enough for "Clear all" while still centering the title against the
  // leading slot; the title block shrinks rather than the action truncating.
  textSlot: { alignItems: 'flex-end', justifyContent: 'center', minHeight: SLOT, minWidth: SLOT, paddingHorizontal: spacing.xs },
  titleBlock: { alignItems: 'center', flex: 1, minWidth: 0 },
  title: { ...typography.sectionTitle, textAlign: 'center' },
  subtitle: { ...typography.caption, textAlign: 'center' },
  textAction: { ...typography.captionStrong },
});
