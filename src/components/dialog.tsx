import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export type DialogTone = 'default' | 'destructive';

type ConfirmRequest = {
  title: string;
  message: string;
  confirmLabel: string;
  cancelLabel: string;
  tone: DialogTone;
  onConfirm: () => void;
  /** Runs when the user backs out, including via the scrim or the back button. */
  onCancel?: () => void;
};

type NoticeRequest = {
  title: string;
  message: string;
};

type DialogRequest =
  | ({ kind: 'confirm' } & ConfirmRequest)
  | ({ kind: 'notice' } & NoticeRequest);

export type Dialog = {
  /** Asks for confirmation before running an action. */
  confirm: (request: Omit<ConfirmRequest, 'confirmLabel' | 'cancelLabel' | 'tone'> & {
    confirmLabel?: string;
    cancelLabel?: string;
    tone?: DialogTone;
  }) => void;
  /** Reports something the user must acknowledge but cannot act on. */
  notice: (request: NoticeRequest) => void;
  /** Internal: consumed by {@link DialogHost}. */
  request: DialogRequest | null;
  /** Closes without running either callback. */
  dismiss: () => void;
  /** Closes the way the user backing out does, running `onCancel`. */
  cancel: () => void;
};

/**
 * In-app confirmations and notices.
 *
 * Replaces `Alert.alert`, which Android draws as an unthemed system dialog that
 * ignores the app's colors, typography and dark mode, and which cannot show more
 * than a title and a body. Pair with {@link DialogHost}, rendered once per
 * screen.
 */
export function useDialog(): Dialog {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const dismiss = useCallback(() => setRequest(null), []);
  // The callback runs outside the state updater on purpose: React may invoke an
  // updater more than once, and a cancel handler must fire exactly once.
  const cancel = useCallback(() => {
    if (request?.kind === 'confirm') request.onCancel?.();
    setRequest(null);
  }, [request]);

  const confirm = useCallback<Dialog['confirm']>((next) => {
    setRequest({
      kind: 'confirm',
      confirmLabel: 'Confirm',
      cancelLabel: 'Cancel',
      tone: 'default',
      ...next,
    });
  }, []);

  const notice = useCallback<Dialog['notice']>((next) => {
    setRequest({ kind: 'notice', ...next });
  }, []);

  return { confirm, notice, request, dismiss, cancel };
}

export function DialogHost({ dialog }: { dialog: Dialog }) {
  const theme = useAppTheme();
  const { request, dismiss, cancel } = dialog;
  const destructive = request?.kind === 'confirm' && request.tone === 'destructive';

  return (
    <BottomSheet
      description={request?.message}
      onClose={cancel}
      title={request?.title}
      visible={request !== null}>
      <View style={styles.buttons}>
        {request?.kind === 'confirm' ? (
          <>
            <PressableScale
              accessibilityLabel={request.cancelLabel}
              accessibilityRole="button"
              onPress={cancel}
              style={StyleSheet.flatten([styles.button, { backgroundColor: theme.elevatedSurface }])}>
              <Text style={[styles.label, { color: theme.secondaryText }]}>{request.cancelLabel}</Text>
            </PressableScale>
            <PressableScale
              accessibilityLabel={request.confirmLabel}
              accessibilityRole="button"
              onPress={() => {
                // Dismiss first so the sheet's exit animation never overlaps a
                // navigation or a second sheet opened by the action itself.
                dismiss();
                request.onConfirm();
              }}
              style={StyleSheet.flatten([
                styles.button,
                { backgroundColor: destructive ? theme.destructive : theme.primaryAction },
              ])}>
              <Text style={[styles.label, { color: theme.onPrimaryAction, fontWeight: '700' }]}>
                {request.confirmLabel}
              </Text>
            </PressableScale>
          </>
        ) : (
          <PressableScale
            accessibilityLabel="Dismiss"
            accessibilityRole="button"
            onPress={dismiss}
            style={StyleSheet.flatten([styles.button, { backgroundColor: theme.elevatedSurface }])}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>OK</Text>
          </PressableScale>
        )}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  buttons: { flexDirection: 'row', gap: spacing.sm },
  button: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flex: 1,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  label: { ...typography.body, fontSize: 15 },
});
