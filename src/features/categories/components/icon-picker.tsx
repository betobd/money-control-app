import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import {
  categoryIconCatalog,
  categoryIconGroupNames,
  searchCategoryIcons,
  type CategoryIcon,
} from '../category-icons';

type IconPickerProps = {
  visible: boolean;
  selected: CategoryIcon;
  onSelect: (icon: CategoryIcon) => void;
  onClose: () => void;
};

/**
 * Full-screen searchable icon browser.
 *
 * The catalog is far too large to inline in the category form, so the form keeps
 * a single preview row and the whole grid lives here. Picking closes the sheet:
 * there is nothing else to decide once an icon is chosen.
 */
export function IconPicker({ visible, selected, onSelect, onClose }: IconPickerProps) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [query, setQuery] = useState('');
  const matches = searchCategoryIcons(query);

  function close() {
    setQuery('');
    onClose();
  }

  function choose(icon: CategoryIcon) {
    onSelect(icon);
    close();
  }

  return (
    <Modal animationType="slide" onRequestClose={close} presentationStyle="pageSheet" visible={visible}>
      <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Close icon picker"
            accessibilityRole="button"
            onPress={close}
            style={styles.headerButton}>
            <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
          </Pressable>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Choose icon</Text>
          <View style={styles.headerButton} />
        </View>

        <View style={styles.searchWrapper}>
          <TextInput
            accessibilityLabel="Search category icons"
            autoCorrect={false}
            onChangeText={setQuery}
            placeholder={`Search ${Object.keys(categoryIconCatalog).length} icons`}
            placeholderTextColor={theme.mutedText}
            style={[styles.search, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]}
            value={query}
          />
        </View>

        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}
          keyboardShouldPersistTaps="handled">
          {matches.length === 0 ? (
            <Text style={[styles.empty, { color: theme.secondaryText }]}>No matching icons.</Text>
          ) : null}
          {categoryIconGroupNames.map((group) => {
            const values = matches.filter((value) => categoryIconCatalog[value].group === group);
            if (values.length === 0) return null;
            return (
              <View key={group} style={styles.group}>
                <Text style={[styles.groupLabel, { color: theme.secondaryText }]}>{group}</Text>
                <View accessibilityRole="radiogroup" style={styles.grid}>
                  {values.map((value) => {
                    const definition = categoryIconCatalog[value];
                    const isSelected = selected === value;
                    return (
                      <Pressable
                        accessibilityHint={`Category icon in ${definition.group}`}
                        accessibilityLabel={`${definition.label} icon`}
                        accessibilityRole="radio"
                        accessibilityState={{ selected: isSelected }}
                        key={value}
                        onPress={() => choose(value)}
                        style={[styles.tile, { backgroundColor: isSelected ? theme.tintPrimary : theme.surface, borderColor: isSelected ? theme.primaryAction : 'transparent' }]}>
                        <SymbolView
                          name={definition.symbol}
                          size={24}
                          tintColor={isSelected ? theme.primaryAction : theme.primaryText}
                        />
                        {isSelected ? (
                          <View style={[styles.mark, { backgroundColor: theme.primaryAction }]}>
                            <SymbolView
                              name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                              size={10}
                              tintColor={theme.onPrimaryAction}
                            />
                          </View>
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  searchWrapper: { paddingHorizontal: spacing.md, paddingBottom: spacing.sm },
  search: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 52, paddingHorizontal: spacing.md },
  content: { gap: spacing.lg, padding: spacing.md },
  group: { gap: spacing.sm },
  groupLabel: { ...typography.label, textTransform: 'uppercase' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  tile: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, height: 56, justifyContent: 'center', position: 'relative', width: 56 },
  mark: { alignItems: 'center', borderRadius: borderRadii.full, height: 18, justifyContent: 'center', position: 'absolute', right: 2, top: 2, width: 18 },
  empty: { ...typography.caption },
});
