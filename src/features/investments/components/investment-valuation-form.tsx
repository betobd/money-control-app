import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DateField } from '@/components/date-field';
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { currencyName, formatMoneyEntry, formatMoneyWithSymbol, getCurrency, parseMoney, sanitizeMoneyEntry, type CurrencyCode } from '@/features/currency/currency';
import { bogotaToday } from '@/features/transactions/transaction-date';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { InvestmentValuationError } from '../investment-valuation.service';
import { investmentValuationService } from '../investments';
import { useInvestmentDetails } from '../use-investments';
import { ScreenHeader } from '@/components/screen-header';
import { FixedFooter } from '@/components/fixed-footer';

/** Sanitizes raw money input for the given currency: digits and optional dot (USD). */
function sanitizeMoneyInput(value: string, currency: CurrencyCode): string {
  return sanitizeMoneyEntry(value, currency);
}

export function InvestmentValuationForm({ accountId }: { accountId: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useAppTheme();
  const t = useMessages();
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
        <Text style={[styles.headerTitle, { color: theme.primaryText }]}>{t.investments.loadInvestmentError}</Text>
        <Text style={[styles.help, { color: theme.secondaryText }]}>{error ?? t.investments.notAnInvestment}</Text>
        <Button
          fullWidth
          label={t.investments.goBack}
          onPress={() => router.back()}
          size="lg"
          style={{ marginTop: spacing.md }}
          variant="primary"
        />
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
        setFieldError(t.investments.invalidAmount);
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
      else setGeneralError(t.investments.recordValuationError);
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
      <ScreenHeader leading="close" leadingAccessibilityLabel={t.investments.closeValuationForm} title={t.investments.updateValueTitle} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={[styles.help, { color: theme.secondaryText }]}>{view.account.name}</Text>
        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text>
        ) : null}

        <View style={styles.field}>
          <Overline color={theme.mutedText}>{t.investments.currentValueLabel(currency)}</Overline>
          <TextInput
            accessibilityLabel={t.investments.currentValueAccessibilityLabel(currencyName(currency))}
            keyboardType={getCurrency(currency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
            onChangeText={(text) => { setValue(sanitizeMoneyInput(text, currency)); setFieldError(undefined); }}
            placeholder={getCurrency(currency).fractionDigits > 0 ? '0.00' : '0'}
            placeholderTextColor={theme.mutedText}
            style={[styles.moneyInput, inputStyle(Boolean(fieldError))]}
            value={formatMoneyEntry(value, currency)}
          />
          {fieldError ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{fieldError}</Text> : null}
        </View>

        <DateField label={t.investments.valuationDate} onChange={setValuationDate} value={valuationDate} />

        <View style={styles.field}>
          <Overline color={theme.mutedText}>{t.investments.noteOptional}</Overline>
          <TextInput
            accessibilityLabel={t.investments.note}
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder={t.investments.valuationNotePlaceholder}
            placeholderTextColor={theme.mutedText}
            style={[styles.multiline, inputStyle(false)]}
            value={note}
          />
        </View>

        <Card style={styles.preview} variant="raised">
          <Overline color={theme.secondaryText}>{t.investments.preview}</Overline>
          <PreviewRow label={t.investments.previousValue} value={previousMinor === null ? '—' : money(previousMinor)} color={theme.primaryText} />
          <PreviewRow label={t.investments.newValue} value={newMinor === null ? '—' : money(newMinor)} color={theme.primaryText} />
          <PreviewRow
            label={t.investments.change}
            value={changeMinor === null ? '—' : `${signed(changeMinor)}${changePercent === null ? '' : ` · ${changePercent > 0 ? '+' : ''}${changePercent.toFixed(2)}%`}`}
            color={colorFor(changeMinor)}
          />
          <PreviewRow label={t.investments.netContributions} value={money(netContributionsMinor)} color={theme.primaryText} />
          <PreviewRow
            label={t.investments.estimatedGainLoss}
            value={estimatedGainMinor === null ? '—' : signed(estimatedGainMinor)}
            color={colorFor(estimatedGainMinor)}
          />
        </Card>
      </ScrollView>

      <FixedFooter bottomInset={insets.bottom}>
        <Button busy={saving} fullWidth label={t.investments.saveValuation} onPress={() => void save()} size="lg" variant="primary" />
      </FixedFooter>
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
});
