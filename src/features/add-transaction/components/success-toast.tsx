import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SuccessToast({ visible, type }: { visible: boolean; type: TransactionFormType }) {
  const theme = useAppTheme();
  if (!visible) return null;

  const tone = getTypeTone(type, theme);
  const typeLabel = type[0].toUpperCase() + type.slice(1);

  return (
    <View
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={[styles.toast, { backgroundColor: tone }]}>
      <SymbolView
        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
        size={20}
        tintColor={theme.onPrimaryAction}
      />
      <Text style={[styles.text, { color: theme.onPrimaryAction }]}>{typeLabel} saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 46,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    top: 68,
    zIndex: 10,
  },
  text: {
    ...typography.caption,
    fontFamily: fonts.sans.bold,
    fontWeight: '700',
  },
});
