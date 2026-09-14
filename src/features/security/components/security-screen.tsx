import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
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
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/button';
import type { Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';

type Flow = 'enable' | 'change' | 'biometric' | 'disable' | null;

type Copy = Messages['security']['screen'];

function delayLabel(copy: Copy, delay: AppLockDelay): string {
  if (delay === 0) return copy.delayImmediately;
  if (delay === 30_000) return copy.delay30Seconds;
  if (delay === 60_000) return copy.delay1Minute;
  if (delay === 300_000) return copy.delay5Minutes;
  return copy.delay15Minutes;
}

function availabilityText(copy: Copy, availability: BiometricAvailability | null): string {
  if (!availability) return copy.checkingSupport;
  if (availability.status === 'noHardware') return copy.noHardware;
  if (availability.status === 'notEnrolled') return copy.notEnrolled;
  if (availability.status === 'notStrongEnough') return copy.notStrongEnough;
  const types = availability.types.map((type) => (
    type === 'face' ? copy.typeFace : type === 'iris' ? copy.typeIris : copy.typeFingerprint
  )).join(', ');
  return copy.strongAvailable(types);
}

function safeError(copy: Copy, error: unknown): string {
  if (error instanceof PinValidationError || error instanceof AppLockActionError) return error.message;
  return copy.updateFailed;
}

export function SecurityScreen() {
  const { sensitiveInputResetToken } = useAppLock();
  return <SecurityScreenContent key={sensitiveInputResetToken} />;
}

function SecurityScreenContent() {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const copy = t.security.screen;
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
  const [availabilityFailed, setAvailabilityFailed] = useState(false);
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
        if (!cancelled) setAvailabilityFailed(true);
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
      setNotice(copy.enabledNotice);
    } catch (cause) {
      setError(safeError(copy, cause));
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
      setNotice(copy.pinChangedNotice);
    } catch (cause) {
      setError(safeError(copy, cause));
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
      setNotice(nextEnabled ? copy.biometricEnabledNotice : copy.biometricDisabledNotice);
    } catch (cause) {
      setError(safeError(copy, cause));
      setCurrentPin('');
    } finally {
      setBusy(false);
    }
  }

  function confirmDisable(): void {
    if (currentPin.length !== 6) {
      setError(copy.enterCurrentPin);
      return;
    }
    dialog.confirm({
      title: copy.disableTitle,
      message: copy.disableMessage,
      confirmLabel: copy.disableAppLock,
      tone: 'destructive',
      onConfirm: () => void submitDisable(),
      onCancel: clearPinState,
    });
  }

  async function submitDisable(): Promise<void> {
    setBusy(true);
    setError(undefined);
    try {
      await disableAppLock(currentPin);
      closeFlow();
      setNotice(copy.disabledNotice);
    } catch (cause) {
      setError(safeError(copy, cause));
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
      setNotice(copy.lockingSetNotice(delayLabel(copy, delay)));
    } catch (cause) {
      setError(safeError(copy, cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" leadingDisabled={busy} title={copy.title} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        contentInsetAdjustmentBehavior="automatic"
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {error ? <Text accessibilityLiveRegion="assertive" selectable style={[styles.feedback, { backgroundColor: theme.tintDestructive, color: theme.destructive }]}>{error}</Text> : null}
        {notice ? <Text accessibilityLiveRegion="polite" selectable style={[styles.feedback, { backgroundColor: theme.tintIncome, color: theme.income }]}>{notice}</Text> : null}

        <Section title={copy.appLockSection} theme={theme}>
          <StatusRow label={copy.status} value={enabled ? copy.enabled : copy.disabled} theme={theme} />
          <Text style={[styles.body, { color: theme.secondaryText }]}>{copy.appLockDescription}</Text>
          {!enabled ? (
            <PrimaryButton disabled={busy} label={copy.enableAppLock} onPress={() => startFlow('enable')} />
          ) : (
            <View style={styles.buttonGroup}>
              <SecondaryButton disabled={busy} label={copy.changePin} onPress={() => startFlow('change')} />
              <SecondaryButton disabled={busy} label={copy.lockNow} onPress={lockNow} />
              <DestructiveButton disabled={busy} label={copy.disableAppLock} onPress={() => startFlow('disable')} />
            </View>
          )}
        </Section>

        {flow ? (
          <Section title={flowTitle(copy, flow, config?.biometricUnlockEnabled ?? false)} theme={theme}>
            {(flow === 'change' || flow === 'biometric' || flow === 'disable') ? (
              <LabeledPin label={copy.currentPin} value={currentPin} onChange={setCurrentPin} onInvalid={() => setError(t.security.errors.pinNumbersOnly)} />
            ) : null}
            {(flow === 'enable' || flow === 'change') ? (
              <>
                <LabeledPin label={copy.newPin} value={newPin} onChange={setNewPin} onInvalid={() => setError(t.security.errors.pinNumbersOnly)} />
                <LabeledPin label={copy.confirmNewPin} value={confirmation} onChange={setConfirmation} onInvalid={() => setError(t.security.errors.pinNumbersOnly)} />
              </>
            ) : null}
            <View style={styles.inlineActions}>
              <SecondaryButton disabled={busy} label={t.common.cancel} onPress={closeFlow} />
              <PrimaryButton
                busy={busy}
                disabled={busy}
                label={flowSubmitLabel(copy, flow, config?.biometricUnlockEnabled ?? false)}
                onPress={() => {
                  if (flow === 'enable') void submitEnable();
                  if (flow === 'change') void submitChange();
                  if (flow === 'biometric') void submitBiometric();
                  if (flow === 'disable') confirmDisable();
                }}
              />
            </View>
          </Section>
        ) : null}

        <Section title={copy.biometricsSection} theme={theme}>
          <StatusRow label={copy.unlockPreference} value={config?.biometricUnlockEnabled ? copy.enabled : copy.disabled} theme={theme} />
          <Text style={[styles.body, { color: availabilityFailed ? theme.destructive : theme.secondaryText }]}>{availabilityFailed ? copy.statusCheckFailed : availabilityText(copy, availability)}</Text>
          <Text style={[styles.caption, { color: theme.mutedText }]}>{copy.biometricsRequirement}</Text>
          {enabled ? (
            <SecondaryButton
              disabled={busy || (!config?.biometricUnlockEnabled && availability?.status !== 'available')}
              label={config?.biometricUnlockEnabled ? copy.disableBiometricUnlock : copy.enableBiometricUnlock}
              onPress={() => startFlow('biometric')}
            />
          ) : null}
        </Section>

        {enabled && config ? (
          <Section title={copy.automaticLocking} theme={theme}>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{copy.lockAfter}</Text>
            <View accessibilityRole="radiogroup" style={styles.delayList}>
              {APP_LOCK_DELAYS.map((delay) => {
                const selected = config.lockDelayMs === delay;
                return (
                  <Pressable
                    key={delay}
                    accessibilityLabel={delayLabel(copy, delay)}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: selected, disabled: busy }}
                    disabled={busy}
                    onPress={() => void updateDelay(delay)}
                    style={[styles.delayRow, { backgroundColor: selected ? theme.tintPrimary : theme.elevatedSurface }]}>
                    <Text style={[styles.body, { color: theme.primaryText, fontFamily: selected ? fonts.sans.bold : fonts.sans.regular, fontWeight: selected ? '700' : '400' }]}>{delayLabel(copy, delay)}</Text>
                    {selected ? <SymbolView name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }} size={22} tintColor={theme.primaryAction} /> : null}
                  </Pressable>
                );
              })}
            </View>
          </Section>
        ) : null}

        <Section title={copy.privacySection} theme={theme}>
          {privacyError ? <Text accessibilityLiveRegion="polite" selectable style={[styles.body, { color: theme.warning }]}>{privacyError}</Text> : null}
          <Limit title={copy.localProtectionTitle} text={copy.localProtectionText} theme={theme} />
          <Limit title={copy.databaseTitle} text={copy.databaseText} theme={theme} />
          <Limit title={copy.backupsTitle} text={copy.backupsText} theme={theme} />
          <Limit title={copy.notificationsTitle} text={copy.notificationsText} theme={theme} />
        </Section>
      </ScrollView>
      <DialogHost dialog={dialog} />
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>;

