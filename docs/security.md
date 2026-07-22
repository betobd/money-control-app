# Money Control — Local App Lock

## Scope and security boundary

App Lock is an optional, device-local interface lock under **More → Security** at `/security`. It is disabled by default and never adds a bottom-navigation item. Enabling it creates a six-digit numeric PIN. Strong device biometrics may then be enabled as a convenience; the Money Control PIN always remains an independent fallback.

This feature protects casual access to rendered application content. It is not a user account, remote authentication system, replacement for Android device security, database encryption mechanism, or backup encryption mechanism. The SQLite database remains plaintext inside the application sandbox. Version 1 exported JSON backups remain plaintext and readable outside Money Control.

## Startup and navigation gate

`AppLockProvider` loads only SecureStore-backed security records at startup. `AppLockBoundary` renders an opaque loading, locked, temporary-lockout, or configuration-error surface until security state is known. The database migration module and Expo Router financial stack are mounted only when App Lock is disabled or the current cold-start session has unlocked successfully.

This ordering prevents Home, balances, transaction values, reports, recurring flows, and the tab bar from rendering behind the gate. Android back is consumed while gated. Because the protected stack is absent, deep links cannot mount financial routes while locked; Expo Router retains initial navigation until the stack mounts. PIN values and pending navigation are never written into persisted navigation state.

A SecureStore read error, unsupported record version, corrupt record, or enabled configuration with no verifier produces a fail-closed configuration error. These conditions are never interpreted as disabled App Lock.

## Native dependencies and runtime

The verified installed versions are:

- `expo@57.0.7`
- `react-native-quick-crypto@1.1.6`
- `react-native-nitro-modules@0.36.1` and `react-native-quick-base64@3.0.1` (QuickCrypto runtime dependencies)
- `expo-build-properties@57.0.6`
- `expo-dev-client@57.0.7`
- `expo-crypto@57.0.1`
- `expo-device@57.0.1`
- `expo-local-authentication@57.0.1`
- `expo-screen-capture@57.0.1`
- `expo-secure-store@57.0.1`

`@noble/hashes` is not installed. App Lock imports native PBKDF2 and `timingSafeEqual` directly from QuickCrypto, and has no JavaScript, Noble, or reduced-iteration compatibility fallback.

## PIN policy and verifier

- Exactly six numeric digits.
- New and changed PINs require confirmation.
- PIN input uses native secure text entry, numeric keyboard hints, disabled copy/paste context menus, and disabled autofill where supported.
- Component state is cleared after submission, failure, cancellation, navigation/unmount, and application backgrounding.
- Byte buffers are overwritten after derivation on a best-effort basis. JavaScript strings and garbage-collected memory cannot be guaranteed to be scrubbed.

The stored verifier format is version 1:

```json
{
  "version": 1,
  "algorithm": "PBKDF2-HMAC-SHA256",
  "iterations": 600000,
  "saltHex": "<16 cryptographically random bytes as lowercase hex>",
  "derivedKeyHex": "<32 derived bytes as lowercase hex>",
  "derivedKeyLength": 32
}
```

Salt generation uses `expo-crypto.getRandomBytesAsync`. Derivation uses `react-native-quick-crypto`'s native PBKDF2 implementation with an explicit SHA-256 digest. Verification uses its native `timingSafeEqual` implementation after validating equal-length 32-byte results. The application has no JavaScript KDF fallback: when the native crypto module is unavailable and App Lock is enabled, startup fails closed at the configuration-error gate.

The PIN itself is never stored, encrypted for recovery, logged, emitted through financial invalidation, or placed in SQLite. The iteration count and complete algorithm parameters live in the versioned record so a future verifier version can upgrade them explicitly.

The six-digit input space remains small if an attacker fully compromises the device and extracts usable SecureStore contents. PBKDF2 and Android Keystore-backed SecureStore raise attack cost but do not turn a local PIN into protection against a rooted or instrumented device.

### Android PBKDF2 performance

Native measurements were collected on the `Pixel_8` Android Virtual Device: Android 16/API 36, reported model `sdk_gphone64_x86_64`, primary ABI `x86_64` (supported ABI list `x86_64, arm64-v8a`), in a debuggable Android development build. Expo Go was not used. Each row used a newly force-stopped application process and a fresh Metro process with the requested environment value; the first derivation in that process is the cold value. Times are milliseconds.

