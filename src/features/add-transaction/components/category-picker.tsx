import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import type { CategorySelection } from '@/features/add-transaction/components/category-grid';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { filterCategoryTree } from '@/features/categories/category-search';
import type { CategoryTree } from '@/features/categories/category.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type CategoryPickerProps = {
  visible: boolean;
  title?: string;
  categories: readonly CategoryTree[];
  selection: CategorySelection | null;
  onSelect: (selection: CategorySelection) => void;
  onClose: () => void;
  /** Opens category management. Omit to hide the link. */
  onManage?: () => void;
};

/**
 * Searchable two-level category picker.
 *
 * Every row is selectable, including the category rows: choosing a category
 * without a subcategory is a valid classification, not a fallback. Search keeps
 * the hierarchy visible, so a subcategory is never shown without the category it
 * belongs to.
 */
export function CategoryPicker({
  visible,
  title,
  categories,
  selection,
  onSelect,
  onClose,
  onManage,
}: CategoryPickerProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const tp = t.addTransaction.categoryPicker;
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const results = filterCategoryTree(categories, query);

  function choose(next: CategorySelection) {
    onSelect(next);
    setQuery('');
    onClose();
  }

  function close() {
    setQuery('');
    onClose();
  }

  return (
    <Modal animationType="slide" onRequestClose={close} transparent visible={visible}>
      <Pressable
        accessibilityLabel={tp.close}
        onPress={close}
        style={[styles.backdrop, { backgroundColor: theme.overlay }]}
      />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
            {title ?? t.addTransaction.selectCategory}
          </Text>
          <Pressable accessibilityRole="button" onPress={close} style={styles.close}>
            <Text style={{ color: theme.primaryAction }}>{t.common.close}</Text>
          </Pressable>
        </View>

        <TextInput
          accessibilityLabel={tp.searchLabel}
          autoCorrect={false}
          clearButtonMode="while-editing"
          onChangeText={setQuery}
          placeholder={tp.searchPlaceholder}
          placeholderTextColor={theme.mutedText}
          style={[
            styles.search,
            { backgroundColor: theme.elevatedSurface, borderColor: theme.hairline, color: theme.primaryText },
          ]}
          value={query}
        />

        <ScrollView accessibilityRole="radiogroup" keyboardShouldPersistTaps="handled">
          {results.length === 0 ? (
            <Text style={[styles.empty, { color: theme.secondaryText }]}>
              {query ? tp.noMatches(query.trim()) : tp.noActive}
            </Text>
          ) : null}
          {results.map((category) => {
            const categorySelected =
              selection?.categoryId === category.id && selection.subcategoryId === null;
            return (
              <View key={category.id} style={styles.treeGroup}>
                <PressableScale
                  accessibilityLabel={t.addTransaction.categoryGrid.categoryA11y(category.name)}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: categorySelected }}
                  onPress={() => choose({ categoryId: category.id, subcategoryId: null })}
                  style={[
                    styles.row,
                    { backgroundColor: categorySelected ? theme.tintPrimary : theme.elevatedSurface },
                  ]}>
                  <SymbolView name={getCategoryIcon(category.icon)} size={22} tintColor={theme.secondaryText} />
                  <Text numberOfLines={1} style={[styles.rowName, { color: theme.primaryText }]}>
                    {category.name}
                  </Text>
                  {categorySelected ? (
                    <SymbolView
                      name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                      size={18}
                      tintColor={theme.primaryAction}
                    />
                  ) : null}
                </PressableScale>

                {category.subcategories.map((subcategory) => {
                  const selected = selection?.subcategoryId === subcategory.id;
                  return (
                    <PressableScale
                      accessibilityLabel={tp.subcategoryA11y(subcategory.name, category.name)}
                      accessibilityRole="radio"
                      accessibilityState={{ checked: selected }}
                      key={subcategory.id}
                      onPress={() => choose({ categoryId: category.id, subcategoryId: subcategory.id })}
                      style={[
                        styles.row,
                        styles.subrow,
                        { backgroundColor: selected ? theme.tintPrimary : theme.surface },
                      ]}>
                      <View style={[styles.branch, { backgroundColor: theme.border }]} />
                      <Text numberOfLines={1} style={[styles.subrowName, { color: theme.secondaryText }]}>
                        {subcategory.name}
                      </Text>
                      {selected ? (
                        <SymbolView
                          name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                          size={18}
                          tintColor={theme.primaryAction}
                        />
                      ) : null}
                    </PressableScale>
                  );
                })}
              </View>
            );
          })}
        </ScrollView>

        {onManage ? (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              close();
              onManage();
            }}
            style={styles.manage}>
            <Text style={[styles.manageText, { color: theme.primaryAction }]}>{t.addTransaction.manageCategories}</Text>
          </Pressable>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: borderRadii.lg,
    borderTopRightRadius: borderRadii.lg,
    gap: spacing.sm + spacing.xs,
    maxHeight: '80%',
    padding: spacing.md,
  },
  grabber: { alignSelf: 'center', borderRadius: 2, height: 4, marginBottom: spacing.xs, width: 36 },
  heading: { alignItems: 'center', flexDirection: 'row' },
  title: { ...typography.sectionTitle, flex: 1 },
  close: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  search: {
    ...typography.body,
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    minHeight: 44,
    paddingHorizontal: spacing.md,
  },
  treeGroup: { marginBottom: spacing.sm },
  row: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    minHeight: 52,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
  },
  subrow: {
    marginLeft: spacing.lg,
    marginTop: spacing.xs,
    minHeight: 44,
  },
  branch: { borderRadius: 1, height: 2, width: spacing.sm + 2 },
  rowName: { ...typography.bodyStrong, flex: 1 },
  subrowName: { ...typography.body, flex: 1, fontSize: 14 },
  manage: { alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  manageText: { ...typography.captionStrong },
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
});
