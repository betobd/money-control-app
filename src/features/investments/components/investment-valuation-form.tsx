import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { getCurrency, formatMoneyWithSymbol, parseMoney, type CurrencyCode } from '@/features/currency/currency';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { InvestmentValuationError } from '../investment-valuation.service';
import { investmentValuationService } from '../investments';
import { useInvestmentDetails } from '../use-investments';

/** Sanitizes raw money input for the given currency: digits and optional dot (USD). */
function sanitizeMoneyInput(value: string, currency: CurrencyCode): string {
  const allowDot = getCurrency(currency).fractionDigits > 0;
  return value.replace(allowDot ? /[^\d.]/g : /\D/g, '');
}

export function InvestmentValuationForm({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useAppTheme();
  const { view, loading, error } = useInvestmentDetails(accountId);

  const [value, setValue] = useState('');
  const [valuationDate, setValuationDate] = useState(bogotaToday());
  const [note, setNote] = useState('');
  const [fieldError, setFieldError] = useState<string>();
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);

  if (loading && !view) {
    return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  }

  if (error || !view) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.appBackground, padding: spacing.lg }]}>
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>Unable to load investment</Text>
        <Text style={[styles.help, { color: theme.secondaryText }]}>{error ?? 'This account is not an investment.'}</Text>
        <Pressable accessibilityLabel="Go back" accessibilityRole="button" onPress={() => router.back()} style={[styles.save, { backgroundColor: theme.primaryAction, marginTop: spacing.md }]}>
          <Text style={[styles.saveText, { color: theme.onPrimaryAction }]}>Go back</Text>
        </Pressable>
      </View>
    );
  }

  const currency = view.account.currency;
  const previousMinor = view.latestValuation ? view.latestValuation.valueMinor : null;
  const netContributionsMinor = view.netContributionsMinor;

  const parsed = parseMoney(value.trim() || '', currency);
  const newMinor = parsed.ok ? parsed.minor : null;
  const changeMinor = newMinor !== null && previousMinor !== null ? newMinor - previousMinor : null;
  const changePercent =
    changeMinor !== null && previousMinor !== null && previousMinor !== 0
      ? (changeMinor / previousMinor) * 100
      : null;
  const estimatedGainMinor = newMinor !== null ? newMinor - netContributionsMinor : null;

  const colorFor = (amount: number | null) =>
    amount === null || amount === 0 ? theme.mutedText : amount > 0 ? theme.income : theme.expense;
  const money = (amount: number) => formatMoneyWithSymbol(amount, currency);
  const signed = (amount: number) => `${amount > 0 ? '+' : ''}${money(amount)}`;

  async function save() {
    setSaving(true);
    setFieldError(undefined);
    setGeneralError(undefined);
    try {
      const result = parseMoney(value.trim() || '', currency);
      if (!result.ok) {
        setFieldError('Enter a valid, non-negative amount.');
        setSaving(false);
        return;
      }
      await investmentValuationService.record(accountId, {
        valueMinor: result.minor,
        valuationDate: valuationDate.trim(),
        note: note.trim() ? note.trim() : null,
      });
      router.back();
    } catch (cause) {
      if (cause instanceof InvestmentValuationError) setGeneralError(cause.message);
      else setGeneralError('Unable to record valuation. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = (invalid: boolean) => [
    styles.input,
    { backgroundColor: theme.surface, borderColor: invalid ? theme.destructive : theme.hairline, color: theme.primaryText },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Close valuation form" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.primaryText }]}>Update Value</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.help, { color: theme.secondaryText }]}>{view.account.name}</Text>
        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text>
        ) : null}

        <View style={styles.field}>
          <Overline color={theme.mutedText}>{`Current value (${currency})`}</Overline>
          <TextInput
            accessibilityLabel={`Current value in ${getCurrency(currency).name}`}
            keyboardType={getCurrency(currency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
            onChangeText={(text) => { setValue(sanitizeMoneyInput(text, currency)); setFieldError(undefined); }}
            placeholder={getCurrency(currency).fractionDigits > 0 ? '0.00' : '0'}
            placeholderTextColor={theme.mutedText}
            style={[styles.moneyInput, inputStyle(Boolean(fieldError))]}
            value={value}
          />
          {fieldError ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{fieldError}</Text> : null}
        </View>

        <View style={styles.field}>
          <Overline color={theme.mutedText}>Valuation date</Overline>
          <TextInput
            accessibilityLabel="Valuation date, year month day"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={setValuationDate}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.mutedText}
            style={inputStyle(false)}
            value={valuationDate}
          />
        </View>

        <View style={styles.field}>
          <Overline color={theme.mutedText}>Note (optional)</Overline>
          <TextInput
            accessibilityLabel="Note"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="e.g. Statement value as of month end"
            placeholderTextColor={theme.mutedText}
            style={[styles.multiline, inputStyle(false)]}
            value={note}
          />
        </View>

        <Card style={styles.preview} variant="raised">
          <Overline color={theme.secondaryText}>Preview</Overline>
          <PreviewRow label="Previous value" value={previousMinor === null ? '—' : money(previousMinor)} color={theme.primaryText} />
          <PreviewRow label="New value" value={newMinor === null ? '—' : money(newMinor)} color={theme.primaryText} />
          <PreviewRow
            label="Change"
            value={changeMinor === null ? '—' : `${signed(changeMinor)}${changePercent === null ? '' : ` · ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`}`}
            color={colorFor(changeMinor)}
          />
          <PreviewRow label="Net contributions" value={money(netContributionsMinor)} color={theme.primaryText} />
          <PreviewRow
            label="Estimated gain/loss"
            value={estimatedGainMinor === null ? '—' : signed(estimatedGainMinor)}
            color={colorFor(estimatedGainMinor)}
          />
        </Card>
      </ScrollView>

      <View style={[styles.saveBar, { backgroundColor: theme.appBackground, borderTopColor: theme.hairline, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          accessibilityLabel="Save valuation"
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: saving ? theme.disabledSurface : theme.primaryAction }]}>
          {saving ? <ActivityIndicator color={theme.disabledText} /> : <Text style={[styles.saveText, { color: theme.onPrimaryAction }]}>Save Valuation</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

function PreviewRow({ label, value, color }: { label: string; value: string; color: string }) {
  const theme = useAppTheme();
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.previewLabel, { color: theme.secondaryText }]}>{label}</Text>
      <Text style={[styles.previewValue, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  field: { gap: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  moneyInput: { fontFamily: fonts.mono.medium },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  preview: { gap: spacing.sm },
  previewRow: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between' },
  previewLabel: { ...typography.caption, flexShrink: 1 },
  previewValue: { ...typography.moneyRow, flexShrink: 1, textAlign: 'right' },
  error: { ...typography.caption },
  help: { ...typography.caption },
  saveBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  save: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.lg },
  saveText: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
});
