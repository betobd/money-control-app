import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { getCategoryIcon } from '@/features/categories/category-icons';
import type { Category, CategoryTree } from '@/features/categories/category.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

function getTypeTint(type: TransactionFormType, theme: ReturnType<typeof useAppTheme>) {
  if (type === 'income') return theme.tintIncome;
  if (type === 'transfer') return theme.tintTransfer;
  return theme.tintExpense;
}

/** The chosen classification: a category, optionally narrowed to one of its subcategories. */
export type CategorySelection = {
  categoryId: string;
  subcategoryId: string | null;
};

type CategoryGridProps = {
  categories: readonly CategoryTree[];
  selection: CategorySelection | null;
  type: TransactionFormType;
  onSelect: (selection: CategorySelection) => void;
  onViewAll: () => void;
  error?: string;
  subcategoryError?: string;
};

/**
 * Two-level category chooser: a grid of categories, plus a chip row for the
 * selected category's subcategories.
 *
 * The chip row always offers "None", so a category with subcategories can still
 * be used on its own — there is deliberately no synthetic "Other" subcategory to
 * create or maintain.
 */
export function CategoryGrid({
  categories,
  selection,
  type,
  onSelect,
  onViewAll,
  error,
  subcategoryError,
}: CategoryGridProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const tg = t.addTransaction.categoryGrid;
  const tone = getTypeTone(type, theme);
  const tint = getTypeTint(type, theme);
  const selectedCategory = categories.find((category) => category.id === selection?.categoryId);
  const subcategories = selectedCategory?.subcategories ?? [];

  return (
    <View style={styles.group}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: theme.secondaryText }]}>{tg.title}</Text>
        <PressableScale
          accessibilityLabel={tg.viewAllA11y}
          accessibilityRole="button"
          onPress={onViewAll}
          style={styles.viewAll}>
          <Text style={[styles.viewAllText, { color: theme.primaryAction }]}>{tg.viewAll}</Text>
        </PressableScale>
      </View>
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.empty, { color: theme.destructive }]}>{error}</Text> : null}
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {categories.map((category) => {
          const selected = category.id === selection?.categoryId;
          const icon = getCategoryIcon(category.icon);
          const childCount = category.subcategories.length;
          return (
            <PressableScale
              accessibilityHint={childCount > 0 ? tg.hasSubcategories(childCount) : undefined}
              accessibilityLabel={tg.categoryA11y(category.name)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={category.id}
              // Changing category clears the subcategory: a leaf never survives a
              // move to another tree, which is what would create Transporte + Mercado.
              onPress={() => onSelect({ categoryId: category.id, subcategoryId: null })}
              style={[
                styles.category,
                { backgroundColor: selected ? tint : theme.surface },
              ]}>
              <SymbolView
                name={icon}
                size={24}
                tintColor={selected ? tone : theme.secondaryText}
              />
              <Text
                numberOfLines={1}
                style={[styles.categoryLabel, { color: selected ? tone : theme.secondaryText }]}>
                {category.name}
              </Text>
              {childCount > 0 ? (
                <View style={styles.childMarker}>
                  <SymbolView
                    name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
                    size={11}
                    tintColor={selected ? tone : theme.mutedText}
                  />
                </View>
              ) : null}
            </PressableScale>
          );
        })}
        {categories.length === 0 ? <Text style={[styles.empty, { color: theme.secondaryText }]}>{tg.noActive}</Text> : null}
      </View>

      {subcategories.length > 0 && selectedCategory ? (
        <View style={styles.subcategoryGroup}>
          <Text style={[styles.title, { color: theme.secondaryText }]}>
            {tg.detail(selectedCategory.name)}
          </Text>
          <View accessibilityRole="radiogroup" style={styles.chipRow}>
            <SubcategoryChip
              label={tg.none}
              accessibilityLabel={tg.noneA11y(selectedCategory.name)}
              selected={selection?.subcategoryId == null}
              onPress={() => onSelect({ categoryId: selectedCategory.id, subcategoryId: null })}
              tint={tint}
              tone={tone}
            />
            {subcategories.map((subcategory: Category) => (
              <SubcategoryChip
                key={subcategory.id}
                label={subcategory.name}
                accessibilityLabel={tg.subcategoryA11y(subcategory.name, selectedCategory.name)}
                selected={selection?.subcategoryId === subcategory.id}
                onPress={() => onSelect({ categoryId: selectedCategory.id, subcategoryId: subcategory.id })}
                tint={tint}
                tone={tone}
              />
            ))}
          </View>
          {subcategoryError ? (
            <Text accessibilityLiveRegion="polite" style={[styles.chipError, { color: theme.destructive }]}>
              {subcategoryError}
            </Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

type SubcategoryChipProps = {
  label: string;
  accessibilityLabel: string;
  selected: boolean;
  onPress: () => void;
  tint: string;
  tone: string;
};

function SubcategoryChip({ label, accessibilityLabel, selected, onPress, tint, tone }: SubcategoryChipProps) {
  const theme = useAppTheme();
  return (
    <PressableScale
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      // The chip is 32pt tall to stay subtle; hitSlop restores a 44pt target.
      hitSlop={6}
      onPress={onPress}
      style={[styles.chip, { backgroundColor: selected ? tint : theme.surface }]}>
      <Text numberOfLines={1} style={[styles.chipLabel, { color: selected ? tone : theme.secondaryText }]}>
        {label}
      </Text>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  heading: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  viewAll: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
    paddingHorizontal: spacing.sm,
  },
  viewAllText: {
    ...typography.captionStrong,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  category: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    gap: spacing.sm - 2,
    justifyContent: 'center',
    minHeight: 76,
    padding: spacing.sm,
    width: '48.5%',
  },
  categoryLabel: {
    ...typography.captionStrong,
  },
  childMarker: {
    bottom: spacing.xs,
    position: 'absolute',
    right: spacing.xs + 2,
  },
  subcategoryGroup: { gap: spacing.sm },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs + 2,
  },
  chip: {
    alignItems: 'center',
    borderRadius: borderRadii.sm,
    justifyContent: 'center',
    minHeight: 32,
    paddingHorizontal: spacing.sm + 2,
  },
  chipLabel: {
    ...typography.caption,
    fontFamily: fonts.sans.semibold, fontWeight: '600',
  },
  chipError: { ...typography.caption },
  empty: { ...typography.caption, paddingVertical: spacing.md },
});
