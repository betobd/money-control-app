import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { AppLockActionError } from '../app-lock.service';
import { useAppLock } from '../app-lock-provider';
import {
  APP_LOCK_DELAYS,
  type AppLockDelay,
  type BiometricAvailability,
} from '../app-lock.types';
import { PinValidationError } from '../pin-verification.service';
import { PinInput } from './pin-input';

type Flow = 'enable' | 'change' | 'biometric' | 'disable' | null;

const delayLabels: Record<AppLockDelay, string> = {
  0: 'Immediately',
  30_000: 'After 30 seconds',
  60_000: 'After 1 minute',
  300_000: 'After 5 minutes',
  900_000: 'After 15 minutes',
};

function availabilityText(availability: BiometricAvailability | null): string {
  if (!availability) return 'Checking device support…';
  if (availability.status === 'noHardware') return 'No biometric hardware detected';
  if (availability.status === 'notEnrolled') return 'Biometric hardware found, but no biometrics are enrolled';
  if (availability.status === 'notStrongEnough') return 'Enrolled biometrics do not meet the strong-security requirement';
  const types = availability.types.map((type) => type === 'face' ? 'facial authentication' : type).join(', ');
  return `Strong biometrics available${types ? `: ${types}` : ''}`;
}

function safeError(error: unknown): string {
  if (error instanceof PinValidationError || error instanceof AppLockActionError) return error.message;
  return 'The security setting could not be updated. Your existing App Lock configuration was preserved.';
}

export function SecurityScreen() {
  const { sensitiveInputResetToken } = useAppLock();
  return <SecurityScreenContent key={sensitiveInputResetToken} />;
}

