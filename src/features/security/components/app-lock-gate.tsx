import { SymbolView } from 'expo-symbols';
import { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  BackHandler,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { canRenderProtectedContent } from '../app-lock-gate-policy';
import { useAppLock } from '../app-lock-provider';
import { PIN_LENGTH } from '../app-lock.types';
import { PinInput, type PinInputHandle } from './pin-input';

export function AppLockBoundary({ children }: { children: React.ReactNode }) {
  const { sensitiveInputResetToken, state } = useAppLock();
  if (canRenderProtectedContent(state.status)) return children;
  return <AppLockGate key={sensitiveInputResetToken} />;
}

function AppLockGate() {
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
      const message = `Enter your complete ${PIN_LENGTH}-digit PIN.`;
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
    Alert.alert(
      'Forgot your PIN?',
      'Money Control has no account or recovery server, so the existing PIN cannot be recovered. The only recovery is to erase all app-private data from Android settings.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          onPress: () => Alert.alert(
            'All local financial data will be erased',
            'Clearing app storage removes local accounts, transactions, budgets, reports data, recurring data, settings, and App Lock. Exported backup files outside the app are preserved and can be restored afterward.',
            [
              { text: 'Keep my data', style: 'cancel' },
              { text: 'Open app settings', style: 'destructive', onPress: () => void Linking.openSettings() },
            ],
          ),
        },
      ],
    );
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
        <Text style={[styles.appName, { color: theme.primaryText }]}>Money Control</Text>
        <Text style={[styles.title, { color: theme.primaryText }]}>App locked</Text>
        <Text style={[styles.description, { color: theme.secondaryText }]}>Enter your local PIN to view financial information.</Text>
      </View>

      {state.status === 'loading' ? (
        <View accessibilityLabel="Loading secure App Lock configuration" style={styles.centeredState}>
          <ActivityIndicator color={theme.primaryAction} size="large" />
          <Text style={[styles.description, { color: theme.secondaryText }]}>Checking App Lock…</Text>
        </View>
      ) : state.status === 'configurationError' ? (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.destructive }]}>
          <Text accessibilityLiveRegion="assertive" selectable style={[styles.error, { color: theme.destructive }]}>{state.message}</Text>
          <PrimaryButton label="Retry secure storage" onPress={() => void retryConfiguration()} theme={theme} />
          <Pressable accessibilityRole="button" onPress={forgotPin} style={styles.textButton}>
            <Text style={[styles.link, { color: theme.primaryAction }]}>Help / Forgot PIN</Text>
          </Pressable>
        </View>
      ) : (
        <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {temporarilyLocked ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>Too many incorrect attempts. Try again in {remainingSeconds} seconds.</Text>
          ) : null}
          {state.status === 'locked' && state.message ? (
            <Text accessibilityLiveRegion="assertive" selectable style={[styles.error, { color: theme.destructive }]}>{state.message}</Text>
          ) : null}
          {inputError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{inputError}</Text> : null}
          <Text style={[styles.label, { color: theme.primaryText }]}>6-digit PIN</Text>
          <PinInput
            ref={inputRef}
            accessibilityLabel="Money Control 6-digit PIN"
            editable={!busy && !temporarilyLocked}
            onChange={(value) => {
              setPin(value);
              setInputError(undefined);
            }}
            onInvalidInput={() => setInputError('PIN must contain numbers only.')}
            onSubmitEditing={() => void submitPin()}
            value={pin}
          />
          <PrimaryButton
            busy={busy}
            disabled={busy || temporarilyLocked || pin.length !== PIN_LENGTH}
            label="Unlock"
            onPress={() => void submitPin()}
            theme={theme}
          />
          {config?.biometricUnlockEnabled ? (
            <Pressable
              accessibilityLabel="Unlock Money Control with device biometrics"
              accessibilityRole="button"
              disabled={busy}
              onPress={() => {
                setPin('');
                void unlockWithBiometrics();
              }}
              style={[styles.biometricButton, { borderColor: theme.primaryAction }]}>
              <SymbolView
                name={{ ios: 'touchid', android: 'fingerprint', web: 'fingerprint' }}
                size={24}
                tintColor={busy ? theme.disabledText : theme.primaryAction}
              />
              <Text style={[styles.buttonLabel, { color: busy ? theme.disabledText : theme.primaryAction }]}>Use device biometrics</Text>
            </Pressable>
          ) : null}
          <Pressable accessibilityRole="button" onPress={forgotPin} style={styles.textButton}>
            <Text style={[styles.link, { color: theme.primaryAction }]}>Help / Forgot PIN</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.limit, { color: theme.mutedText }]}>App Lock protects access to this app’s interface. It does not encrypt the SQLite database or exported plaintext backup files.</Text>
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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: disabled ? theme.disabledSurface : theme.primaryAction }]}>
      {busy ? <ActivityIndicator color={theme.onPrimaryAction} /> : (
        <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.onPrimaryAction }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, gap: spacing.lg, justifyContent: 'center', paddingHorizontal: spacing.lg },
  heading: { alignItems: 'center', gap: spacing.sm },
  lockIcon: { alignItems: 'center', borderRadius: borderRadii.lg, height: 72, justifyContent: 'center', width: 72 },
  appName: { ...typography.caption, fontWeight: '700' },
  title: { ...typography.title, fontSize: 28, textAlign: 'center' },
  description: { ...typography.body, textAlign: 'center' },
  centeredState: { alignItems: 'center', gap: spacing.md, minHeight: 180, justifyContent: 'center' },
  card: { borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.lg },
  label: { ...typography.caption, fontWeight: '700' },
  error: { ...typography.body, fontWeight: '600', textAlign: 'center' },
  primaryButton: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  biometricButton: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  buttonLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  textButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  link: { ...typography.body, fontWeight: '700' },
  limit: { ...typography.caption, textAlign: 'center' },
});
