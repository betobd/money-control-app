import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  BackHandler,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { canRenderProtectedContent } from '../app-lock-gate-policy';
import { useAppLock } from '../app-lock-provider';
import { PIN_LENGTH } from '../app-lock.types';
import { PinInput, type PinInputHandle } from './pin-input';
import { DialogHost, useDialog } from '@/components/dialog';
import { useMessages } from '@/i18n/use-messages';

export function AppLockBoundary({ children }: { children: React.ReactNode }) {
  const { sensitiveInputResetToken, state } = useAppLock();
  if (canRenderProtectedContent(state.status)) return children;
  return <AppLockGate key={sensitiveInputResetToken} />;
}

function AppLockGate() {
  const dialog = useDialog();
  const t = useMessages();
  const {
    config,
    retryConfiguration,
    state,
    unlockWithBiometrics,
    unlockWithPin,
  } = useAppLock();
  const [pin, setPin] = useState('');
  const [inputError, setInputError] = useState<string>();
  const [clock, setClock] = useState(() => Date.now());
  const inputRef = useRef<PinInputHandle>(null);
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    if (state.status === 'locked' && state.message) {
      AccessibilityInfo.announceForAccessibility(state.message);
      inputRef.current?.focus();
    }
  }, [state]);

  useEffect(() => {
    if (state.status !== 'temporarilyLocked') return;
    const timer = setInterval(() => setClock(Date.now()), 1_000);
    return () => clearInterval(timer);
  }, [state]);

  async function submitPin(): Promise<void> {
    if (pin.length !== PIN_LENGTH) {
      const message = t.security.gate.enterCompletePin(PIN_LENGTH);
      setInputError(message);
      AccessibilityInfo.announceForAccessibility(message);
      return;
    }
    const submittedPin = pin;
    setClock(Date.now());
    setPin('');
    setInputError(undefined);
    await unlockWithPin(submittedPin);
  }

  function forgotPin(): void {
    setPin('');
    dialog.confirm({
      title: t.security.gate.forgotTitle,
      message: t.security.gate.forgotMessage,
      confirmLabel: t.security.gate.continue,
      // Deliberately two steps: the first explains that nothing can be
      // recovered, the second states exactly what erasing destroys.
      onConfirm: () => dialog.confirm({
        title: t.security.gate.eraseTitle,
        message: t.security.gate.eraseMessage,
        confirmLabel: t.security.gate.openAppSettings,
        cancelLabel: t.security.gate.keepMyData,
        tone: 'destructive',
        onConfirm: () => void Linking.openSettings(),
      }),
    });
  }

  const busy = state.status === 'authenticating';
  const temporarilyLocked = state.status === 'temporarilyLocked';
  const remainingSeconds = state.status === 'temporarilyLocked'
    ? Math.max(0, Math.ceil((state.untilEpochMs - clock) / 1000))
    : 0;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        {
          backgroundColor: theme.appBackground,
          paddingBottom: insets.bottom + spacing.xl,
          paddingTop: insets.top + spacing.xl,
        },
      ]}
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled">
      <View accessibilityRole="header" style={styles.heading}>
        <View style={[styles.lockIcon, { backgroundColor: theme.elevatedSurface }]}>
          <SymbolView
            name={{ ios: 'lock.fill', android: 'lock', web: 'lock' }}
            size={36}
            tintColor={theme.primaryAction}
          />
        </View>
        <Text style={[styles.appName, { color: theme.primaryText }]}>{t.common.appName}</Text>
        <Text style={[styles.title, { color: theme.primaryText }]}>{t.security.gate.title}</Text>
        <Text style={[styles.description, { color: theme.secondaryText }]}>{t.security.gate.description}</Text>
      </View>

      {state.status === 'loading' ? (
        <View accessibilityLabel={t.security.gate.loadingLabel} style={styles.centeredState}>
          <ActivityIndicator color={theme.primaryAction} size="large" />
          <Text style={[styles.description, { color: theme.secondaryText }]}>{t.security.gate.checking}</Text>
        </View>
      ) : state.status === 'configurationError' ? (
        <Card padding={spacing.lg} style={styles.card}>
          <Text accessibilityLiveRegion="assertive" selectable style={[styles.error, { color: theme.destructive }]}>{state.message}</Text>
          <PrimaryButton label={t.security.gate.retrySecureStorage} onPress={() => void retryConfiguration()} theme={theme} />
          <Button label={t.security.gate.helpForgotPin} onPress={forgotPin} size="md" variant="ghost" />
        </Card>
      ) : (
        <Card padding={spacing.lg} style={styles.card}>
          {temporarilyLocked ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{t.security.gate.tooManyAttempts(remainingSeconds)}</Text>
          ) : null}
          {state.status === 'locked' && state.message ? (
            <Text accessibilityLiveRegion="assertive" selectable style={[styles.error, { color: theme.destructive }]}>{state.message}</Text>
          ) : null}
          {inputError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{inputError}</Text> : null}
          <Text style={[styles.label, { color: theme.primaryText }]}>{t.security.gate.pinLabel}</Text>
          <PinInput
            ref={inputRef}
            accessibilityLabel={t.security.gate.pinAccessibilityLabel}
            editable={!busy && !temporarilyLocked}
            onChange={(value) => {
              setPin(value);
              setInputError(undefined);
            }}
            onInvalidInput={() => setInputError(t.security.errors.pinNumbersOnly)}
            onSubmitEditing={() => void submitPin()}
            value={pin}
          />
          <PrimaryButton
            busy={busy}
            disabled={busy || temporarilyLocked || pin.length !== PIN_LENGTH}
            label={t.security.gate.unlock}
            onPress={() => void submitPin()}
            theme={theme}
          />
          {config?.biometricUnlockEnabled ? (
            <Button
              accessibilityLabel={t.security.gate.unlockWithBiometricsLabel}
              disabled={busy}
              fullWidth
              icon={{ ios: 'touchid', android: 'fingerprint', web: 'fingerprint' }}
              label={t.security.gate.useBiometrics}
              onPress={() => {
                setPin('');
                void unlockWithBiometrics();
              }}
              size="lg"
              variant="tonal"
            />
          ) : null}
          <Button label={t.security.gate.helpForgotPin} onPress={forgotPin} size="md" variant="ghost" />
        </Card>
      )}

      <Text style={[styles.limit, { color: theme.mutedText }]}>{t.security.gate.limitNotice}</Text>
      <DialogHost dialog={dialog} />
    </ScrollView>
  );
}

type Theme = ReturnType<typeof useAppTheme>;

function PrimaryButton({ busy = false, disabled = false, label, onPress, theme }: {
  busy?: boolean;
  disabled?: boolean;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Button busy={busy} disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" variant="primary" />
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, justifyContent: 'center', paddingHorizontal: spacing.lg },
  heading: { alignItems: 'center', gap: spacing.sm },
  lockIcon: { alignItems: 'center', borderRadius: borderRadii.lg, height: 72, justifyContent: 'center', width: 72 },
  appName: { ...typography.captionStrong },
  title: { ...typography.title, fontSize: 28, textAlign: 'center' },
  description: { ...typography.body, textAlign: 'center' },
  centeredState: { alignItems: 'center', gap: spacing.md, minHeight: 180, justifyContent: 'center' },
  card: { gap: spacing.md },
  label: { ...typography.captionStrong },
  error: { ...typography.body, fontFamily: fonts.sans.semibold, fontWeight: '600', textAlign: 'center' },
  limit: { ...typography.caption, textAlign: 'center' },
});
