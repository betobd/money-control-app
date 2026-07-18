import { createContext, use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  StyleSheet,
  View,
} from 'react-native';

import { useAppTheme } from '@/hooks/use-app-theme';
import { AppLockActionError } from './app-lock.service';
import { AppLockTiming } from './app-lock-timing';
import type {
  AppLockConfigV1,
  AppLockDelay,
  AppLockState,
  BiometricAvailability,
} from './app-lock.types';
import { appLockService, privacyProtectionService } from './app-locks';
import { PinValidationError } from './pin-verification.service';

type AppLockContextValue = {
  state: AppLockState;
  config: AppLockConfigV1 | null;
  privacyError: string | null;
  sensitiveInputResetToken: number;
  retryConfiguration: () => Promise<void>;
  unlockWithPin: (pin: string) => Promise<void>;
  unlockWithBiometrics: () => Promise<void>;
  lockNow: () => void;
  enableAppLock: (pin: string, confirmation: string) => Promise<void>;
  changePin: (currentPin: string, newPin: string, confirmation: string) => Promise<void>;
  disableAppLock: (currentPin: string) => Promise<void>;
  setBiometricEnabled: (currentPin: string, enabled: boolean) => Promise<void>;
  setLockDelay: (delay: AppLockDelay) => Promise<void>;
  getBiometricAvailability: () => Promise<BiometricAvailability>;
};

const AppLockContext = createContext<AppLockContextValue | null>(null);

function monotonicNow(): number | null {
  return typeof performance !== 'undefined' && Number.isFinite(performance.now())
    ? performance.now()
    : null;
}

function safeConfigurationMessage(): string {
  return 'Money Control could not read its secure App Lock configuration. Protected financial content remains hidden. Retry, or use Forgot PIN help if the problem persists.';
}

