import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { CategoryOptionMock, TransactionFormType } from '@/features/add-transaction/add-transaction.mock';
import { useAppTheme } from '@/hooks/use-app-theme';

type CategoryGridProps = {
  categories: readonly CategoryOptionMock[];
  selectedId: string;
  type: Exclude<TransactionFormType, 'transfer'>;
};

export function CategoryGrid({ categories, selectedId, type }: CategoryGridProps) {
  const theme = useAppTheme();
  const tone = getTypeTone(type, theme);

  return (
    <View style={styles.group}>
      <View style={styles.heading}>
        <Text style={[styles.title, { color: theme.secondaryText }]}>Category</Text>
        <Pressable
          accessibilityHint="All categories are not active in this preview"
          accessibilityLabel="View all categories"
          accessibilityRole="button"
          onPress={() => undefined}
          style={styles.viewAll}>
          <Text style={[styles.viewAllText, { color: theme.primaryAction }]}>View All</Text>
        </Pressable>
      </View>
      <View style={styles.grid}>
        {categories.map((category) => {
          const selected = category.id === selectedId;
          return (
            <Pressable
              accessibilityLabel={`${category.label} category`}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              key={category.id}
              onPress={() => undefined}
              style={[
                styles.category,
                {
                  backgroundColor: selected ? theme.elevatedSurface : theme.surface,
                  borderColor: selected ? tone : theme.border,
                },
              ]}>
              <SymbolView
                name={category.icon}
                size={24}
                tintColor={selected ? tone : theme.secondaryText}
              />
              <Text
                numberOfLines={1}
                style={[styles.categoryLabel, { color: selected ? tone : theme.secondaryText }]}> 
                {category.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
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
    ...typography.caption,
    fontWeight: '700',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  category: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    gap: spacing.sm,
    justifyContent: 'center',
    minHeight: 88,
    padding: spacing.sm,
    width: '48.5%',
  },
  categoryLabel: {
    ...typography.caption,
    fontWeight: '700',
  },
});