| Iterations | Cold | Warm 1 | Warm 2 | Warm 3 | Warm 4 | Warm 5 | Warm median | Warm min–max | Event loop / UI |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 100,000 | 53.6 | 23.7 | 18.8 | 15.9 | 17.5 | 15.1 | 17.5 | 15.1–23.7 | Harness passed; ticks continued and maximum gap was 34.5 ms. |
| 300,000 | 197.9 | 85.6 | 73.6 | 85.8 | 62.3 | 72.2 | 73.6 | 62.3–85.8 | Ticks continued, but strict aggregate flag failed: cold gap 434.4 ms and first-warm gap 135.7 ms; later warm gaps were 33.3–36.3 ms. |
| 600,000 | 185.4 | 118.0 | 85.3 | 115.0 | 124.7 | 89.3 | 115.0 | 85.3–124.7 | Ticks continued, but strict aggregate flag failed: cold gap 310.6 ms and first-warm gap 178.1 ms; later warm gaps were 33.6–37.3 ms. No visible unlock freeze was observed. |
| 900,000 | 450.5 | 224.4 | 197.7 | 135.7 | 165.9 | 143.6 | 165.9 | 135.7–224.4 | Ticks continued, but strict aggregate flag failed: cold gap 603.0 ms and first-warm gap 333.8 ms; later warm gaps were 33.6–36.1 ms. |

The strict `uiResponsive` result requires every cold and warm measurement to record event-loop ticks and remain below a 100 ms maximum scheduling gap. The false aggregate results above were caused by emulator startup/first-warm scheduling contention, not a fully blocked event loop: every derivation recorded ticks, and steady warm gaps remained near 34–37 ms. Debug-emulator values are not substitutes for a physical mid-range result.

The native adapter passed these PBKDF2-HMAC-SHA256 vectors in every isolated benchmark process, with a 32-byte output:

| Password | Salt | Iterations | Expected derived key | Native result |
| --- | --- | ---: | --- | --- |
| `password` | `salt` | 1 | `120fb6cffcf8b32c43e7225256c4f837a86548c92ccc35480805987cb70be17b` | Pass |
| `password` | `salt` | 2 | `ae4d0c95af6b46d32d0adff928f06dd02a303f8ef3c251dfd6e2d85a95474c43` | Pass |
| `password` | `salt` | 4,096 | `c5e478d59288c841aa530db6845c4c8d962893a001ce4e11a4963873aa98134a` | Pass |

Native `timingSafeEqual` returned true for equal byte arrays and false for an equal-length mismatch in every process. Any vector or comparison self-test failure aborts the benchmark instead of producing a successful result.

**Iteration recommendation:** retain the version 1 default of 600,000. Its emulator warm median was 115.0 ms, warm maximum was 124.7 ms, and isolated-process cold value was 185.4 ms, all comfortably below the one-second acceptable ceiling and the 1.5-second review threshold. The persisted default was not changed during benchmarking. Physical mid-range Android benchmarking remains required before treating emulator performance as representative of production devices.

Because App Lock now requires a third-party native module, Expo Go cannot exercise the complete feature. Generate and run the Android development build with:

```powershell
npx expo prebuild --platform android --clean
npx expo run:android --variant debug --device Pixel_8
npx expo start --dev-client
```

The generated `android` directory is disposable and ignored in this project. Native dependency or app-configuration changes require rebuilding the development client; JavaScript-only changes can use the existing client and Metro server.

## SecureStore records and update safety

Versioned internal keys are:

- `money_control_app_lock_config_v1`
- `money_control_pin_verifier_v1`
- `money_control_pin_verifier_pending_v1`
- `money_control_app_lock_attempts_v1`

The active configuration record contains only version, transition status, biometric preference, and lock delay. Enabling writes the verifier first and configuration last; configuration is the commit record. A failed configuration write removes the orphan verifier where possible and does not enable App Lock.

PIN replacement stages a complete new verifier, replaces the primary record, then deletes the staged record. A process interruption can resume the already-authorized staged replacement on the next load. Explicit write failures remove the stage and retain the previous primary verifier.

Disabling requires the current PIN, writes a fail-closed `disabling` transition, removes verifier/attempt records, and removes configuration last. Startup resumes an interrupted approved disable. A cleanup error remains a blocking configuration error instead of presenting a misleading disabled state.

The PIN verifier does not use SecureStore `requireAuthentication`, so changes to biometric enrollment cannot invalidate or remove the independent PIN fallback.

## Biometrics

`BiometricService` checks hardware, enrollment, reported types, and enrolled security level through Expo LocalAuthentication. Android must report `BIOMETRIC_STRONG`; weak camera-only facial authentication is not accepted. UI labels use generic device biometric terms rather than claiming Face ID on Android.

Enabling or disabling biometric unlock requires the current Money Control PIN. Enablement also requires a successful system biometric prompt. Authentication disables device-passcode fallback so the fallback remains the app's own PIN. Cancellation, ordinary failure, platform lockout, and permanent unavailability are distinct service results. Only one prompt may be active at a time.

