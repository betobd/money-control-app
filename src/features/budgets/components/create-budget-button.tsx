import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function CreateBudgetButton({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityHint="Opens budget creation"
      accessibilityLabel="Create budget"
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.tintPrimary }]}>
      <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} tintColor={theme.primaryAction} />
      <Text style={[styles.label, { color: theme.primaryAction }]}>Create budget</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 46,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.body,
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
});
