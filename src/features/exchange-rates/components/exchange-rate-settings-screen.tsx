import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Card } from '@/components/card';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { formatExchangeRate } from '@/features/currency/currency';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { useExchangeRate } from '../use-exchange-rate';
import type { ExchangeRateRecord } from '../exchange-rate.types';

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

function sourceLabel(record: ExchangeRateRecord): string {
  return record.source === 'frankfurter' ? 'Frankfurter reference rate' : 'Manual entry';
}

export function ExchangeRateSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const { status, loading, busy, error, refresh, setManualRate } = useExchangeRate();
  const [manualInput, setManualInput] = useState('');
  const [manualNotice, setManualNotice] = useState<string>();

  const rate = status?.rate ?? null;
  const freshness = status?.freshness ?? 'none';

  async function saveManualRate(): Promise<void> {
    setManualNotice(undefined);
    try {
      await setManualRate(manualInput);
      setManualInput('');
      setManualNotice('Saved the USD/COP rate.');
    } catch {
      // error surfaced via hook `error`
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={24}
            tintColor={busy ? theme.disabledText : theme.primaryText}
          />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          Currency & Rates
        </Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.feedback, { backgroundColor: theme.tintDestructive, color: theme.destructive }]}>
            {error}
          </Text>
        ) : null}
        {manualNotice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.feedback, { backgroundColor: theme.tintIncome, color: theme.income }]}>
            {manualNotice}
          </Text>
        ) : null}

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Base currency</Text>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Base currency</Text>
            <Text style={[styles.value, { color: theme.primaryText }]}>COP · Colombian peso</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>Foreign currency</Text>
            <Text style={[styles.value, { color: theme.primaryText }]}>USD · US dollar</Text>
          </View>
          <Text style={[styles.caption, { color: theme.mutedText }]}>
            All consolidated totals (net worth, Home, Reports, Budgets) are shown in COP. Each account keeps its own
            currency.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>USD/COP reference rate</Text>
          {loading ? (
            <ActivityIndicator color={theme.primaryAction} />
          ) : rate ? (
            <>
              <Text style={[styles.rateValue, { color: theme.primaryText }]}>
                COP {formatExchangeRate({ rateScaled: rate.rateScaled, rateScale: rate.rateScale })} per USD
              </Text>
              {freshness === 'stale' ? (
                <View style={[styles.badge, { backgroundColor: theme.tintWarning }]}>
                  <Text style={[styles.badgeText, { color: theme.warning }]}>Rate may be out of date</Text>
                </View>
              ) : (
                <View style={[styles.badge, { backgroundColor: theme.tintIncome }]}>
                  <Text style={[styles.badgeText, { color: theme.income }]}>Up to date</Text>
                </View>
              )}
              <View style={styles.row}>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Source</Text>
                <Text style={[styles.value, { color: theme.primaryText }]}>{sourceLabel(rate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Rate date</Text>
                <Text style={[styles.value, { color: theme.primaryText }]}>{formatTransactionDate(rate.effectiveDate)}</Text>
              </View>
              <View style={styles.row}>
                <Text style={[styles.label, { color: theme.secondaryText }]}>Last updated</Text>
                <Text style={[styles.value, { color: theme.primaryText }]}>{formatFetchedAt(rate.fetchedAt)}</Text>
              </View>
            </>
          ) : (
            <Text style={[styles.body, { color: theme.secondaryText }]}>
              No exchange rate is available. Refresh from Frankfurter or enter a USD/COP rate manually.
            </Text>
          )}

          <Pressable
            accessibilityLabel="Refresh from Frankfurter"
            accessibilityRole="button"
            disabled={busy}
            onPress={() => void refresh()}
            style={[styles.primaryButton, { backgroundColor: busy ? theme.disabledSurface : theme.primaryAction }]}>
            {busy ? (
              <ActivityIndicator color={theme.onPrimaryAction} />
            ) : (
              <Text style={[styles.primaryButtonLabel, { color: theme.onPrimaryAction }]}>Refresh from Frankfurter</Text>
            )}
          </Pressable>
          <Text style={[styles.caption, { color: theme.mutedText }]}>
            Frankfurter provides reference exchange rates from official sources. Your bank may use a different rate.
          </Text>
        </Card>

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Enter a manual rate</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>
            Enter how many Colombian pesos equal one US dollar. Up to four decimal places.
          </Text>
          <TextInput
            accessibilityLabel="Manual USD to COP rate"
            keyboardType="decimal-pad"
            value={manualInput}
            onChangeText={setManualInput}
            placeholder="e.g. 4100"
            placeholderTextColor={theme.mutedText}
            editable={!busy}
            style={[styles.input, { backgroundColor: theme.elevatedSurface, borderColor: theme.border, color: theme.primaryText }]}
          />
          <Pressable
            accessibilityLabel="Save manual rate"
            accessibilityRole="button"
            disabled={busy || manualInput.trim().length === 0}
            onPress={() => void saveManualRate()}
            style={[
              styles.secondaryButton,
              { borderColor: theme.primaryAction, opacity: busy || manualInput.trim().length === 0 ? 0.5 : 1 },
            ]}>
            <Text style={[styles.secondaryButtonLabel, { color: theme.primaryAction }]}>Save manual rate</Text>
          </Pressable>
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 56, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.md, padding: spacing.md },
  feedback: { ...typography.caption, borderRadius: borderRadii.md, overflow: 'hidden', padding: spacing.md },
  sectionTitle: { ...typography.sectionTitle, marginBottom: spacing.sm },
  row: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  label: { ...typography.caption },
  value: { ...typography.body, flexShrink: 1, textAlign: 'right' },
  rateValue: { ...typography.moneyHero, marginBottom: spacing.sm },
  badge: { alignSelf: 'flex-start', borderRadius: borderRadii.full, marginBottom: spacing.sm, paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  badgeText: { ...typography.label },
  body: { ...typography.body, marginBottom: spacing.sm },
  caption: { ...typography.caption, marginTop: spacing.sm },
  primaryButton: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', marginTop: spacing.md, minHeight: 48 },
  primaryButtonLabel: { ...typography.body, fontFamily: typography.heading.fontFamily },
  secondaryButton: { alignItems: 'center', borderRadius: borderRadii.full, borderWidth: 1, justifyContent: 'center', marginTop: spacing.md, minHeight: 48 },
  secondaryButtonLabel: { ...typography.body },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: 1, marginTop: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
});