function flowTitle(copy: Copy, flow: Exclude<Flow, null>, biometricEnabled: boolean): string {
  if (flow === 'enable') return copy.createPinTitle;
  if (flow === 'change') return copy.changePin;
  if (flow === 'disable') return copy.confirmToDisable;
  return biometricEnabled ? copy.confirmToDisableBiometrics : copy.confirmToEnableBiometrics;
}

function flowSubmitLabel(copy: Copy, flow: Exclude<Flow, null>, biometricEnabled: boolean): string {
  if (flow === 'enable') return copy.createAndEnable;
  if (flow === 'change') return copy.changePin;
  if (flow === 'disable') return copy.continue;
  return biometricEnabled ? copy.disableBiometrics : copy.continueToBiometricPrompt;
}

function Section({ children, theme, title }: { children: React.ReactNode; theme: Theme; title: string }) {
  return (
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      {children}
    </Card>
  );
}

function StatusRow({ label, theme, value }: { label: string; theme: Theme; value: string }) {
  return (
    <View style={styles.statusRow}>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.body, { color: theme.primaryText, fontFamily: fonts.sans.bold, fontWeight: '700' }]}>{value}</Text>
    </View>
  );
}

function LabeledPin({ label, onChange, onInvalid, value }: { label: string; onChange: (value: string) => void; onInvalid: () => void; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.pinField}>
      <Overline color={theme.mutedText}>{label}</Overline>
      <PinInput accessibilityLabel={label} onChange={onChange} onInvalidInput={onInvalid} value={value} />
    </View>
  );
}

function Limit({ text, theme, title }: { text: string; theme: Theme; title: string }) {
  return (
    <View style={[styles.limit, { borderTopColor: theme.hairline }]}>
      <Text style={[styles.label, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ busy = false, disabled, label, onPress }: { busy?: boolean; disabled: boolean; label: string; onPress: () => void }) {
  return <Button busy={busy} disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" variant="primary" />;
}

function SecondaryButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return <Button disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" variant="tonal" />;
}

function DestructiveButton({ disabled, label, onPress }: { disabled: boolean; label: string; onPress: () => void }) {
  return <Button disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" variant="destructive" />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, paddingHorizontal: spacing.md },
  feedback: { ...typography.caption, borderRadius: borderRadii.md, padding: spacing.md },
  card: { gap: spacing.md },
  sectionTitle: { ...typography.sectionTitle },
  body: { ...typography.body },
  caption: { ...typography.caption },
  label: { ...typography.captionStrong },
  statusRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  buttonGroup: { gap: spacing.sm },
  pinField: { gap: spacing.sm },
  inlineActions: { gap: spacing.sm },
  delayList: { gap: spacing.sm },
  delayRow: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md },
  limit: { borderTopWidth: StyleSheet.hairlineWidth, gap: spacing.xs, paddingTop: spacing.md },
});