export function AppLockProvider({ children }: { children: React.ReactNode }) {
  const [state, setStateValue] = useState<AppLockState>({ status: 'loading' });
  const [config, setConfigValue] = useState<AppLockConfigV1 | null>(null);
  const [privacyError, setPrivacyError] = useState<string | null>(null);
  const [privacyOverlayVisible, setPrivacyOverlayVisible] = useState(false);
  const [sensitiveInputResetToken, setSensitiveInputResetToken] = useState(0);
  const stateRef = useRef(state);
  const configRef = useRef(config);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState ?? 'active');
  const timingRef = useRef(new AppLockTiming());
  const theme = useAppTheme();

  const setState = useCallback((next: AppLockState) => {
    stateRef.current = next;
    setStateValue(next);
  }, []);

  const setConfig = useCallback((next: AppLockConfigV1 | null) => {
    configRef.current = next;
    setConfigValue(next);
  }, []);

  const loadConfiguration = useCallback(async () => {
    setState({ status: 'loading' });
    try {
      const loaded = await appLockService.load();
      if (loaded.status === 'disabled') {
        setConfig(null);
        setState({ status: 'disabled' });
        return;
      }
      setConfig(loaded.config);
      if (loaded.lockoutUntilEpochMs !== null) {
        setState({ status: 'temporarilyLocked', untilEpochMs: loaded.lockoutUntilEpochMs });
      } else {
        setState({ status: 'locked' });
      }
    } catch {
      setConfig(null);
      setState({ status: 'configurationError', message: safeConfigurationMessage() });
    }
  }, [setConfig, setState]);

  useEffect(() => {
    const timer = setTimeout(() => void loadConfiguration(), 0);
    return () => clearTimeout(timer);
  }, [loadConfiguration]);

  useEffect(() => {
    let cancelled = false;
    const updatePrivacyProtection = async () => {
      try {
        if (state.status !== 'disabled') {
          const enabled = await privacyProtectionService.enable();
          if (!cancelled) {
            setPrivacyError(enabled ? null : 'Screen-capture protection is unavailable on this device.');
          }
        } else {
          await privacyProtectionService.disable();
          if (!cancelled) setPrivacyError(null);
        }
      } catch {
        if (!cancelled) {
          setPrivacyError('Screen-capture protection could not be applied. App Lock remains enabled.');
        }
      }
    };
    void updatePrivacyProtection();
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  useEffect(() => {
    const onChange = (next: AppStateStatus) => {
      const previous = appStateRef.current;
      appStateRef.current = next;
      const activeConfig = configRef.current?.status === 'active' ? configRef.current : null;

      if (previous === 'active' && next !== 'active') {
        setSensitiveInputResetToken((value) => value + 1);
        if (activeConfig) {
          timingRef.current.recordBackground(monotonicNow(), Date.now());
          setPrivacyOverlayVisible(true);
          if (activeConfig.lockDelayMs === 0) setState({ status: 'locked' });
        }
        return;
      }

      if (next === 'active') {
        const mustLock = Boolean(
          activeConfig
          && stateRef.current.status === 'unlocked'
          && timingRef.current.shouldLockOnActive(activeConfig.lockDelayMs, monotonicNow(), Date.now())
        );
        if (mustLock) {
          setState({ status: 'locked' });
          requestAnimationFrame(() => setPrivacyOverlayVisible(false));
          return;
        } else if (!activeConfig || stateRef.current.status !== 'unlocked') {
          timingRef.current.clear();
        }
        setPrivacyOverlayVisible(false);
      }
    };

    const changeSubscription = AppState.addEventListener('change', onChange);
    const blurSubscription = AppState.addEventListener('blur', () => {
      if (configRef.current?.status === 'active') setPrivacyOverlayVisible(true);
    });
    const focusSubscription = AppState.addEventListener('focus', () => {
      if (appStateRef.current === 'active') setPrivacyOverlayVisible(false);
    });
    return () => {
      changeSubscription.remove();
      blurSubscription.remove();
      focusSubscription.remove();
    };
  }, [setState]);

  useEffect(() => {
    if (state.status !== 'temporarilyLocked') return;
    const delay = Math.max(0, state.untilEpochMs - Date.now());
    const timer = setTimeout(() => {
      void appLockService.load().then((loaded) => {
        if (loaded.status === 'enabled') setState({ status: 'locked' });
      }).catch(() => setState({ status: 'configurationError', message: safeConfigurationMessage() }));
    }, Math.min(delay + 50, 300_050));
    return () => clearTimeout(timer);
  }, [setState, state]);

  const unlockWithPin = useCallback(async (pin: string) => {
    if (!['locked', 'temporarilyLocked'].includes(stateRef.current.status)) return;
    setState({ status: 'authenticating' });
    try {
      const result = await appLockService.verifyPin(pin);
      if (result.status === 'verified') {
        timingRef.current.clear();
        setState({ status: 'unlocked' });
      } else if (result.status === 'incorrect') {
        setState({
          status: 'locked',
          message: `Incorrect PIN. ${result.attemptsRemaining} attempt${result.attemptsRemaining === 1 ? '' : 's'} remaining before a temporary delay.`,
        });
      } else {
        setState({ status: 'temporarilyLocked', untilEpochMs: result.untilEpochMs });
      }
    } catch (error) {
      if (error instanceof PinValidationError) {
        setState({ status: 'locked', message: error.message });
      } else {
        setState({ status: 'configurationError', message: safeConfigurationMessage() });
      }
    }
  }, [setState]);

  const unlockWithBiometrics = useCallback(async () => {
    if (stateRef.current.status !== 'locked') return;
    setState({ status: 'authenticating' });
    try {
      const result = await appLockService.authenticateWithBiometrics();
      if (result.status === 'success') {
        timingRef.current.clear();
        setState({ status: 'unlocked' });
      } else if (result.status === 'cancelled') {
        setState({ status: 'locked' });
      } else if (result.status === 'temporarilyLocked') {
        setState({ status: 'locked', message: 'Device biometrics are temporarily locked. Use your Money Control PIN.' });
      } else if (result.status === 'unavailable') {
        const loaded = await appLockService.load();
        if (loaded.status === 'enabled') setConfig(loaded.config);
        setState({ status: 'locked', message: 'Biometric unlock is unavailable. Use your Money Control PIN.' });
      } else {
        setState({ status: 'locked', message: 'Biometric authentication was not successful. Use your PIN or try again.' });
      }
    } catch {
      setState({ status: 'locked', message: 'Biometric authentication could not be started. Use your PIN.' });
    }
  }, [setConfig, setState]);

  const lockNow = useCallback(() => {
    if (configRef.current?.status !== 'active') return;
    setSensitiveInputResetToken((value) => value + 1);
    setState({ status: 'locked' });
  }, [setState]);

  const enableAppLock = useCallback(async (pin: string, confirmation: string) => {
    const next = await appLockService.enable(pin, confirmation);
    setConfig(next);
    timingRef.current.clear();
    setState({ status: 'unlocked' });
  }, [setConfig, setState]);

  const changePin = useCallback(async (currentPin: string, newPin: string, confirmation: string) => {
    await appLockService.changePin(currentPin, newPin, confirmation);
  }, []);

  const disableAppLock = useCallback(async (currentPin: string) => {
    try {
      await appLockService.disable(currentPin);
      setConfig(null);
      setState({ status: 'disabled' });
    } catch (error) {
      if (
        error instanceof PinValidationError
        || (error instanceof AppLockActionError
          && (error.code === 'incorrect_pin' || error.code === 'temporarily_locked'))
      ) {
        throw error;
      }
      setConfig(null);
      setState({ status: 'configurationError', message: safeConfigurationMessage() });
      throw error;
    }
  }, [setConfig, setState]);

  const setBiometricEnabled = useCallback(async (currentPin: string, enabled: boolean) => {
    const next = await appLockService.setBiometricEnabled(currentPin, enabled);
    setConfig(next);
  }, [setConfig]);

  const setLockDelay = useCallback(async (delay: AppLockDelay) => {
    const next = await appLockService.setLockDelay(delay);
    setConfig(next);
  }, [setConfig]);

  const value = useMemo<AppLockContextValue>(() => ({
    state,
    config,
    privacyError,
    sensitiveInputResetToken,
    retryConfiguration: loadConfiguration,
    unlockWithPin,
    unlockWithBiometrics,
    lockNow,
    enableAppLock,
    changePin,
    disableAppLock,
    setBiometricEnabled,
    setLockDelay,
    getBiometricAvailability: () => appLockService.getBiometricAvailability(),
  }), [
    changePin,
    config,
    disableAppLock,
    enableAppLock,
    loadConfiguration,
    lockNow,
    privacyError,
    sensitiveInputResetToken,
    setBiometricEnabled,
    setLockDelay,
    state,
    unlockWithBiometrics,
    unlockWithPin,
  ]);

  return (
    <AppLockContext value={value}>
      <View style={styles.fill}>
        {children}
        {privacyOverlayVisible ? (
          <View
            accessibilityElementsHidden
            importantForAccessibility="no-hide-descendants"
            style={[StyleSheet.absoluteFill, { backgroundColor: theme.appBackground }]}
          />
        ) : null}
      </View>
    </AppLockContext>
  );
}

export function useAppLock(): AppLockContextValue {
  const value = use(AppLockContext);
  if (!value) throw new Error('useAppLock must be used inside AppLockProvider.');
  return value;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
