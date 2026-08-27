import { StyleSheet, Text, TextInput, View } from 'react-native';
import { getBaseCurrency } from '@/features/settings/settings';

import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { getCurrency, type CurrencyCode } from '@/features/currency/currency';
import { useAppTheme } from '@/hooks/use-app-theme';

type AmountInputProps = {
  autoFocus?: boolean;
  /** Raw entry text (digits, plus a decimal point for currencies with cents). */
  digits: string;
  label?: string;
  onDigitsChange: (digits: string) => void;
  type: TransactionFormType;
  currency?: CurrencyCode;
  error?: string;
};

/** Sanitizes raw amount entry for the currency: digits and, for USD, up to 2 decimals. */
export function sanitizeAmountEntry(value: string, currency: CurrencyCode): string {
  if (getCurrency(currency).fractionDigits === 0) return value.replace(/\D/g, '').slice(0, 16);
  let cleaned = value.replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot >= 0) {
    cleaned = `${cleaned.slice(0, firstDot + 1)}${cleaned.slice(firstDot + 1).replace(/\./g, '').slice(0, 2)}`;
  }
  return cleaned.slice(0, 19);
}

function formatAmountEntry(value: string, currency: CurrencyCode): string {
  const definition = getCurrency(currency);
  if (!value) return '0';
  const [whole, fraction] = value.split('.');
  const normalizedWhole = whole.replace(/^0+(?=\d)/, '') || '0';
  const grouped = Number(normalizedWhole).toLocaleString(definition.locale, { maximumFractionDigits: 0 });
  if (fraction === undefined) return grouped;
  return `${grouped}${definition.decimalSeparator}${fraction}`;
}

export function AmountInput({ autoFocus = true, digits, label = 'Amount', onDigitsChange, type, currency = getBaseCurrency(), error }: AmountInputProps) {
  const theme = useAppTheme();
  const tone = getTypeTone(type, theme);
  const definition = getCurrency(currency);
  const formattedAmount = formatAmountEntry(digits, currency);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      <View style={styles.inputRow}>
        <Text style={[styles.symbol, { color: tone }]}>{definition.symbol}</Text>
        <TextInput
          accessibilityLabel={`Amount in ${definition.name}`}
          autoFocus={autoFocus}
          keyboardType={definition.fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
          maxLength={24}
          onChangeText={(value) => onDigitsChange(sanitizeAmountEntry(value, currency))}
          selectionColor={tone}
          style={[styles.input, { color: theme.primaryText }]}
          value={formattedAmount}
        />
        <Text style={[styles.currency, { color: theme.mutedText }]}>{currency}</Text>
      </View>
      <Text style={[styles.hint, { color: theme.mutedText }]}>
        {definition.fractionDigits > 0 ? 'Up to 2 decimals' : 'Whole pesos only'}
      </Text>
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadii.lg,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  label: {
    ...typography.body,
    fontFamily: fonts.sans.semibold,
    fontSize: 13,
    lineHeight: 17,
    textAlign: 'center',
  },
  inputRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    justifyContent: 'center',
    maxWidth: '100%',
  },
  symbol: {
    ...typography.display,
    marginRight: spacing.xs,
  },
  input: {
    ...typography.display,
    flex: 1,
    fontFamily: fonts.mono.bold,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    maxWidth: '78%',
    minWidth: 0,
    padding: 0,
    textAlign: 'center',
  },
  currency: {
    ...typography.caption,
    marginLeft: spacing.xs,
  },
  hint: {
    ...typography.label,
    textAlign: 'center',
  },
  error: { ...typography.caption, textAlign: 'center' },
});
