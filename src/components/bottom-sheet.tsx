import { type ReactNode, useCallback, useEffect, useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

const OPEN_MS = 240;
const CLOSE_MS = 180;

type BottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Sheet heading. Rendered as an accessibility header. */
  title?: string;
  /** Optional supporting line under the title. */
  description?: string;
  children: ReactNode;
};

/**
 * Themed modal sheet anchored to the bottom of the screen.
 *
 * Replaces `Alert.alert` action menus and hosts pickers. The sheet animates out
 * before the native Modal unmounts, so dismissal never snaps. Tapping the
 * scrim or pressing Android back closes it.
 */
export function BottomSheet({ visible, onClose, title, description, children }: BottomSheetProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const reducedMotion = useReducedMotion();
  const progress = useSharedValue(0);
  // The Modal must outlive `visible` so the exit animation can play. `exiting`
  // is adjusted during render (not in an effect) to avoid a cascading render.
  const [exiting, setExiting] = useState(false);
  const [lastVisible, setLastVisible] = useState(visible);
  if (lastVisible !== visible) {
    setLastVisible(visible);
    setExiting(!visible);
  }
  const mounted = visible || exiting;

  const finishExit = useCallback(() => setExiting(false), []);

  useEffect(() => {
    if (visible) {
      progress.value = withTiming(1, { duration: reducedMotion ? 0 : OPEN_MS, easing: Easing.out(Easing.cubic) });
      return;
    }
    progress.value = withTiming(
      0,
      { duration: reducedMotion ? 0 : CLOSE_MS, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finishExit)();
      },
    );
  }, [visible, progress, reducedMotion, finishExit]);

  const scrimStyle = useAnimatedStyle(() => ({ opacity: progress.value }));
  const sheetStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ translateY: (1 - progress.value) * 320 }],
  }));

  if (!mounted) return null;

  return (
    <Modal animationType="none" onRequestClose={onClose} statusBarTranslucent transparent visible>
      <View style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, scrimStyle, { backgroundColor: theme.overlay }]}>
          <Pressable
            accessibilityLabel={t.common.close}
            accessibilityRole="button"
            onPress={onClose}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
        <Animated.View
          style={[
            styles.sheet,
            sheetStyle,
            { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md },
          ]}>
          <View style={[styles.grabber, { backgroundColor: theme.border }]} />
          {title ? (
            <View style={styles.heading}>
              <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
                {title}
              </Text>
              {description ? (
                <Text style={[styles.description, { color: theme.secondaryText }]}>{description}</Text>
              ) : null}
            </View>
          ) : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  sheet: {
    borderTopLeftRadius: borderRadii.lg,
    borderTopRightRadius: borderRadii.lg,
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  grabber: {
    alignSelf: 'center',
    borderRadius: borderRadii.full,
    height: 4,
    width: 40,
  },
  heading: { gap: spacing.xs },
  title: { ...typography.sectionTitle },
  description: { ...typography.caption },
});
