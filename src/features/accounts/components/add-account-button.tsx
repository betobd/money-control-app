import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function AddAccountButton({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityHint="Opens the account form"
      accessibilityLabel="Add account"
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { backgroundColor: theme.elevatedSurface }]}>
      <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={20} tintColor={theme.primaryAction} />
      <Text style={[styles.label, { color: theme.primaryAction }]}>Add account</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 50,
    paddingHorizontal: spacing.md,
  },
  label: {
    ...typography.body,
    fontFamily: typography.sectionTitle.fontFamily,
    fontSize: 14,
    fontWeight: '700',
  },
});