Availability is checked before every biometric unlock. Removed enrollment, unavailable hardware, or a security-level downgrade disables only the biometric preference and continues to offer the PIN. Expo LocalAuthentication does not expose a stable identifier for every same-class enrollment change, such as adding another strong fingerprint; this platform limitation does not affect PIN fallback.

## Automatic and manual locking

Available delays are Immediately, 30 seconds, 1 minute, 5 minutes, and 15 minutes. `AppState` records the first transition away from active state. A surviving process compares monotonic `performance.now()` values; wall-clock time is a fail-closed fallback. A backward wall-clock transition locks rather than bypassing the delay. Every enabled cold launch begins locked, so process termination cannot preserve an unlocked session.

An opaque privacy overlay is installed before inactive/background snapshots. On return after the delay, the provider changes to locked before removing the overlay. `Lock now` immediately clears sensitive input state and returns to the gate without changing financial or account data.

## Failed attempts

Five incorrect PIN attempts trigger 30 seconds. Further five-attempt cycles increase the delay to 60 seconds, 120 seconds, then a five-minute maximum. SecureStore persists attempt count, cycle level, start time, and deadline, so restarting does not clear the delay. A backward clock change rebases the full current delay rather than immediately bypassing it. Correct PIN authentication removes attempt state. Biometric results never change PIN attempt counts.

Client-side wall-clock lockout is a throttling deterrent, not a permanent access-control boundary. Advancing system time across process restarts cannot be made tamper-proof without trusted server time or a platform monotonic value that survives process death. No failure wipes or permanently destroys financial data.

## Forgotten PIN

Money Control has no recovery server and cannot recover an existing PIN. No partial in-app reset is implemented because SecureStore and SQLite cannot be erased atomically together. **Help / Forgot PIN** provides two warnings, then opens Android app settings. The user may deliberately clear all app storage through Android, which removes app-private SQLite, SecureStore, and cache state. Exported backups in Downloads, Drive, or other external providers remain untouched and may be restored afterward.

## Screenshot, recent-app, notification, and backup privacy

While App Lock is enabled, Expo ScreenCapture applies Android `FLAG_SECURE` to prevent normal screenshots/screen recordings and show a blank recent-app preview. An opaque AppState overlay is additional defense during inactive transitions. A ScreenCapture failure is reported without disabling the underlying lock. Platform and vendor limitations mean this does not prevent every rooted-device, overlay, external-camera, or older-Android capture technique.

Local financial notifications are implemented as a separate preference under More. Private content is the default and is recommended while App Lock is enabled, but App Lock never overwrites the saved notification content choice. The notification runtime and financial tap resolver are mounted only inside the unlocked App Lock/database boundary. Previously scheduled Android notifications may still appear while locked, but a tap cannot mount protected routes until unlock. See [notifications.md](notifications.md).

The logical backup type contains only financial collections. It has no security fields and never reads SecureStore. Restore replaces only SQLite-owned financial rows and cannot enable, disable, or change App Lock, biometric preference, verifier, or failed-attempt state. A backup contains no PIN, but its financial contents remain plaintext.

### Android development-build verification

The Pixel 8 Android 16 x86_64 development build verified disabled startup, enable, Lock now, correct and incorrect PIN handling, the persisted 30-second temporary lockout, cold-start locking, before-delay and after-delay foreground behavior, Android-back interception, change PIN, old-PIN rejection, new-PIN unlock, and PIN-required disable. A locked cold launch and a locked deep link both exposed only the opaque gate; no financial node appeared before unlock.

The generated backup contained only `accounts`, `categories`, `transactions`, `transactionSplits`, `budgets`, `recurringTransactions`, and `recurringOccurrences`. It contained no App Lock, biometric, salt, verifier, SecureStore, attempt, or lockout field. Restoring that backup completed successfully, left App Lock enabled, and left the SecureStore file hash unchanged.

Android reported the window `SECURE` flag while App Lock was enabled. A direct emulator screenshot of the unlocked financial application was completely black, and the Pixel Launcher Recents card showed a black protected preview. A `moneycontrolapp://transactions` deep link delivered while locked remained on the gate, Android Back did not dismiss it, and financial content was absent.

The emulator reported biometric hardware with no enrollment. No-enrollment behavior and continued PIN availability were verified. Successful biometric authentication, cancellation, biometric lockout, enrollment changes, screenshot/Recents behavior on vendor Android builds, and performance on a physical mid-range device remain pending physical-device verification.

## Persistence and invalidation

App Lock requires no financial schema change and no migration. Security services never execute SQL. Security changes publish only the dedicated App Lock settings event; lock, unlock, PIN, biometric, and delay operations do not publish financial-data invalidation.
