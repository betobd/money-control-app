import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppLock } from '@/features/security/app-lock-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { NotificationCategory } from '../notification-settings.service';
import type { NotificationPermissionState } from '../notification.types';
import { useNotificationSettings } from '../use-notification-settings';

export function NotificationSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const appLock = useAppLock();
  const model = useNotificationSettings();
  const [timePicker, setTimePicker] = useState<'recurring' | 'daily' | null>(null);

  useEffect(() => {
    if (model.error) AccessibilityInfo.announceForAccessibility(model.error);
    else if (model.result) AccessibilityInfo.announceForAccessibility(model.result);
  }, [model.error, model.result]);

  function changeCategory(category: NotificationCategory, enabled: boolean) {
    if (!enabled || model.permission === 'granted') {
      void model.setCategory(category, enabled);
      return;
    }
    Alert.alert(
      'Allow local reminders?',
      'Money Control uses Android notifications only for the reminder categories you choose. No financial data leaves this device.',
      [
        { text: 'Not now', style: 'cancel' },
        { text: 'Continue', onPress: () => void model.setCategory(category, true) },
      ],
    );
  }

  if (model.loading || !model.settings) {
    return <View accessibilityLabel="Loading notification settings" style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} size="large" /></View>;
  }
  const settings = model.settings;
  const appLockEnabled = appLock.config?.status === 'active';

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <Pressable accessibilityLabel="Back from notification settings" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Notifications</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Section title="Android permission">
          <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{permissionTitle(model.permission)}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{permissionDescription(model.permission)}</Text>
            {model.permission !== 'granted' ? (
              <ActionButton disabled={model.busy} label={model.permission === 'denied-permanent' ? 'Open Android settings' : 'Enable notifications'} onPress={() => {
                if (model.permission === 'denied-permanent') void model.openSettings();
                else Alert.alert('Enable local reminders?', 'Android will ask whether Money Control may show the reminders you choose.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Continue', onPress: () => void model.enable() },
                ]);
              }} primary theme={theme} />
            ) : settings.notificationsEnabled ? (
              <ActionButton disabled={model.busy} label="Pause all reminders" onPress={() => void model.disable()} theme={theme} />
            ) : (
              <ActionButton disabled={model.busy} label="Resume notifications" onPress={() => void model.enable()} primary theme={theme} />
            )}
          </View>
        </Section>

        <Section title="Reminder categories">
          <SettingToggle description="Due, overdue, and upcoming recurring items" disabled={model.busy} label="Recurring transactions" onChange={(value) => changeCategory('recurring', value)} theme={theme} value={settings.recurringRemindersEnabled} />
          {settings.recurringRemindersEnabled ? (
            <View style={styles.options}>
              <ValueButton label="Reminder time" onPress={() => setTimePicker('recurring')} theme={theme} value={settings.recurringReminderTime} />
              <Text style={[styles.optionLabel, { color: theme.secondaryText }]}>Advance notice</Text>
              <View accessibilityRole="radiogroup" style={styles.segmented}>
                {([0, 1, 2, 3] as const).map((days) => <Segment key={days} label={days === 0 ? 'Same day' : `${days} day${days === 1 ? '' : 's'}`} onPress={() => void model.setAdvanceDays(days)} selected={settings.recurringAdvanceDays === days} theme={theme} />)}
              </View>
            </View>
          ) : null}
          <SettingToggle description="One alert near 80% and one at 100%" disabled={model.busy} label="Budget thresholds" onChange={(value) => changeCategory('budgets', value)} theme={theme} value={settings.budgetAlertsEnabled} />
          <SettingToggle description="A quiet daily prompt to review your finances" disabled={model.busy} label="Daily review" onChange={(value) => changeCategory('daily', value)} theme={theme} value={settings.dailyReminderEnabled} />
          {settings.dailyReminderEnabled ? <ValueButton label="Daily reminder time" onPress={() => setTimePicker('daily')} theme={theme} value={settings.dailyReminderTime} /> : null}
        </Section>

        <Section title="Notification privacy">
          <View style={styles.segmented} accessibilityRole="radiogroup">
            <Segment label="Private" onPress={() => void model.setContentMode('private')} selected={settings.notificationContentMode === 'private'} theme={theme} />
            <Segment label="Detailed" onPress={() => void model.setContentMode('detailed')} selected={settings.notificationContentMode === 'detailed'} theme={theme} />
          </View>
          <Text style={[styles.body, { color: theme.secondaryText }]}>Private hides amounts, accounts, categories, balances, and notes. Detailed may show a category and amount, but never notes or full account details.</Text>
          {appLockEnabled && settings.notificationContentMode === 'detailed' ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.warning }]}>App Lock is enabled. Private notification content is recommended for lock-screen privacy.</Text> : null}
        </Section>

        <Section title="Test and delivery">
          <View style={styles.actions}>
            <ActionButton disabled={model.busy || model.permission !== 'granted'} label="Send test notification" onPress={() => void model.test()} primary theme={theme} />
            <ActionButton disabled={model.busy} label="Cancel pending test" onPress={() => void model.cancelTest()} theme={theme} />
          </View>
          <Text style={[styles.body, { color: theme.secondaryText }]}>Reminder times follow the device’s local clock. Recurring financial dates remain Bogotá calendar dates. Android may delay delivery during Doze or battery optimization.</Text>
        </Section>

        {settings.lastErrorCode ? (
          <View style={[styles.errorCard, { backgroundColor: theme.surface, borderColor: theme.destructive }]}>
            <Text accessibilityLiveRegion="assertive" style={[styles.cardTitle, { color: theme.destructive }]}>Some reminders need attention</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>Money Control could not finish the last notification update. Financial data was saved normally.</Text>
            <ActionButton disabled={model.busy} label="Dismiss message" onPress={() => void model.clearError()} theme={theme} />
          </View>
        ) : null}
        {model.error ? <Text accessibilityLiveRegion="assertive" style={[styles.notice, { color: theme.destructive }]}>{model.error}</Text> : null}
        {model.result ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.income }]}>{model.result}</Text> : null}
      </ScrollView>

      <TimePickerModal
        key={`${timePicker ?? 'closed'}-${timePicker === 'daily' ? settings.dailyReminderTime : settings.recurringReminderTime}`}
        initialValue={timePicker === 'daily' ? settings.dailyReminderTime : settings.recurringReminderTime}
        onClose={() => setTimePicker(null)}
        onSave={(value) => {
          if (timePicker === 'daily') void model.setDailyTime(value);
          else if (timePicker === 'recurring') void model.setRecurringTime(value);
          setTimePicker(null);
        }}
        theme={theme}
        visible={timePicker !== null}
      />
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = useAppTheme();
  return <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>{children}</View>;
}

