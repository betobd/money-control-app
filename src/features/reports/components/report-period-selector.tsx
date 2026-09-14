import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateField } from '@/components/date-field';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import { ReportPeriodValidationError, resolveReportPeriod } from '../report-period';
import type { ReportPeriodPreset, ReportPeriodSelection } from '../report.types';

const presets: { value: ReportPeriodPreset; label: (t: Messages) => string }[] = [
  { value: 'current-month', label: (t) => t.reports.presetCurrentMonth },
  { value: 'previous-month', label: (t) => t.reports.presetPreviousMonth },
  { value: 'last-3-months', label: (t) => t.reports.presetLast3Months },
  { value: 'last-6-months', label: (t) => t.reports.presetLast6Months },
  { value: 'current-year', label: (t) => t.reports.presetCurrentYear },
  { value: 'custom', label: (t) => t.reports.presetCustom },
];

type Props = {
  selection: ReportPeriodSelection;
  periodLabel?: string;
  onChange: (selection: ReportPeriodSelection) => void;
};

export function ReportPeriodSelector({ selection, periodLabel, onChange }: Props) {
  const theme = useAppTheme();
  const t = useMessages();
  const [dateFrom, setDateFrom] = useState(selection.customDateFrom ?? '');
  const [dateTo, setDateTo] = useState(selection.customDateTo ?? '');
  const [error, setError] = useState<string>();

  function applyCustomRange() {
    const next = { preset: 'custom' as const, customDateFrom: dateFrom, customDateTo: dateTo };
    try {
      resolveReportPeriod(next);
      setError(undefined);
      onChange(next);
    } catch (cause) {
      setError(cause instanceof ReportPeriodValidationError ? cause.message : t.reports.invalidPeriod);
    }
  }

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.presets}
        horizontal
        showsHorizontalScrollIndicator={false}>
        {presets.map((preset) => {
          const selected = preset.value === selection.preset;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={preset.value}
              onPress={() => {
                setError(undefined);
                if (preset.value === 'custom') {
                  let customDateFrom = dateFrom;
                  let customDateTo = dateTo;
                  try {
                    resolveReportPeriod({ preset: 'custom', customDateFrom, customDateTo });
                  } catch {
                    const fallback = resolveReportPeriod({ preset: 'current-month' });
                    customDateFrom = fallback.dateFrom;
                    customDateTo = fallback.dateTo;
                    setDateFrom(customDateFrom);
                    setDateTo(customDateTo);
                  }
                  onChange({ preset: 'custom', customDateFrom, customDateTo });
                } else {
                  onChange({ preset: preset.value });
                }
              }}
              style={[
                styles.chip,
                { backgroundColor: selected ? theme.tintPrimary : theme.elevatedSurface },
              ]}>
              <Text style={[
                styles.chipText,
                { color: selected ? theme.primaryText : theme.secondaryText },
              ]}>
                {preset.label(t)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selection.preset === 'custom' ? (
        <Card style={styles.customPanel}>
          <View style={styles.dateFields}>
            <DateField label={t.reports.startDate} maxDate={dateTo || undefined} onChange={setDateFrom} value={dateFrom} />
            <DateField label={t.reports.endDate} minDate={dateFrom || undefined} onChange={setDateTo} value={dateTo} />
          </View>
          {error ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {error}
            </Text>
          ) : null}
          <Button accessibilityLabel={t.reports.applyRangeLabel} fullWidth label={t.reports.applyRange} onPress={applyCustomRange} variant="primary" />
        </Card>
      ) : null}

      {periodLabel ? (
        <Text accessibilityLabel={t.reports.selectedPeriod(periodLabel)} style={[styles.periodLabel, { color: theme.secondaryText }]}>
          {periodLabel}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  presets: { gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    borderRadius: borderRadii.full,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  chipText: { ...typography.captionStrong },
  customPanel: {
    gap: spacing.md,
    marginHorizontal: spacing.md,
  },
  dateFields: { gap: spacing.md },
  field: { flex: 1, gap: spacing.xs },
  fieldLabel: { ...typography.label },
  input: {
    ...typography.body,
    borderRadius: borderRadii.sm,
    borderWidth: borderWidths.thin,
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  error: { ...typography.caption },
  apply: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    borderRadius: borderRadii.full,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  applyText: { ...typography.captionStrong },
  periodLabel: { ...typography.caption, paddingHorizontal: spacing.md, textAlign: 'center' },
});
