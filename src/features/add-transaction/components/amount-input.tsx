import { StyleSheet, Text, TextInput, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type AmountInputProps = {
  digits: string;
  onDigitsChange: (digits: string) => void;
  type: TransactionFormType;
  error?: string;
};

export function AmountInput({ digits, onDigitsChange, type, error }: AmountInputProps) {
  const theme = useAppTheme();
  const tone = getTypeTone(type, theme);
  const formattedAmount = formatCopDigits(digits);

  return (
    <View style={[styles.container, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
      <Text style={[styles.label, { color: theme.secondaryText }]}>Amount</Text>
      <View style={styles.inputRow}>
        <Text style={[styles.symbol, { color: tone }]}>$</Text>
        <TextInput
          accessibilityLabel="Amount in Colombian pesos"
          autoFocus
          keyboardType="number-pad"
          maxLength={21}
          onChangeText={(value) => onDigitsChange(value.replace(/\D/g, '').slice(0, 16))}
          selectionColor={tone}
          style={[styles.input, { color: theme.primaryText }]}
          value={formattedAmount}
        />
        <Text style={[styles.currency, { color: theme.mutedText }]}>COP</Text>
      </View>
      <Text style={[styles.hint, { color: theme.mutedText }]}>Whole pesos only</Text>
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

function formatCopDigits(digits: string) {
  const normalized = digits.replace(/^0+(?=\d)/, '');
  if (!normalized) return '0';
  return normalized.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

const styles = StyleSheet.create({
  container: {
    borderRadius: borderRadii.lg,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    padding: spacing.lg,
  },
  label: {
    ...typography.body,
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
    fontSize: 38,
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
