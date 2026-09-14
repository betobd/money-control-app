import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type SearchFieldProps = {
  value: string;
  onChangeText: (value: string) => void;
  onClear: () => void;
};

export function SearchField({ value, onChangeText, onClear }: SearchFieldProps) {
  const theme = useAppTheme();
  const t = useMessages();

  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <SymbolView
        name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
        size={22}
        tintColor={theme.secondaryText}
      />
      <TextInput
        accessibilityLabel={t.transactions.list.searchLabel}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="never"
        onChangeText={onChangeText}
        placeholder={t.transactions.list.searchPlaceholder}
        placeholderTextColor={theme.mutedText}
        returnKeyType="search"
        style={[styles.input, { color: theme.primaryText }]}
        value={value}
      />
      {value.length > 0 ? (
        <Pressable
          accessibilityLabel={t.transactions.list.clearSearchLabel}
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
    borderRadius: borderRadii.card,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 50,
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
