import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function AddAccountButton({ onPress }: { onPress: () => void }) {
  const theme = useAppTheme();

  return (
    <Pressable
      accessibilityHint="Opens the account form"
      accessibilityLabel="Add account"
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, { borderColor: theme.border }]}>
      <View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}>
        <SymbolView
          name={{ ios: 'plus', android: 'add', web: 'add' }}
          size={26}
          tintColor={theme.primaryAction}
        />
      </View>
      <Text style={[styles.label, { color: theme.primaryAction }]}>Add Account</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderStyle: 'dashed',
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 144,
    padding: spacing.lg,
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
