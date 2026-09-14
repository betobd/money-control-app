import { useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { useAppLock } from '@/features/security/app-lock-provider';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { NotificationCategory } from '../notification-settings.service';
import type { NotificationPermissionState } from '../notification.types';
import { useNotificationSettings } from '../use-notification-settings';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/button';
import type { Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';

export function NotificationSettingsScreen() {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const appLock = useAppLock();
  const model = useNotificationSettings();
  const t = useMessages();
  const copy = t.notifications.settings;
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
    dialog.confirm({
      title: copy.allowTitle,
      message: copy.allowMessage,
      confirmLabel: copy.continue,
      cancelLabel: copy.notNow,
      onConfirm: () => void model.setCategory(category, true),
    });
  }

  if (model.loading || !model.settings) {
    return <View accessibilityLabel={copy.loadingLabel} style={[styles.center, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} size="large" /></View>;
  }
  const settings = model.settings;
  const appLockEnabled = appLock.config?.status === 'active';

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" leadingAccessibilityLabel={copy.backLabel} title={copy.title} />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <Section title={copy.permissionSection}>
          <Card style={styles.card}>
            <Overline>{permissionTitle(copy, model.permission)}</Overline>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{permissionDescription(copy, model.permission)}</Text>
            {model.permission !== 'granted' ? (
              <ActionButton disabled={model.busy} label={model.permission === 'denied-permanent' ? copy.openAndroidSettings : copy.enableNotifications} onPress={() => {
                if (model.permission === 'denied-permanent') void model.openSettings();
                else dialog.confirm({
                  title: copy.enableTitle,
                  message: copy.enableMessage,
                  confirmLabel: copy.continue,
                  onConfirm: () => void model.enable(),
                });
              }} primary />
            ) : settings.notificationsEnabled ? (
              <ActionButton disabled={model.busy} label={copy.pauseAll} onPress={() => void model.disable()} />
            ) : (
              <ActionButton disabled={model.busy} label={copy.resume} onPress={() => void model.enable()} primary />
            )}
          </Card>
        </Section>

        <Section title={copy.categoriesSection}>
          <SettingToggle description={copy.recurringDescription} disabled={model.busy} label={copy.recurringLabel} onChange={(value) => changeCategory('recurring', value)} theme={theme} value={settings.recurringRemindersEnabled} />
          {settings.recurringRemindersEnabled ? (
            <View style={styles.options}>
              <ValueButton label={copy.reminderTime} onPress={() => setTimePicker('recurring')} theme={theme} value={settings.recurringReminderTime} />
              <Text style={[styles.optionLabel, { color: theme.secondaryText }]}>{copy.advanceNotice}</Text>
              <View accessibilityRole="radiogroup" style={styles.segmented}>
                {([0, 1, 2, 3] as const).map((days) => <Segment key={days} label={days === 0 ? copy.sameDay : copy.advanceDays(days)} onPress={() => void model.setAdvanceDays(days)} selected={settings.recurringAdvanceDays === days} theme={theme} />)}
              </View>
            </View>
          ) : null}
          <SettingToggle description={copy.budgetsDescription} disabled={model.busy} label={copy.budgetsLabel} onChange={(value) => changeCategory('budgets', value)} theme={theme} value={settings.budgetAlertsEnabled} />
          <SettingToggle description={copy.cardsDescription} disabled={model.busy} label={copy.cardsLabel} onChange={(value) => changeCategory('credit-cards', value)} theme={theme} value={settings.creditCardRemindersEnabled} />
          {settings.creditCardRemindersEnabled ? (
            <View style={styles.options}>
              <SettingToggle description={copy.closingDescription} disabled={model.busy} label={copy.closingLabel} onChange={(value) => void model.setCardClosing(value)} theme={theme} value={settings.creditCardClosingReminderEnabled} />
              <Text style={[styles.optionLabel, { color: theme.secondaryText }]}>{copy.paymentDueReminders}</Text>
              <SettingToggle description={copy.dueThreeDaysDescription} disabled={model.busy} label={copy.dueThreeDaysLabel} onChange={(value) => void model.setCardDueOffset(3, value)} theme={theme} value={settings.creditCardDueThreeDaysEnabled} />
              <SettingToggle description={copy.dueOneDayDescription} disabled={model.busy} label={copy.dueOneDayLabel} onChange={(value) => void model.setCardDueOffset(1, value)} theme={theme} value={settings.creditCardDueOneDayEnabled} />
              <SettingToggle description={copy.dueTodayDescription} disabled={model.busy} label={copy.dueTodayLabel} onChange={(value) => void model.setCardDueOffset(0, value)} theme={theme} value={settings.creditCardDueTodayEnabled} />
            </View>
          ) : null}
          <SettingToggle description={copy.dailyDescription} disabled={model.busy} label={copy.dailyLabel} onChange={(value) => changeCategory('daily', value)} theme={theme} value={settings.dailyReminderEnabled} />
          {settings.dailyReminderEnabled ? <ValueButton label={copy.dailyTime} onPress={() => setTimePicker('daily')} theme={theme} value={settings.dailyReminderTime} /> : null}
        </Section>

        <Section title={copy.privacySection}>
          <View style={styles.segmented} accessibilityRole="radiogroup">
            <Segment label={copy.private} onPress={() => void model.setContentMode('private')} selected={settings.notificationContentMode === 'private'} theme={theme} />
            <Segment label={copy.detailed} onPress={() => void model.setContentMode('detailed')} selected={settings.notificationContentMode === 'detailed'} theme={theme} />
          </View>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{copy.privacyDescription}</Text>
          {appLockEnabled && settings.notificationContentMode === 'detailed' ? <Text accessibilityLiveRegion="polite" style={[styles.notice, { color: theme.warning }]}>{copy.appLockWarning}</Text> : null}
        </Section>

        <Section title={copy.testSection}>
          <View style={styles.actions}>
            <ActionButton disabled={model.busy || model.permission !== 'granted'} label={copy.sendTest} onPress={() => void model.test()} primary />
            <ActionButton disabled={model.busy} label={copy.cancelTest} onPress={() => void model.cancelTest()} />
          </View>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{copy.deliveryDescription}</Text>
        </Section>

        {settings.lastErrorCode ? (
          <View style={[styles.errorCard, { backgroundColor: theme.tintDestructive }]}>
            <Text accessibilityLiveRegion="assertive" style={[styles.eyebrow, { color: theme.destructive }]}>{copy.attentionTitle}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{copy.attentionBody}</Text>
            <ActionButton disabled={model.busy} label={copy.dismissMessage} onPress={() => void model.clearError()} />
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
      <DialogHost dialog={dialog} />
    </View>
  );
}

function Section({ children, title }: { children: React.ReactNode; title: string }) {
  const theme = useAppTheme();
  return <View style={styles.section}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>{children}</View>;
}

type Theme = ReturnType<typeof useAppTheme>;

function SettingToggle({ description, disabled, label, onChange, theme, value }: { description: string; disabled: boolean; label: string; onChange: (value: boolean) => void; theme: Theme; value: boolean }) {
  return <View style={[styles.toggleRow, { backgroundColor: theme.surface }]}><View style={styles.flex}><Text style={[styles.body, { color: theme.primaryText }]}>{label}</Text><Text style={[styles.caption, { color: theme.secondaryText }]}>{description}</Text></View><Switch accessibilityLabel={label} disabled={disabled} onValueChange={onChange} thumbColor={value ? theme.primaryAction : undefined} value={value} /></View>;
}

function ValueButton({ label, onPress, theme, value }: { label: string; onPress: () => void; theme: Theme; value: string }) {
  const t = useMessages();
  return <Pressable accessibilityHint={t.notifications.settings.currentValue(value)} accessibilityLabel={label} accessibilityRole="button" onPress={onPress} style={[styles.valueButton, { backgroundColor: theme.surface }]}><Text style={[styles.body, { color: theme.primaryText }]}>{label}</Text><Text style={[styles.cardTitle, { color: theme.primaryAction }]}>{value}</Text></Pressable>;
}

function Segment({ label, onPress, selected, theme }: { label: string; onPress: () => void; selected: boolean; theme: Theme }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.segment, { backgroundColor: selected ? theme.tintPrimary : theme.elevatedSurface }]}><Text style={[styles.caption, { color: selected ? theme.primaryText : theme.secondaryText }]}>{label}</Text></Pressable>;
}

function ActionButton({ disabled, label, onPress, primary = false }: { disabled: boolean; label: string; onPress: () => void; primary?: boolean }) {
  return <Button disabled={disabled} label={label} onPress={onPress} variant={primary ? 'primary' : 'secondary'} />;
}

function TimePickerModal({ initialValue, onClose, onSave, theme, visible }: { initialValue: string; onClose: () => void; onSave: (value: string) => void; theme: Theme; visible: boolean }) {
  const t = useMessages();
  const [initialHour, initialMinute] = initialValue.split(':').map(Number);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(Math.round(initialMinute / 5) * 5 % 60);
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}><View style={[styles.modalBackdrop, { backgroundColor: theme.overlay }]}><View style={[styles.modal, { backgroundColor: theme.appBackground }]}><Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.notifications.settings.chooseTime}</Text><Text style={[styles.optionLabel, { color: theme.secondaryText }]}>{t.notifications.settings.hour}</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pickerRow}>{Array.from({ length: 24 }, (_, value) => <Segment key={value} label={String(value).padStart(2, '0')} onPress={() => setHour(value)} selected={hour === value} theme={theme} />)}</ScrollView><Text style={[styles.optionLabel, { color: theme.secondaryText }]}>{t.notifications.settings.minute}</Text><View style={styles.pickerRow}>{Array.from({ length: 12 }, (_, index) => index * 5).map((value) => <Segment key={value} label={String(value).padStart(2, '0')} onPress={() => setMinute(value)} selected={minute === value} theme={theme} />)}</View><View style={styles.actions}><ActionButton disabled={false} label={t.common.cancel} onPress={onClose} /><ActionButton disabled={false} label={t.notifications.settings.saveTime(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)} onPress={() => onSave(`${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`)} primary /></View></View></View></Modal>;
}

