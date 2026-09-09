import { StyleSheet, Text, TextInput, View } from 'react-native';
import { getBaseCurrency } from '@/features/settings/settings';

import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { formatMoneyEntry, getCurrency, sanitizeMoneyEntry, type CurrencyCode } from '@/features/currency/currency';
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

/**
 * Sanitizes raw amount entry for the currency.
 *
 * Kept as a named re-export because the hero amount field and every other money
 * field must agree on what a valid entry is; see `money-entry.ts`.
 */
export function sanitizeAmountEntry(value: string, currency: CurrencyCode): string {
  return sanitizeMoneyEntry(value, currency);
}

/** The hero field shows `0` rather than an empty box when nothing is typed. */
function formatAmountEntry(value: string, currency: CurrencyCode): string {
  return formatMoneyEntry(value, currency) || '0';
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
