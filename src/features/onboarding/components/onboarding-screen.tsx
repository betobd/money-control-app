import { getLocales } from 'expo-localization';
import { useFocusEffect, useRouter } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useCallback, useMemo, useState } from 'react';
import { BackHandler, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { FixedFooter } from '@/components/fixed-footer';
import { PressableScale } from '@/components/pressable-scale';
import { ScreenHeader } from '@/components/screen-header';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { getCurrency, type CurrencyCode } from '@/features/currency/currency';
import { CurrencyPicker } from '@/features/currency/components/currency-picker';
import { settingsService } from '@/features/settings/settings';
import { useOnboardingCompleted } from '@/features/settings/use-onboarding-completed';
import { useAppTheme } from '@/hooks/use-app-theme';
import { FALLBACK_BASE_CURRENCY, suggestBaseCurrency } from '../device-currency';

type Step = 'welcome' | 'currency';

type Highlight = { icon: SymbolViewProps['name']; title: string; body: string };

const HIGHLIGHTS: readonly Highlight[] = [
  {
    icon: { ios: 'lock.fill', android: 'lock', web: 'lock' },
    title: 'Private by design',
    body: 'No sign-up. Your data stays on this phone unless you export it.',
  },
  {
    icon: { ios: 'globe', android: 'public', web: 'public' },
    title: 'Any currency',
    body: 'Keep accounts in the currencies you use and see every total in yours.',
  },
  {
    icon: { ios: 'chart.pie.fill', android: 'pie_chart', web: 'pie_chart' },
    title: 'Budgets that keep you on track',
    body: 'Set a monthly ceiling and category limits, and see where your money goes.',
  },
];

/**
 * First-run welcome flow.
 *
 * Its one job beyond a greeting is the base currency. Every total, budget and
 * `base_amount_minor` snapshot is denominated in it, and it locks with the first
 * transaction or budget, so it has to be chosen before the user can create
 * either. Restoring a backup is offered as the other way in, because a restore
 * brings its own base currency.
 */
export function OnboardingScreen() {
  const router = useRouter();
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const completed = useOnboardingCompleted();
  const suggestion = useMemo(() => suggestBaseCurrency(getLocales()), []);
  const [step, setStep] = useState<Step>('welcome');
  const [currency, setCurrency] = useState<CurrencyCode>(suggestion);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>();

  // The single exit to the app: finishing the flow flips `completed`, and so does
  // a successful restore opened from here, which lands back on this screen.
  useFocusEffect(useCallback(() => {
    if (completed) router.replace('/');
  }, [completed, router]));

  // Android back on the currency step returns to the welcome step instead of
  // leaving the app.
  useFocusEffect(useCallback(() => {
    if (step !== 'currency') return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setStep('welcome');
      return true;
    });
    return () => subscription.remove();
  }, [step]));

  async function finish() {
    setSaving(true);
    setError(undefined);
    try {
      await settingsService.completeOnboarding(currency);
    } catch (cause) {
      setError(toUserMessage(cause, 'Your currency could not be saved. Try again.'));
      setSaving(false);
    }
  }

  if (step === 'welcome') {
    return (
      <View style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
        <ScrollView contentContainerStyle={styles.welcomeContent}>
          <View style={[styles.mark, { backgroundColor: theme.tintPrimary }]}>
            <SymbolView
              name={{ ios: 'banknote.fill', android: 'payments', web: 'payments' }}
              size={36}
              tintColor={theme.primaryAction}
            />
          </View>
          <Text accessibilityRole="header" style={[styles.appName, { color: theme.primaryText }]}>
            Money Control
          </Text>
          <Text style={[styles.tagline, { color: theme.secondaryText }]}>
            Your money, clear and private.
          </Text>

          <View style={styles.highlights}>
            {HIGHLIGHTS.map((highlight) => (
              <View key={highlight.title} style={[styles.highlight, { backgroundColor: theme.surface }]}>
                <View style={[styles.highlightIcon, { backgroundColor: theme.tintPrimary }]}>
                  <SymbolView name={highlight.icon} size={20} tintColor={theme.primaryAction} />
                </View>
                <View style={styles.highlightText}>
                  <Text style={[styles.highlightTitle, { color: theme.primaryText }]}>{highlight.title}</Text>
                  <Text style={[styles.highlightBody, { color: theme.secondaryText }]}>{highlight.body}</Text>
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        <FixedFooter bottomInset={insets.bottom}>
          <Button fullWidth label="Get started" onPress={() => setStep('currency')} size="lg" variant="primary" />
          <Button
            fullWidth
            icon={{ ios: 'arrow.clockwise', android: 'restore', web: 'restore' }}
            label="Restore from a backup"
            onPress={() => router.push('/backup')}
            size="lg"
            variant="ghost"
          />
        </FixedFooter>
      </View>
    );
  }

  const definition = getCurrency(currency);
  const suggested = [...new Set<CurrencyCode>([suggestion, FALLBACK_BASE_CURRENCY, 'EUR'])];

  return (
    <View style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader
        leading="back"
        leadingAccessibilityLabel="Back to welcome"
        leadingDisabled={saving}
        onLeadingPress={() => setStep('welcome')}
        title="Main currency"
      />

      <ScrollView contentContainerStyle={styles.content}>
        <Text accessibilityRole="header" style={[styles.question, { color: theme.primaryText }]}>
          Which currency do you use day to day?
        </Text>
        <Text style={[styles.body, { color: theme.secondaryText }]}>
          Totals, budgets and reports are shown in this currency. You can still keep accounts in other
          currencies.
        </Text>

        <PressableScale
          accessibilityHint="Opens the list of currencies"
          accessibilityLabel={`Main currency: ${definition.code}, ${definition.name}`}
          accessibilityRole="button"
          disabled={saving}
          onPress={() => setPickerOpen(true)}
          style={[styles.currencyCard, { backgroundColor: theme.surface, borderColor: theme.primaryAction }]}>
          <View style={[styles.symbol, { backgroundColor: theme.tintPrimary }]}>
            <Text numberOfLines={1} style={[styles.symbolText, { color: theme.primaryAction }]}>
              {definition.symbol}
            </Text>
          </View>
          <View style={styles.currencyText}>
            <Text style={[styles.currencyCode, { color: theme.primaryText }]}>{definition.code}</Text>
            <Text numberOfLines={1} style={[styles.currencyName, { color: theme.secondaryText }]}>
              {definition.name}
            </Text>
          </View>
          <Text style={[styles.change, { color: theme.primaryAction }]}>Change</Text>
        </PressableScale>

        <View style={[styles.note, { backgroundColor: theme.tintWarning }]}>
          <SymbolView
            name={{ ios: 'info.circle.fill', android: 'info', web: 'info' }}
            size={18}
            tintColor={theme.warning}
          />
          <Text style={[styles.noteText, { color: theme.primaryText }]}>
            You can change it until you record your first transaction or budget. After that it stays fixed,
            because every amount is saved in it.
          </Text>
        </View>

        {error ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.body, { color: theme.destructive }]}>
            {error}
          </Text>
        ) : null}
      </ScrollView>

      <FixedFooter bottomInset={insets.bottom}>
        <Button
          busy={saving}
          fullWidth
          label={`Use ${definition.code} and start`}
          onPress={() => void finish()}
          size="lg"
          variant="primary"
        />
      </FixedFooter>

      <CurrencyPicker
        onClose={() => setPickerOpen(false)}
        onSelect={setCurrency}
        selected={currency}
        suggested={suggested}
        suggestedLabel="Suggested"
        title="Main currency"
        visible={pickerOpen}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  welcomeContent: { alignItems: 'center', gap: spacing.sm, padding: spacing.lg, paddingTop: spacing.xl },
  mark: { alignItems: 'center', borderRadius: borderRadii.card, height: 72, justifyContent: 'center', width: 72 },
  appName: { ...typography.display, marginTop: spacing.sm, textAlign: 'center' },
  tagline: { ...typography.body, textAlign: 'center' },
  highlights: { alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.lg },
  highlight: { borderRadius: borderRadii.card, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  highlightIcon: { alignItems: 'center', borderRadius: borderRadii.full, height: 40, justifyContent: 'center', width: 40 },
  highlightText: { flex: 1, gap: 2 },
  highlightTitle: { ...typography.bodyStrong },
  highlightBody: { ...typography.caption },
  content: { gap: spacing.md, padding: spacing.md },
  question: { ...typography.sectionTitle },
  body: { ...typography.body },
  currencyCard: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  symbol: { alignItems: 'center', borderRadius: borderRadii.full, height: 48, justifyContent: 'center', width: 48 },
  symbolText: { ...typography.moneyRow },
  currencyText: { flex: 1 },
  currencyCode: { ...typography.money },
  currencyName: { ...typography.caption },
  change: { ...typography.captionStrong },
  note: { borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.sm, padding: spacing.md },
  noteText: { ...typography.caption, flex: 1 },
});