type Copy = Messages['notifications']['settings'];

function permissionTitle(copy: Copy, value: NotificationPermissionState): string {
  if (value === 'granted') return copy.permissionGrantedTitle;
  if (value === 'denied-permanent') return copy.permissionBlockedTitle;
  if (value === 'denied-requestable') return copy.permissionDeniedTitle;
  if (value === 'unavailable') return copy.permissionUnavailableTitle;
  return copy.permissionNotEnabledTitle;
}

function permissionDescription(copy: Copy, value: NotificationPermissionState): string {
  if (value === 'granted') return copy.permissionGrantedDescription;
  if (value === 'denied-permanent') return copy.permissionBlockedDescription;
  if (value === 'denied-requestable') return copy.permissionDeniedDescription;
  if (value === 'unavailable') return copy.permissionUnavailableDescription;
  return copy.permissionNotEnabledDescription;
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, center: { alignItems: 'center', flex: 1, justifyContent: 'center' }, content: { gap: spacing.lg, padding: spacing.md }, section: { gap: spacing.sm }, sectionTitle: { ...typography.sectionTitle }, card: { gap: spacing.sm }, cardTitle: { ...typography.bodyStrong }, eyebrow: { ...typography.overline }, body: { ...typography.body }, caption: { ...typography.caption }, notice: { ...typography.caption, fontFamily: fonts.sans.semibold, fontWeight: '600' }, toggleRow: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.md, minHeight: 72, padding: spacing.md }, flex: { flex: 1 }, options: { gap: spacing.sm, paddingLeft: spacing.md }, valueButton: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', justifyContent: 'space-between', minHeight: 52, paddingHorizontal: spacing.md }, optionLabel: { ...typography.label, textTransform: 'uppercase' }, segmented: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, segment: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 48, minWidth: 56, paddingHorizontal: spacing.md }, actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, errorCard: { borderRadius: borderRadii.md, gap: spacing.sm, padding: spacing.md }, modalBackdrop: { flex: 1, justifyContent: 'flex-end' }, modal: { borderTopLeftRadius: borderRadii.lg, borderTopRightRadius: borderRadii.lg, gap: spacing.md, maxHeight: '80%', padding: spacing.lg }, pickerRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