type Theme = ReturnType<typeof useAppTheme>;

function SettingToggle({ description, disabled, label, onChange, theme, value }: { description: string; disabled: boolean; label: string; onChange: (value: boolean) => void; theme: Theme; value: boolean }) {
  return <View style={[styles.toggleRow, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={styles.flex}><Text style={[styles.cardTitle, { color: theme.primaryText }]}>{label}</Text><Text style={[styles.caption, { color: theme.secondaryText }]}>{description}</Text></View><Switch accessibilityLabel={label} disabled={disabled} onValueChange={onChange} thumbColor={value ? theme.primaryAction : undefined} value={value} /></View>;
}

function ValueButton({ label, onPress, theme, value }: { label: string; onPress: () => void; theme: Theme; value: string }) {
  return <Pressable accessibilityHint={`Current value ${value}`} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[styles.valueButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Text style={[styles.body, { color: theme.primaryText }]}>{label}</Text><Text style={[styles.cardTitle, { color: theme.primaryAction }]}>{value}</Text></Pressable>;
}

function Segment({ label, onPress, selected, theme }: { label: string; onPress: () => void; selected: boolean; theme: Theme }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.segment, { backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface, borderColor: selected ? theme.primaryAction : theme.border }]}><Text style={[styles.caption, { color: selected ? theme.selectedNavigationForeground : theme.secondaryText }]}>{label}</Text></Pressable>;
}

function ActionButton({ disabled, label, onPress, primary = false, theme }: { disabled: boolean; label: string; onPress: () => void; primary?: boolean; theme: Theme }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[styles.actionButton, { backgroundColor: disabled ? theme.disabledSurface : primary ? theme.primaryAction : theme.surface, borderColor: primary ? theme.primaryAction : theme.border }]}><Text style={[styles.actionLabel, { color: disabled ? theme.disabledText : primary ? theme.onPrimaryAction : theme.primaryText }]}>{label}</Text></Pressable>;
}

