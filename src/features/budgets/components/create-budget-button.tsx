import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function CreateBudgetButton() {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityHint="Budget creation is not active in this preview"
      accessibilityLabel="Create budget"
      accessibilityRole="button"
      onPress={() => undefined}
      style={[styles.button, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.primaryAction }]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={26}
          tintColor={theme.onPrimaryAction}
        />
      </View>
      <Text style={[styles.label, { color: theme.primaryAction }]}>Create Budget</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 112,
    padding: spacing.md,
  },
  icon: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    height: 52,
    justifyContent: 'center',
    width: 52,
  },
  label: {
    ...typography.body,
    fontWeight: '700',
  },
});
