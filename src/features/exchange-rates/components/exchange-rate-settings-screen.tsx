import { useState } from 'react';
import {
  ActivityIndicator,
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
import { getIntlLocale, getMessages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import { currencyName, describeRate, type CurrencyCode } from '@/features/currency/currency';
import { CurrencyPicker } from '@/features/currency/components/currency-picker';
import { baseCurrencyLockMessage, settingsService } from '@/features/settings/settings';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { useExchangeRates } from '../use-exchange-rate';
import { toDirectedRate, type ExchangeRateRecord, type ExchangeRateStatus } from '../exchange-rate.types';
import { ScreenHeader } from '@/components/screen-header';

function formatFetchedAt(value: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

function sourceLabel(record: ExchangeRateRecord): string {
  const t = getMessages().exchangeRates;
  return record.source === 'frankfurter' ? t.sourceFrankfurter : t.sourceManual;
}

export function ExchangeRateSettingsScreen() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const dialog = useDialog();
  const t = useMessages();
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
      setNotice(t.exchangeRates.savedRate(currency, baseCurrency));
    } catch {
      // Surfaced through the hook's `error`.
    }
  }

  async function chooseBaseCurrency(code: CurrencyCode): Promise<void> {
    setNotice(undefined);
    try {
      await settingsService.setBaseCurrency(code);
      await reload();
      setNotice(t.exchangeRates.baseCurrencyNow(code));
    } catch (cause) {
      dialog.notice({
        title: t.exchangeRates.cannotChangeBaseTitle,
        message: toUserMessage(cause, t.exchangeRates.cannotChangeBaseFallback),
      });
    }
  }

  function confirmBaseCurrency(code: CurrencyCode): void {
    if (code === baseCurrency) return;
    dialog.confirm({
      title: t.exchangeRates.confirmBaseTitle(code),
      message: t.exchangeRates.confirmBaseMessage(code),
      confirmLabel: t.exchangeRates.confirmBaseLabel(code),
      onConfirm: () => void chooseBaseCurrency(code),
    });
  }

  const locked = lock.reason !== null;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" leadingDisabled={busy} title={t.exchangeRates.title} />

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
          <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.exchangeRates.baseCurrency}</Text>
          <Text style={[styles.rateValue, { color: theme.primaryText }]}>{baseCurrency}</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>
            {t.exchangeRates.baseCurrencyBody(currencyName(baseCurrency), baseCurrency)}
          </Text>
          <Button
            disabled={locked || busy}
            fullWidth
            label={t.exchangeRates.changeBaseCurrency}
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
              {t.exchangeRates.baseCurrencyUnlockedHint}
            </Text>
          )}
        </Card>

        {loading ? (
          <Card>
            <ActivityIndicator color={theme.primaryAction} />
          </Card>
        ) : statuses.length === 0 ? (
          <Card>
            <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.exchangeRates.exchangeRatesTitle}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>
              {t.exchangeRates.noRatesNeeded(baseCurrency)}
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
          {t.exchangeRates.providerDisclaimer}
        </Text>
      </ScrollView>

      <CurrencyPicker
        disabledCodes={{ [baseCurrency]: t.exchangeRates.alreadyBaseCurrency }}
        onClose={() => setPickerOpen(false)}
        onSelect={confirmBaseCurrency}
        selected={baseCurrency}
        suggested={[baseCurrency, ...statuses.map((status) => status.currencyCode)]}
        title={t.exchangeRates.baseCurrency}
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
  const t = useMessages();
  const { currencyCode, rate, freshness } = status;

  return (
    <Card>
      <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>
        {currencyCode} · {currencyName(currencyCode)}
      </Text>
      {rate ? (
        <>
          <Text style={[styles.rateValue, { color: theme.primaryText }]}>
            {describeRate(toDirectedRate(rate))}
          </Text>
          {freshness === 'stale' ? (
            <View style={[styles.badge, { backgroundColor: theme.tintWarning }]}>
              <Text style={[styles.badgeText, { color: theme.warning }]}>{t.exchangeRates.staleBadge}</Text>
            </View>
          ) : (
            <View style={[styles.badge, { backgroundColor: theme.tintIncome }]}>
              <Text style={[styles.badgeText, { color: theme.income }]}>{t.exchangeRates.freshBadge}</Text>
            </View>
          )}
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>{t.exchangeRates.source}</Text>
            <Text style={[styles.value, { color: theme.primaryText }]}>{sourceLabel(rate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>{t.exchangeRates.rateDate}</Text>
            <Text style={[styles.value, { color: theme.primaryText }]}>{formatTransactionDate(rate.effectiveDate)}</Text>
          </View>
          <View style={styles.row}>
            <Text style={[styles.label, { color: theme.secondaryText }]}>{t.exchangeRates.lastUpdated}</Text>
            <Text style={[styles.value, { color: theme.primaryText }]}>{formatFetchedAt(rate.fetchedAt)}</Text>
          </View>
        </>
      ) : (
        <Text style={[styles.body, { color: theme.secondaryText }]}>
          {t.exchangeRates.noRateAvailable(currencyCode)}
        </Text>
      )}

      <Button
        busy={busy}
        disabled={disabled && !busy}
        fullWidth
        label={t.exchangeRates.refreshFromFrankfurter}
        onPress={onRefresh}
        size="lg"
        variant="primary"
      />

      <Text style={[styles.body, { color: theme.secondaryText, marginTop: spacing.md }]}>
        {t.exchangeRates.manualRateHint(baseCurrency, currencyCode)}
      </Text>
      <TextInput
        accessibilityLabel={t.exchangeRates.manualRateLabel(currencyCode, baseCurrency)}
        editable={!disabled}
        keyboardType="decimal-pad"
        onChangeText={onManualInputChange}
        placeholder={t.exchangeRates.manualRatePlaceholder}
        placeholderTextColor={theme.mutedText}
        style={[styles.input, { backgroundColor: theme.elevatedSurface, borderColor: theme.border, color: theme.primaryText }]}
        value={manualInput}
      />
      <Button
        disabled={disabled || manualInput.trim().length === 0}
        fullWidth
        label={t.exchangeRates.saveManualRate}
        onPress={onSaveManual}
        size="lg"
        variant="tonal"
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
