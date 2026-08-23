import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateField } from '@/components/date-field';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ReportPeriodValidationError, resolveReportPeriod } from '../report-period';
import type { ReportPeriodPreset, ReportPeriodSelection } from '../report.types';

const presets: { value: ReportPeriodPreset; label: string }[] = [
  { value: 'current-month', label: 'Current month' },
  { value: 'previous-month', label: 'Previous month' },
  { value: 'last-3-months', label: 'Last 3 months' },
  { value: 'last-6-months', label: 'Last 6 months' },
  { value: 'current-year', label: 'Current year' },
  { value: 'custom', label: 'Custom' },
];

type Props = {
  selection: ReportPeriodSelection;
  periodLabel?: string;
  onChange: (selection: ReportPeriodSelection) => void;
};

export function ReportPeriodSelector({ selection, periodLabel, onChange }: Props) {
  const theme = useAppTheme();
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
      setError(cause instanceof ReportPeriodValidationError ? cause.message : 'Invalid report period.');
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
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selection.preset === 'custom' ? (
        <Card style={styles.customPanel}>
          <View style={styles.dateFields}>
            <DateField label="Start date" maxDate={dateTo || undefined} onChange={setDateFrom} value={dateFrom} />
            <DateField label="End date" minDate={dateFrom || undefined} onChange={setDateTo} value={dateTo} />
          </View>
          {error ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {error}
            </Text>
          ) : null}
          <Button accessibilityLabel="Apply custom report period" fullWidth label="Apply range" onPress={applyCustomRange} variant="primary" />
        </Card>
      ) : null}

      {periodLabel ? (
        <Text accessibilityLabel={`Selected report period, ${periodLabel}`} style={[styles.periodLabel, { color: theme.secondaryText }]}>
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
  chipText: { ...typography.caption, fontWeight: '700' },
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
  applyText: { ...typography.caption, fontWeight: '700' },
  periodLabel: { ...typography.caption, paddingHorizontal: spacing.md, textAlign: 'center' },
});
