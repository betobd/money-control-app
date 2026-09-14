import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { BottomSheet } from '@/components/bottom-sheet';
import { PressableScale } from '@/components/pressable-scale';
import {
  buildCalendarMonth,
  calendarMonthLabel,
  monthOf,
  shiftCalendarMonth,
} from '@/components/calendar';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { bogotaToday, formatTransactionDate, isValidCalendarDate } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type DateFieldProps = {
  label: string;
  /** Bogotá-local `YYYY-MM-DD`, or an empty string when unset. */
  value: string;
  onChange: (value: string) => void;
  /** Inline validation message rendered under the field. */
  error?: string;
  /** Earliest selectable date, inclusive. */
  minDate?: string;
  /** Latest selectable date, inclusive. */
  maxDate?: string;
  /** Shows a "Clear" action in the picker and allows an empty value. */
  clearable?: boolean;
  /** Text shown when `value` is empty. */
  placeholder?: string;
};

/**
 * Labelled date input backed by a calendar sheet.
 *
 * Replaces the raw `YYYY-MM-DD` text inputs: the user taps a day instead of
 * typing a format, so an invalid or impossible date can no longer be entered.
 * The value contract is unchanged — still a Bogotá-local `YYYY-MM-DD` string.
 */
export function DateField({
  label,
  value,
  onChange,
  error,
  minDate,
  maxDate,
  clearable = false,
  placeholder,
}: DateFieldProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const [open, setOpen] = useState(false);
  const valid = isValidCalendarDate(value);

  function select(next: string) {
    onChange(next);
    setOpen(false);
  }

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      <PressableScale
        accessibilityHint={t.common.date.pickHint}
        accessibilityLabel={`${label}, ${valid ? formatTransactionDate(value) : t.common.date.noneSelected}`}
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={StyleSheet.flatten([
          styles.field,
          { backgroundColor: theme.surface, borderColor: error ? theme.destructive : theme.hairline },
        ])}>
        <SymbolView
          name={{ ios: 'calendar', android: 'calendar_today', web: 'calendar_today' }}
          size={20}
          tintColor={theme.secondaryText}
        />
        <Text numberOfLines={1} style={[styles.value, { color: valid ? theme.primaryText : theme.mutedText }]}>
          {valid ? formatTransactionDate(value) : placeholder ?? t.common.date.placeholder}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={20}
          tintColor={theme.mutedText}
        />
      </PressableScale>
      {error ? (
        <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>
          {error}
        </Text>
      ) : null}

      <BottomSheet onClose={() => setOpen(false)} title={label} visible={open}>
        <CalendarPicker
          clearable={clearable}
          maxDate={maxDate}
          minDate={minDate}
          onClear={() => select('')}
          onSelect={select}
          value={valid ? value : ''}
        />
      </BottomSheet>
    </View>
  );
}

function CalendarPicker({
  value,
  onSelect,
  onClear,
  clearable,
  minDate,
  maxDate,
}: {
  value: string;
  onSelect: (value: string) => void;
  onClear: () => void;
  clearable: boolean;
  minDate?: string;
  maxDate?: string;
}) {
  const theme = useAppTheme();
  const t = useMessages();
  const today = bogotaToday();
  // BottomSheet unmounts its children while closed, so the grid re-anchors on
  // the current value every time the field is reopened.
  const [month, setMonth] = useState(() => monthOf(value || today));

  const weeks = buildCalendarMonth(month);
  const isBlocked = (date: string) => Boolean((minDate && date < minDate) || (maxDate && date > maxDate));

  return (
    <View style={styles.picker}>
      <View style={styles.monthBar}>
        <Pressable
          accessibilityLabel={t.common.date.previousMonth}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={() => setMonth((current) => shiftCalendarMonth(current, -1))}
          style={styles.monthButton}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }}
            size={20}
            tintColor={theme.secondaryText}
          />
        </Pressable>
        <Text accessibilityLiveRegion="polite" style={[styles.monthLabel, { color: theme.primaryText }]}>
          {calendarMonthLabel(month)}
        </Text>
        <Pressable
          accessibilityLabel={t.common.date.nextMonth}
          accessibilityRole="button"
          hitSlop={spacing.sm}
          onPress={() => setMonth((current) => shiftCalendarMonth(current, 1))}
          style={styles.monthButton}>
          <SymbolView
            name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
            size={20}
            tintColor={theme.secondaryText}
          />
        </Pressable>
      </View>

      <View style={styles.weekdays}>
        {t.common.date.weekdaysNarrow.map((weekday, index) => (
          <Text key={`weekday-${index}`} style={[styles.weekday, { color: theme.mutedText }]}>
            {weekday}
          </Text>
        ))}
      </View>

      <View style={styles.grid}>
        {weeks.map((week) => (
          <View key={week[0].date} style={styles.week}>
            {week.map((day) => {
              const selected = day.date === value;
              const isToday = day.date === today;
              const blocked = isBlocked(day.date);
              const color = selected
                ? theme.onPrimaryAction
                : blocked
                  ? theme.disabledText
                  : day.inMonth
                    ? theme.primaryText
                    : theme.mutedText;
              return (
                <Pressable
                  accessibilityLabel={formatTransactionDate(day.date)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: blocked, selected }}
                  disabled={blocked}
                  key={day.date}
                  onPress={() => onSelect(day.date)}
                  style={styles.dayCell}>
                  <View
                    style={[
                      styles.day,
                      selected ? { backgroundColor: theme.primaryAction } : null,
                      !selected && isToday ? { backgroundColor: theme.elevatedSurface } : null,
                    ]}>
                    <Text style={[styles.dayLabel, { color }, selected ? styles.daySelected : null]}>{day.day}</Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </View>

      <View style={styles.quickActions}>
        <QuickAction disabled={isBlocked(today)} label={t.common.today} onPress={() => onSelect(today)} />
        {clearable ? <QuickAction label={t.common.clear} onPress={onClear} /> : null}
      </View>
    </View>
  );
}

function QuickAction({ label, onPress, disabled }: { label: string; onPress: () => void; disabled?: boolean }) {
  const theme = useAppTheme();
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={disabled}
      onPress={onPress}
      style={StyleSheet.flatten([styles.quickAction, { backgroundColor: theme.elevatedSurface }])}>
      <Text style={[styles.quickActionLabel, { color: theme.primaryAction }]}>{label}</Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.sm },
  label: { ...typography.overline },
  field: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  value: {
    ...typography.body,
    flex: 1,
    fontFamily: typography.label.fontFamily,
    fontSize: 14,
    fontWeight: '600',
  },
  error: { ...typography.caption },
  picker: { gap: spacing.sm },
  monthBar: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  monthButton: { alignItems: 'center', height: 44, justifyContent: 'center', width: 44 },
  monthLabel: { ...typography.sectionTitle, fontSize: 16, lineHeight: 22 },
  weekdays: { flexDirection: 'row' },
  weekday: { ...typography.overline, flex: 1, textAlign: 'center' },
  grid: { gap: spacing.xs },
  week: { flexDirection: 'row' },
  dayCell: { alignItems: 'center', flex: 1, minHeight: 44, justifyContent: 'center' },
  day: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  dayLabel: { ...typography.body, fontSize: 15 },
  daySelected: { fontFamily: typography.label.fontFamily, fontWeight: '700' },
  quickActions: { flexDirection: 'row', gap: spacing.sm, justifyContent: 'center' },
  quickAction: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    justifyContent: 'center',
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  quickActionLabel: { ...typography.label },
});
