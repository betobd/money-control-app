import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
};

export function SearchField({ value, onChangeText, onClear }: SearchFieldProps) {
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
        accessibilityLabel="Search transactions"
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        onChangeText={onChangeText}
        placeholder="Search transactions…"
        placeholderTextColor={theme.mutedText}
        returnKeyType="search"
        style={[styles.input, { color: theme.primaryText }]}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel="Clear transaction search"
          accessibilityRole="button"
          hitSlop={8}
          onPress={onClear}
          style={styles.clearButton}>
          <SymbolView
            name={{ ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' }}
            size={22}
            tintColor={theme.secondaryText}
          />
        </Pressable>
      ) : null}
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
  clearButton: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
});
