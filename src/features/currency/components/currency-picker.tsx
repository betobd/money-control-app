import { SymbolView } from 'expo-symbols';
import { useMemo, useState } from 'react';
import { FlatList, Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { currencyName, listCurrencies, type CurrencyCode, type CurrencyDefinition } from '@/features/currency/currency';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { foldForSearch } from '@/utils/text-search';

type CurrencyPickerProps = {
  visible: boolean;
  title?: string;
  selected: CurrencyCode | null;
  onSelect: (code: CurrencyCode) => void;
  onClose: () => void;
  /**
   * Codes to float to the top under a "Suggested" heading — typically the
   * currencies already in use. Scrolling 160 rows to reach the one you use daily
   * is the difference between a picker and an obstacle.
   */
  suggested?: readonly CurrencyCode[];
  /** Heading over the suggested codes. Defaults to "In use". */
  suggestedLabel?: string;
  /** Codes that cannot be chosen, with the reason shown on the row. */
  disabledCodes?: Readonly<Partial<Record<CurrencyCode, string>>>;
};

type Row =
  | { kind: 'heading'; key: string; label: string }
  | { kind: 'currency'; key: string; definition: CurrencyDefinition };

/** Matches the code, the registry's English name, or the name in the active language. */
function matches(definition: CurrencyDefinition, needle: string): boolean {
  if (!needle) return true;
  return (
    foldForSearch(definition.code).includes(needle) ||
    foldForSearch(definition.name).includes(needle) ||
    foldForSearch(currencyName(definition.code)).includes(needle)
  );
}

/** Searchable list of every supported currency. */
export function CurrencyPicker({
  visible,
  title,
  selected,
  onSelect,
  onClose,
  suggested = [],
  suggestedLabel,
  disabledCodes,
}: CurrencyPickerProps) {
  const theme = useAppTheme();
  // A new catalog on a language change also rebuilds the rows, whose names and
  // search matches follow the language.
  const t = useMessages();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const rows = useMemo<Row[]>(() => {
    const needle = foldForSearch(query);
    const all = listCurrencies();
    const suggestedSet = new Set(suggested);
    const top = all.filter((item) => suggestedSet.has(item.code) && matches(item, needle));
    // A suggested currency is not repeated below: seeing the same row twice reads
    // as two different currencies that happen to share a name.
    const rest = all.filter((item) => !suggestedSet.has(item.code) && matches(item, needle));

    const result: Row[] = [];
    if (top.length > 0) {
      result.push({ kind: 'heading', key: 'heading-suggested', label: suggestedLabel ?? t.currency.pickerInUse });
      for (const item of top) result.push({ kind: 'currency', key: `s-${item.code}`, definition: item });
    }
    if (rest.length > 0) {
      if (top.length > 0) result.push({ kind: 'heading', key: 'heading-all', label: t.currency.pickerAllCurrencies });
      for (const item of rest) result.push({ kind: 'currency', key: item.code, definition: item });
    }
    return result;
  }, [query, suggested, suggestedLabel, t]);

  function close() {
    setQuery('');
    onClose();
  }

  function choose(code: CurrencyCode) {
    onSelect(code);
    setQuery('');
    onClose();
  }

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <Pressable
        accessibilityLabel={t.currency.pickerClose}
        onPress={close}
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
          {title ?? t.currency.pickerTitle}
        </Text>
        <View style={[styles.search, { backgroundColor: theme.elevatedSurface, borderColor: theme.hairline }]}>
          <SymbolView
            name={{ ios: 'magnifyingglass', android: 'search', web: 'search' }}
            size={18}
            tintColor={theme.mutedText}
          />
          <TextInput
            accessibilityLabel={t.currency.pickerSearchLabel}
            autoCapitalize="characters"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={t.currency.pickerSearchPlaceholder}
            placeholderTextColor={theme.mutedText}
            style={[styles.searchInput, { color: theme.primaryText }]}
            value={query}
          />
        </View>

        <FlatList
          data={rows}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(row) => row.key}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: theme.secondaryText }]}>
              {t.currency.pickerNoMatch(query)}
            </Text>
          }
          renderItem={({ item }) => {
            if (item.kind === 'heading') {
              return (
                <Text style={[styles.heading, { color: theme.mutedText }]}>{item.label}</Text>
              );
            }
            const { definition } = item;
            const disabledReason = disabledCodes?.[definition.code];
            const isSelected = definition.code === selected;
            return (
              <PressableScale
                accessibilityHint={disabledReason}
                accessibilityLabel={`${definition.code}, ${currencyName(definition.code)}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSelected, disabled: Boolean(disabledReason) }}
                disabled={Boolean(disabledReason)}
                onPress={() => choose(definition.code)}
                style={StyleSheet.flatten([
                  styles.row,
                  { borderColor: isSelected ? theme.primaryAction : 'transparent' },
                  disabledReason ? styles.rowDisabled : null,
                ])}>
                <Text style={[styles.code, { color: theme.primaryText }]}>{definition.code}</Text>
                <View style={styles.rowText}>
                  <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>
                    {currencyName(definition.code)}
                  </Text>
                  {disabledReason ? (
                    <Text style={[styles.reason, { color: theme.mutedText }]}>{disabledReason}</Text>
                  ) : null}
                </View>
                {isSelected ? (
                  <SymbolView
                    name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                    size={18}
                    tintColor={theme.primaryAction}
                  />
                ) : null}
              </PressableScale>
            );
          }}
          style={styles.list}
        />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: borderRadii.lg,
    borderTopRightRadius: borderRadii.lg,
    maxHeight: '85%',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  grabber: { alignSelf: 'center', borderRadius: borderRadii.full, height: 4, marginBottom: spacing.sm, width: 36 },
  title: { ...typography.sectionTitle, marginBottom: spacing.sm },
  search: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.xs,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  searchInput: { ...typography.body, flex: 1, paddingVertical: spacing.xs },
  list: { marginTop: spacing.sm },
  heading: { ...typography.label, marginBottom: spacing.xs, marginTop: spacing.sm },
  row: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  rowDisabled: { opacity: 0.6 },
  rowText: { flex: 1 },
  code: { ...typography.moneyRow, minWidth: 48 },
  name: { ...typography.body },
  reason: { ...typography.caption },
  empty: { ...typography.body, paddingVertical: spacing.lg, textAlign: 'center' },
});
