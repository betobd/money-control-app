import { SymbolView } from 'expo-symbols';
import { StyleSheet, TextInput, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function SearchField() {
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.surface, borderColor: theme.border },
      ]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={22}
        tintColor={theme.secondaryText}
      />
      <TextInput
        accessibilityHint="Search is not active in this preview"
        accessibilityLabel="Search transactions"
        editable={false}
        placeholder="Search transactions…"
        placeholderTextColor={theme.mutedText}
        style={[styles.input, { color: theme.primaryText }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.md,
  },
  input: {
    ...typography.body,
    flex: 1,
    minWidth: 0,
    paddingVertical: 0,
  },
});
