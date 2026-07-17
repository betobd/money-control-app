import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

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
                {
                  backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface,
                  borderColor: selected ? theme.primaryAction : theme.border,
                },
              ]}>
              <Text style={[
                styles.chipText,
                { color: selected ? theme.selectedNavigationForeground : theme.secondaryText },
              ]}>
                {preset.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {selection.preset === 'custom' ? (
        <View style={[styles.customPanel, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.dateFields}>
            <DateField label="Start date" value={dateFrom} onChangeText={setDateFrom} />
            <DateField label="End date" value={dateTo} onChangeText={setDateTo} />
          </View>
          {error ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {error}
            </Text>
          ) : null}
          <Pressable
            accessibilityLabel="Apply custom report period"
            accessibilityRole="button"
            onPress={applyCustomRange}
            style={[styles.apply, { backgroundColor: theme.primaryAction }]}>
            <Text style={[styles.applyText, { color: theme.onPrimaryAction }]}>Apply range</Text>
          </Pressable>
        </View>
      ) : null}

      {periodLabel ? (
        <Text accessibilityLabel={`Selected report period, ${periodLabel}`} style={[styles.periodLabel, { color: theme.secondaryText }]}>
          {periodLabel}
        </Text>
      ) : null}
    </View>
  );
}

function DateField({
  label,
  value,
  onChangeText,
}: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
}) {
  const theme = useAppTheme();
  return (
    <View style={styles.field}>
      <Text style={[styles.fieldLabel, { color: theme.secondaryText }]}>{label}</Text>
      <TextInput
        accessibilityLabel={`${label}, YYYY-MM-DD`}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
        onChangeText={onChangeText}
        placeholder="YYYY-MM-DD"
        placeholderTextColor={theme.mutedText}
        style={[
          styles.input,
          { backgroundColor: theme.appBackground, borderColor: theme.border, color: theme.primaryText },
        ]}
        value={value}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  presets: { gap: spacing.sm, paddingHorizontal: spacing.md },
  chip: {
    borderRadius: borderRadii.full,
    borderWidth: borderWidths.thin,
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.md,
  },
  chipText: { ...typography.caption, fontWeight: '700' },
  customPanel: {
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.md,
    marginHorizontal: spacing.md,
    padding: spacing.md,
  },
  dateFields: { flexDirection: 'row', gap: spacing.sm },
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
