import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
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
      style={[styles.toast, { backgroundColor: theme.surface, borderColor: tone }]}> 
      <SymbolView
        name={{ ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
        size={22}
        tintColor={tone}
      />
      <Text style={[styles.text, { color: theme.primaryText }]}>{typeLabel} preview saved</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  toast: {
    alignItems: 'center',
    alignSelf: 'center',
    borderRadius: borderRadii.full,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    position: 'absolute',
    top: 68,
    zIndex: 10,
  },
  text: {
    ...typography.caption,
    fontWeight: '700',
  },
});
