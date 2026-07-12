import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type FixedSaveBarProps = {
  bottomInset: number;
  onPress: () => void;
  type: TransactionFormType;
  disabled?: boolean;
  saving?: boolean;
};

export function FixedSaveBar({ bottomInset, onPress, type, disabled = false, saving = false }: FixedSaveBarProps) {
  const theme = useAppTheme();
  const tone = getTypeTone(type, theme);
  const typeLabel = type[0].toUpperCase() + type.slice(1);

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.appBackground,
          borderTopColor: theme.border,
          paddingBottom: Math.max(bottomInset, spacing.md),
        },
      ]}>
      <Pressable
        accessibilityLabel={`Save ${typeLabel}`}
        accessibilityRole="button"
        accessibilityState={{ disabled: disabled || saving }}
        disabled={disabled || saving}
        onPress={onPress}
        style={[styles.button, { backgroundColor: tone }]}> 
        {saving ? <ActivityIndicator color={theme.onPrimaryAction} /> : <SymbolView
          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
          size={22}
          tintColor={theme.onPrimaryAction}
        />}
        <Text style={[styles.label, { color: theme.onPrimaryAction }]}>{saving ? 'Saving…' : `Save ${typeLabel}`}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
  },
  button: {
    alignItems: 'center',
    borderRadius: 28,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.lg,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
  },
});