function SecurityScreenContent() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const {
    changePin,
    config,
    disableAppLock,
    enableAppLock,
    getBiometricAvailability,
    lockNow,
    privacyError,
    setBiometricEnabled,
    setLockDelay,
  } = useAppLock();
  const [availability, setAvailability] = useState<BiometricAvailability | null>(null);
  const [availabilityError, setAvailabilityError] = useState<string>();
  const [flow, setFlow] = useState<Flow>(null);
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [notice, setNotice] = useState<string>();

  const enabled = config?.status === 'active';

  useEffect(() => {
    let cancelled = false;
    void getBiometricAvailability().then(
      (result) => {
        if (!cancelled) setAvailability(result);
      },
      () => {
        if (!cancelled) setAvailabilityError('Device biometric status could not be checked.');
      },
    );
    return () => {
      cancelled = true;
    };
  }, [config?.biometricUnlockEnabled, getBiometricAvailability]);

  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  function clearPinState(): void {
    setCurrentPin('');
    setNewPin('');
    setConfirmation('');
    setError(undefined);
  }

  function closeFlow(): void {
    clearPinState();
    setFlow(null);
  }

  function startFlow(next: Exclude<Flow, null>): void {
    clearPinState();
    setNotice(undefined);
    setFlow(next);
  }

  async function submitEnable(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await enableAppLock(newPin, confirmation);
      closeFlow();
      setNotice('App Lock enabled. You can now enable strong device biometrics if available.');
    } catch (cause) {
      setError(safeError(cause));
      setNewPin('');
      setConfirmation('');
    } finally {
      setBusy(false);
    }
  }

  async function submitChange(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await changePin(currentPin, newPin, confirmation);
      closeFlow();
      setNotice('PIN changed. Your previous PIN no longer unlocks Money Control.');
    } catch (cause) {
      setError(safeError(cause));
      setCurrentPin('');
      setNewPin('');
      setConfirmation('');
    } finally {
      setBusy(false);
    }
  }

  async function submitBiometric(): Promise<void> {
    if (!config) return;
    const nextEnabled = !config.biometricUnlockEnabled;
    setBusy(true);
    setError(undefined);
    try {
      await setBiometricEnabled(currentPin, nextEnabled);
      closeFlow();
      setNotice(nextEnabled ? 'Biometric unlock enabled.' : 'Biometric unlock disabled. Device biometrics were not changed.');
    } catch (cause) {
      setError(safeError(cause));
      setCurrentPin('');
    } finally {
      setBusy(false);
    }
  }

  function confirmDisable(): void {
    if (currentPin.length !== 6) {
      setError('Enter your complete 6-digit current PIN.');
      return;
    }
    Alert.alert(
      'Disable App Lock?',
      'Money Control will stop requiring a local unlock. Financial data and backup files will not be deleted.',
      [
        { text: 'Cancel', style: 'cancel', onPress: clearPinState },
        { text: 'Disable App Lock', style: 'destructive', onPress: () => void submitDisable() },
      ],
    );
  }

  async function submitDisable(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await disableAppLock(currentPin);
      closeFlow();
      setNotice('App Lock disabled. Financial data was not changed.');
    } catch (cause) {
      setError(safeError(cause));
      setCurrentPin('');
    } finally {
      setBusy(false);
    }
  }

  async function updateDelay(delay: AppLockDelay): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await setLockDelay(delay);
      setNotice(`Automatic locking set to ${delayLabels[delay].toLowerCase()}.`);
    } catch (cause) {
      setError(safeError(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Back" accessibilityRole="button" disabled={busy} onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={busy ? theme.disabledText : theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Security</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {error ? <Text accessibilityLiveRegion="assertive" selectable style={[styles.feedback, { borderColor: theme.destructive, color: theme.destructive }]}>{error}</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" selectable style={[styles.feedback, { borderColor: theme.income, color: theme.income }]}>{notice}</Text> : null}

        <Section title="App Lock" theme={theme}>
          <StatusRow label="Status" value={enabled ? 'Enabled' : 'Disabled'} theme={theme} />
          <Text style={[styles.body, { color: theme.secondaryText }]}>App Lock is optional and protects casual access to the app interface. It is not an online account or Android device lock.</Text>
          {!enabled ? (
            <PrimaryButton disabled={busy} label="Enable App Lock" onPress={() => startFlow('enable')} theme={theme} />
          ) : (
            <View style={styles.buttonGroup}>
              <SecondaryButton disabled={busy} label="Change PIN" onPress={() => startFlow('change')} theme={theme} />
              <SecondaryButton disabled={busy} label="Lock now" onPress={lockNow} theme={theme} />
              <DestructiveButton disabled={busy} label="Disable App Lock" onPress={() => startFlow('disable')} theme={theme} />
            </View>
          )}
        </Section>

        {flow ? (
          <Section title={flowTitle(flow, config?.biometricUnlockEnabled ?? false)} theme={theme}>
            {(flow === 'change' || flow === 'biometric' || flow === 'disable') ? (
              <LabeledPin label="Current PIN" value={currentPin} onChange={setCurrentPin} onInvalid={() => setError('PIN must contain numbers only.')} />
            ) : null}
            {(flow === 'enable' || flow === 'change') ? (
              <>
                <LabeledPin label="New 6-digit PIN" value={newPin} onChange={setNewPin} onInvalid={() => setError('PIN must contain numbers only.')} />
                <LabeledPin label="Confirm new PIN" value={confirmation} onChange={setConfirmation} onInvalid={() => setError('PIN must contain numbers only.')} />
              </>
            ) : null}
            <View style={styles.inlineActions}>
              <SecondaryButton disabled={busy} label="Cancel" onPress={closeFlow} theme={theme} />
              <PrimaryButton
                busy={busy}
                disabled={busy}
                label={flowSubmitLabel(flow, config?.biometricUnlockEnabled ?? false)}
                onPress={() => {
                  if (flow === 'enable') void submitEnable();
                  if (flow === 'change') void submitChange();
                  if (flow === 'biometric') void submitBiometric();
                  if (flow === 'disable') confirmDisable();
                }}
                theme={theme}
              />
            </View>
          </Section>
        ) : null}

        <Section title="Device biometrics" theme={theme}>
          <StatusRow label="Unlock preference" value={config?.biometricUnlockEnabled ? 'Enabled' : 'Disabled'} theme={theme} />
          <Text style={[styles.body, { color: availabilityError ? theme.destructive : theme.secondaryText }]}>{availabilityError ?? availabilityText(availability)}</Text>
          <Text style={[styles.caption, { color: theme.mutedText }]}>Money Control requires strong biometrics where Android reports a security level. The local PIN always remains available.</Text>
          {enabled ? (
            <SecondaryButton
              disabled={busy || (!config?.biometricUnlockEnabled && availability?.status !== 'available')}
              label={config?.biometricUnlockEnabled ? 'Disable biometric unlock' : 'Enable biometric unlock'}
              onPress={() => startFlow('biometric')}
              theme={theme}
            />
          ) : null}
        </Section>

        {enabled && config ? (
          <Section title="Automatic locking" theme={theme}>
            <Text style={[styles.body, { color: theme.secondaryText }]}>Lock after Money Control has remained outside the active foreground for:</Text>
            <View accessibilityRole="radiogroup" style={styles.delayList}>
              {APP_LOCK_DELAYS.map((delay) => {
                const selected = config.lockDelayMs === delay;
                return (
                  <Pressable
                    key={delay}
                    accessibilityLabel={delayLabels[delay]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: busy }}
                    disabled={busy}
                    onPress={() => void updateDelay(delay)}
                    style={[styles.delayRow, { borderColor: selected ? theme.primaryAction : theme.border, backgroundColor: selected ? theme.elevatedSurface : theme.surface }]}>
                    <Text style={[styles.body, { color: theme.primaryText, fontWeight: selected ? '700' : '400' }]}>{delayLabels[delay]}</Text>
                    {selected ? <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={22} tintColor={theme.primaryAction} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Section>
        ) : null}

        <Section title="Privacy and limitations" theme={theme}>
          {privacyError ? <Text accessibilityLiveRegion="polite" selectable style={[styles.body, { color: theme.warning }]}>{privacyError}</Text> : null}
          <Limit title="Local interface protection" text="App Lock does not replace Android device security and cannot protect a rooted or otherwise compromised device." theme={theme} />
          <Limit title="Database is not encrypted" text="The SQLite database remains plaintext inside the app sandbox in this phase." theme={theme} />
          <Limit title="Backups remain plaintext" text="Exported JSON backups contain financial data, do not include the PIN or App Lock records, and remain readable outside Money Control." theme={theme} />
          <Limit title="Future notifications" text="Future financial notifications must hide sensitive content when App Lock privacy requires it." theme={theme} />
        </Section>
      </ScrollView>
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>;

function flowTitle(flow: Exclude<Flow, null>, biometricEnabled: boolean): string {
  if (flow === 'enable') return 'Create App Lock PIN';
  if (flow === 'change') return 'Change PIN';
  if (flow === 'disable') return 'Confirm PIN to disable';
  return biometricEnabled ? 'Confirm PIN to disable biometrics' : 'Confirm PIN to enable biometrics';
}

function flowSubmitLabel(flow: Exclude<Flow, null>, biometricEnabled: boolean): string {
  if (flow === 'enable') return 'Create PIN and enable';
  if (flow === 'change') return 'Change PIN';
  if (flow === 'disable') return 'Continue';
  return biometricEnabled ? 'Disable biometrics' : 'Continue to biometric prompt';
}

function Section({ children, theme, title }: { children: React.ReactNode; theme: Theme; title: string }) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      {children}
    </View>
  );
}

function StatusRow({ label, theme, value }: { label: string; theme: Theme; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.body, { color: theme.primaryText, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function LabeledPin({ label, onChange, onInvalid, value }: { label: string; onChange: (value: string) => void; onInvalid: () => void; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.pinField}>
      <Text style={[styles.label, { color: theme.primaryText }]}>{label}</Text>
      <PinInput accessibilityLabel={label} onChange={onChange} onInvalidInput={onInvalid} value={value} />
    </View>
  );
}

function Limit({ text, theme, title }: { text: string; theme: Theme; title: string }) {
  return (
    <View style={[styles.limit, { borderColor: theme.border }]}>
      <Text style={[styles.label, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ busy = false, disabled, label, onPress, theme }: { busy?: boolean; disabled: boolean; label: string; onPress: () => void; theme: Theme }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ busy, disabled }} disabled={disabled} onPress={onPress} style={[styles.button, { backgroundColor: disabled ? theme.disabledSurface : theme.primaryAction }]}>
      {busy ? <ActivityIndicator color={theme.onPrimaryAction} /> : <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.onPrimaryAction }]}>{label}</Text>}
    </Pressable>
  );
}

function SecondaryButton({ disabled, label, onPress, theme }: { disabled: boolean; label: string; onPress: () => void; theme: Theme }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, { borderColor: disabled ? theme.disabledText : theme.primaryAction, borderWidth: borderWidths.thin }]}>
      <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.primaryAction }]}>{label}</Text>
    </Pressable>
  );
}

function DestructiveButton({ disabled, label, onPress, theme }: { disabled: boolean; label: string; onPress: () => void; theme: Theme }) {
  return (
    <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.button, { borderColor: disabled ? theme.disabledText : theme.destructive, borderWidth: borderWidths.thin }]}>
      <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.destructive }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.md, paddingHorizontal: spacing.md },
  feedback: { ...typography.caption, backgroundColor: 'transparent', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, padding: spacing.md },
  card: { borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.md },
  sectionTitle: { ...typography.sectionTitle },
  body: { ...typography.body },
  caption: { ...typography.caption },
  label: { ...typography.caption, fontWeight: '700' },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  buttonGroup: { gap: spacing.sm },
  button: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  buttonLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  pinField: { gap: spacing.sm },
  inlineActions: { gap: spacing.sm },
  delayList: { gap: spacing.sm },
  delayRow: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md },
  limit: { borderTopWidth: borderWidths.thin, gap: spacing.xs, paddingTop: spacing.md },
});
