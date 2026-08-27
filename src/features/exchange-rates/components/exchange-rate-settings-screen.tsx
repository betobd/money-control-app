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

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { DialogHost, useDialog } from '@/components/dialog';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { useAppTheme } from '@/hooks/use-app-theme';
import { describeRate, getCurrency, type CurrencyCode } from '@/features/currency/currency';
import { CurrencyPicker } from '@/features/currency/components/currency-picker';
import { baseCurrencyLockMessage, settingsService } from '@/features/settings/settings';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { useExchangeRates } from '../use-exchange-rate';
import { toDirectedRate, type ExchangeRateRecord, type ExchangeRateStatus } from '../exchange-rate.types';

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
  const dialog = useDialog();
  const { baseCurrency, baseCurrencyLock: lock, statuses, loading, busyCurrency, error, reload, refresh, setManualRate } = useExchangeRates();
  const [manualInputs, setManualInputs] = useState<Partial<Record<CurrencyCode, string>>>({});
  const [notice, setNotice] = useState<string>();
  const [pickerOpen, setPickerOpen] = useState(false);
  const busy = busyCurrency !== null;

  async function saveManualRate(currency: CurrencyCode): Promise<void> {
    setNotice(undefined);
    try {
      await setManualRate(currency, manualInputs[currency] ?? '');
      setManualInputs((current) => ({ ...current, [currency]: '' }));
      setNotice(`Saved the ${currency}/${baseCurrency} rate.`);
    } catch {
      // Surfaced through the hook's `error`.
    }
  }

  async function chooseBaseCurrency(code: CurrencyCode): Promise<void> {
    setNotice(undefined);
    try {
      await settingsService.setBaseCurrency(code);
      await reload();
      setNotice(`Base currency is now ${code}.`);
    } catch (cause) {
      dialog.notice({
        title: 'Cannot change the base currency',
        message: toUserMessage(cause, 'Unable to change the base currency.'),
      });
    }
  }

  function confirmBaseCurrency(code: CurrencyCode): void {
    if (code === baseCurrency) return;
    dialog.confirm({
      title: `Use ${code} as the base currency?`,
      message: `Every consolidated total — net worth, Home, Reports and Budgets — will be shown in ${code}. You can change this freely until you record your first transaction or budget.`,
      confirmLabel: `Use ${code}`,
      onConfirm: () => void chooseBaseCurrency(code),
    });
  }

  const locked = lock.reason !== null;

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
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.feedback, { backgroundColor: theme.tintIncome, color: theme.income }]}>
            {notice}
          </Text>
        ) : null}

        <Card>
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Base currency</Text>
          <Text style={[styles.rateValue, { color: theme.primaryText }]}>{baseCurrency}</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>
            {getCurrency(baseCurrency).name}. All consolidated totals — net worth, Home, Reports and Budgets — are
            shown in {baseCurrency}. Each account keeps its own currency.
          </Text>
          <Button
            disabled={locked || busy}
            fullWidth
            label="Change base currency"
            onPress={() => setPickerOpen(true)}
            size="lg"
            variant="tonal"
          />
          {/* The reason is always shown rather than the button silently doing
              nothing: "why is this greyed out" is the whole question here. */}
          {locked ? (
            <Text style={[styles.caption, { color: theme.warning }]}>{baseCurrencyLockMessage(lock)}</Text>
          ) : (
            <Text style={[styles.caption, { color: theme.mutedText }]}>
              This can be changed freely until you record your first transaction or budget. After that it is fixed,
              because every stored amount is measured against it.
            </Text>
          )}
        </Card>

        {loading ? (
          <Card>
            <ActivityIndicator color={theme.primaryAction} />
          </Card>
        ) : statuses.length === 0 ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Exchange rates</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>
              All of your accounts are in {baseCurrency}, so no exchange rate is needed. Add an account in another
              currency and its rate will appear here.
            </Text>
          </Card>
        ) : (
          statuses.map((status) => (
            <RateCard
              baseCurrency={baseCurrency}
              busy={busyCurrency === status.currencyCode}
              disabled={busy}
              key={status.currencyCode}
              manualInput={manualInputs[status.currencyCode] ?? ''}
              onManualInputChange={(value) =>
                setManualInputs((current) => ({ ...current, [status.currencyCode]: value }))}
              onRefresh={() => void refresh(status.currencyCode)}
              onSaveManual={() => void saveManualRate(status.currencyCode)}
              status={status}
            />
          ))
        )}

        <Text style={[styles.caption, { color: theme.mutedText }]}>
          Frankfurter provides reference exchange rates from official sources. Your bank may use a different rate.
        </Text>
      </ScrollView>

      <CurrencyPicker
        disabledCodes={{ [baseCurrency]: 'Already the base currency' }}
        onClose={() => setPickerOpen(false)}
        onSelect={confirmBaseCurrency}
        selected={baseCurrency}
        suggested={[baseCurrency, ...statuses.map((status) => status.currencyCode)]}
        title="Base currency"
        visible={pickerOpen}
      />
      <DialogHost dialog={dialog} />
    </View>
  );
}

function RateCard({
  baseCurrency,
  busy,
  disabled,
  manualInput,
  onManualInputChange,
  onRefresh,
  onSaveManual,
  status,
}: {
  baseCurrency: CurrencyCode;
  busy: boolean;
  disabled: boolean;
  manualInput: string;
  onManualInputChange: (value: string) => void;
  onRefresh: () => void;
  onSaveManual: () => void;
  status: ExchangeRateStatus;
}) {
  const theme = useAppTheme();
  const { currencyCode, rate, freshness } = status;

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
        {currencyCode} · {getCurrency(currencyCode).name}
      </Text>
      {rate ? (
        <>
          <Text style={[styles.rateValue, { color: theme.primaryText }]}>
            {describeRate(toDirectedRate(rate))}
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
          No exchange rate is available. Accounts in {currencyCode} are left out of consolidated totals until one is
          saved.
        </Text>
      )}

      <Button
        busy={busy}
        disabled={disabled && !busy}
        fullWidth
        label="Refresh from Frankfurter"
        onPress={onRefresh}
        size="lg"
        variant="primary"
      />

      <Text style={[styles.body, { color: theme.secondaryText, marginTop: spacing.md }]}>
        Or enter how many {baseCurrency} equal one {currencyCode}. Up to four decimal places.
      </Text>
      <TextInput
        accessibilityLabel={`Manual ${currencyCode} to ${baseCurrency} rate`}
        editable={!disabled}
        keyboardType="decimal-pad"
        onChangeText={onManualInputChange}
        placeholder="e.g. 4100"
        placeholderTextColor={theme.mutedText}
        style={[styles.input, { backgroundColor: theme.elevatedSurface, borderColor: theme.border, color: theme.primaryText }]}
        value={manualInput}
      />
      <Button
        disabled={disabled || manualInput.trim().length === 0}
        fullWidth
        label="Save manual rate"
        onPress={onSaveManual}
        size="lg"
        variant="tonal"
      />
    </Card>
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
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: 1, marginTop: spacing.sm, minHeight: 48, paddingHorizontal: spacing.md },
});