function TimePickerModal({ initialValue, onClose, onSave, theme, visible }: { initialValue: string; onClose: () => void; onSave: (value: string) => void; theme: Theme; visible: boolean }) {
  const [initialHour, initialMinute] = initialValue.split(':').map(Number);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(Math.round(initialMinute / 5) * 5 % 60);
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={styles.modalBackdrop}><View style={[styles.modal, { backgroundColor: theme.appBackground }]}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>Choose local time</Text><Text style={[styles.optionLabel, { color: theme.secondaryText }]}>Hour</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>{Array.from({ length: 24 }, (_, value) => <Segment key={value} label={String(value).padStart(2, '0')} onPress={() => setHour(value)} selected={hour === value} theme={theme} />)}</ScrollView><Text style={[styles.optionLabel, { color: theme.secondaryText }]}>Minute</Text><View style={styles.pickerRow}>{Array.from({ length: 12 }, (_, index) => index * 5).map((value) => <Segment key={value} label={String(value).padStart(2, '0')} onPress={() => setMinute(value)} selected={minute === value} theme={theme} />)}</View><View style={styles.actions}><ActionButton disabled={false} label="Cancel" onPress={onClose} theme={theme} /><ActionButton disabled={false} label={`Save ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`} onPress={() => onSave(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)} primary theme={theme} /></View></View></View></Modal>;
}

function permissionTitle(value: NotificationPermissionState): string {
  if (value === 'granted') return 'Allowed by Android';
  if (value === 'denied-permanent') return 'Blocked in Android settings';
  if (value === 'denied-requestable') return 'Permission denied';
  if (value === 'unavailable') return 'Notifications unavailable';
  return 'Not enabled yet';
}

function permissionDescription(value: NotificationPermissionState): string {
  if (value === 'granted') return 'Android can show the local reminder categories you enable below.';
  if (value === 'denied-permanent') return 'Open Android settings to allow notifications. Money Control continues to work normally.';
  if (value === 'denied-requestable') return 'You can try again when you are ready. No reminder permission is required to use the app.';
  if (value === 'unavailable') return 'This runtime cannot schedule Android notifications. Financial features are unaffected.';
  return 'Money Control will ask only after you choose to enable local reminders.';
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm }, headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, title: { ...typography.sectionTitle, flex: 1, fontSize: 22, textAlign: 'center' }, content: { gap: spacing.lg, padding: spacing.md }, section: { gap: spacing.sm }, sectionTitle: { ...typography.sectionTitle }, card: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md }, cardTitle: { ...typography.body, fontWeight: '700' }, body: { ...typography.body }, caption: { ...typography.caption }, notice: { ...typography.caption, fontWeight: '600' }, toggleRow: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.md, minHeight: 72, padding: spacing.md }, flex: { flex: 1 }, options: { gap: spacing.sm, paddingLeft: spacing.md }, valueButton: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md }, optionLabel: { ...typography.label, textTransform: 'uppercase' }, segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, segment: { alignItems: 'center', borderRadius: borderRadii.full, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, minWidth: 56, paddingHorizontal: spacing.md }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, actionButton: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md }, actionLabel: { ...typography.body, fontWeight: '700' }, errorCard: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md }, modalBackdrop: { backgroundColor: 'rgba(0,0,0,0.55)', flex: 1, justifyContent: 'flex-end' }, modal: { borderTopLeftRadius: borderRadii.lg, borderTopRightRadius: borderRadii.lg, gap: spacing.md, maxHeight: '80%', padding: spacing.lg }, pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
