import { SymbolView } from 'expo-symbols';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { foldForSearch } from '@/features/categories/category-search';
import { useAppTheme } from '@/hooks/use-app-theme';

export type BudgetCategoryOption = {
  id: string;
  name: string;
  icon: string;
  isArchived: boolean;
  /** Set when the option is a subcategory, so two "Otros" stay distinguishable. */
  parentName: string | null;
};

type Props = {
  categories: BudgetCategoryOption[];
  error?: string;
  onChange: (id: string) => void;
  onSearchChange: (value: string) => void;
  search: string;
  selectedId: string;
};

export function BudgetCategorySelector({ categories, error, onChange, onSearchChange, search, selectedId }: Props) {
  const theme = useAppTheme();
  // Folded like every other category search, and matched against the parent name
  // too so typing "Hogar" surfaces what is inside it.
  const normalized = foldForSearch(search);
  const visible = categories.filter((category) => !normalized
    || foldForSearch(category.name).includes(normalized)
    || (category.parentName !== null && foldForSearch(category.parentName).includes(normalized)));
  return (
    <View style={styles.field}>
      <Overline color={theme.mutedText}>Expense category</Overline>
      <TextInput
        accessibilityLabel="Search expense categories"
        onChangeText={onSearchChange}
        placeholder="Search categories"
        placeholderTextColor={theme.mutedText}
        style={[styles.search, { backgroundColor: theme.surface, borderColor: error ? theme.destructive : theme.hairline, color: theme.primaryText }]}
        value={search}
      />
      <View accessibilityRole="radiogroup" style={styles.grid}>
        {visible.map((category) => {
          const selected = category.id === selectedId;
          return (
            <Pressable
              accessibilityLabel={`${category.name}${category.isArchived ? ', archived' : ''}`}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              key={category.id}
              onPress={() => onChange(category.id)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? theme.tintPrimary : theme.surface,
                  borderColor: selected ? theme.primaryAction : 'transparent',
                },
              ]}>
              <View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}>
                <SymbolView name={getCategoryIcon(category.icon)} size={22} tintColor={selected ? theme.primaryAction : theme.primaryText} />
              </View>
              <Text numberOfLines={2} style={[styles.optionLabel, { color: theme.primaryText }]}>{category.name}</Text>
              {category.parentName ? <Text numberOfLines={1} style={[styles.parent, { color: theme.mutedText }]}>in {category.parentName}</Text> : null}
              {category.isArchived ? <Text style={[styles.archived, { color: theme.mutedText }]}>Archived</Text> : null}
              {selected ? <View style={[styles.check, { backgroundColor: theme.primaryAction }]}><SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={12} tintColor={theme.onPrimaryAction} /></View> : null}
            </Pressable>
          );
        })}
      </View>
      {visible.length === 0 ? <Text style={[styles.empty, { color: theme.secondaryText }]}>No matching active expense categories.</Text> : null}
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  search: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  option: { alignItems: 'center', borderRadius: borderRadii.card, borderWidth: borderWidths.thin, flexBasis: '47%', flexGrow: 1, gap: spacing.xs, justifyContent: 'center', minHeight: 126, padding: spacing.sm, position: 'relative' },
  icon: { alignItems: 'center', borderRadius: borderRadii.full, height: 42, justifyContent: 'center', width: 42 },
  optionLabel: { ...typography.caption, fontWeight: '700', textAlign: 'center' },
  parent: { ...typography.label, maxWidth: '100%', textAlign: 'center' },
  archived: { ...typography.label },
  check: { alignItems: 'center', borderRadius: borderRadii.full, height: 22, justifyContent: 'center', position: 'absolute', right: 6, top: 6, width: 22 },
  empty: { ...typography.caption, paddingVertical: spacing.md, textAlign: 'center' },
  error: { ...typography.caption },
});
