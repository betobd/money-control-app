import { SymbolView } from 'expo-symbols';
import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { categoryIconCatalog, categoryIconGroupNames, fallbackCategoryIcon, isCategoryIcon, searchCategoryIcons, type CategoryIcon } from '../category-icons';
import { CategoryValidationError } from '../category.service';
import { categoryService } from '../categories';
import type { Category, CategoryType, CategoryValidationErrors } from '../category.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type CategoryFormProps = {
  categoryId?: string;
  initialType?: CategoryType;
  /** Pre-selects a parent, for "add subcategory" from the categories screen. */
  initialParentId?: string;
};

/** Why the parent field is read-only, or undefined when it can be changed. */
function lockReason(hasHistory: boolean, hasChildren: boolean): string | undefined {
  if (hasHistory) return 'This category already has financial history, so it cannot move. Archive it and create a new one instead.';
  if (hasChildren) return 'A category with subcategories cannot become a subcategory itself.';
  return undefined;
}

export function CategoryForm({ categoryId, initialType = 'expense', initialParentId }: CategoryFormProps) {
  const router = useRouter(); const insets = useSafeAreaInsets(); const theme = useAppTheme();
  const [name, setName] = useState(''); const [type, setType] = useState<CategoryType>(initialType); const [icon, setIcon] = useState<CategoryIcon>('other');
  const [parentId, setParentId] = useState<string | null>(initialParentId ?? null);
  const [parents, setParents] = useState<Category[]>([]);
  const [parentLock, setParentLock] = useState<string>();
  const [iconSearch, setIconSearch] = useState('');
  const [errors, setErrors] = useState<CategoryValidationErrors>({}); const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(categoryId)); const [saving, setSaving] = useState(false);
  const selectedParent = parents.find((candidate) => candidate.id === parentId);
  // A subcategory always carries its parent's type, so the type control is
  // meaningless while a parent is selected.
  const typeLocked = parentId !== null;

  useEffect(() => { if (!categoryId) return; categoryService.get(categoryId).then((category) => { if (!category) throw new Error('Category not found.'); setName(category.name); setType(category.type); setParentId(category.parentCategoryId); setIcon(isCategoryIcon(category.icon) ? category.icon : fallbackCategoryIcon); }, (cause) => setGeneralError(toUserMessage(cause, 'Unable to load category.'))).finally(() => setLoading(false)); }, [categoryId]);

  // Only active top-level categories of the current type can be chosen as a
  // parent. The archived list is loaded too, so that an archived parent this
  // category already belongs to is still shown — otherwise editing an archived
  // subcategory would display “Top-level category”, which is simply untrue.
  // Reloaded on type change so switching Expense/Income cannot leave an
  // impossible parent selected.
  useEffect(() => {
    let cancelled = false;
    categoryService.listTree(type, true).then((tree) => {
      if (cancelled) return;
      setParents(tree.filter((candidate) => candidate.id !== categoryId
        && (!candidate.isArchived || candidate.id === parentId)));
    }, () => undefined);
    return () => { cancelled = true; };
  }, [categoryId, parentId, type]);

  useEffect(() => {
    if (!categoryId) return;
    let cancelled = false;
    void Promise.all([
      categoryService.hasFinancialHistory(categoryId),
      categoryService.hasSubcategories(categoryId),
    ]).then(([hasHistory, hasChildren]) => {
      if (!cancelled) setParentLock(lockReason(hasHistory, hasChildren));
    }, () => undefined);
    return () => { cancelled = true; };
  }, [categoryId]);

  function selectParent(next: string | null) {
    setParentId(next);
    setErrors((current) => ({ ...current, parentCategoryId: undefined }));
    const parent = parents.find((candidate) => candidate.id === next);
    if (parent) setType(parent.type);
  }

  async function save() { setSaving(true); setErrors({}); setGeneralError(undefined); try { const input = { name, type, icon, parentCategoryId: parentId }; if (categoryId) await categoryService.update(categoryId, input); else await categoryService.create(input); router.back(); } catch (cause) { if (cause instanceof CategoryValidationError) setErrors(cause.fields); else setGeneralError(toUserMessage(cause, 'Unable to save category.')); } finally { setSaving(false); } }

  if (loading) return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  const heading = categoryId
    ? (parentId ? 'Edit Subcategory' : 'Edit Category')
    : (parentId ? 'New Subcategory' : 'New Category');
  return <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
    <View style={styles.header}><Pressable accessibilityLabel="Close category form" onPress={() => router.back()} style={styles.headerButton}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} /></Pressable><Text style={[styles.headerTitle, { color: theme.primaryText }]}>{heading}</Text><View style={styles.headerButton} /></View>
    <ScrollView contentContainerStyle={[styles.content, { paddingBottom: spacing.xxl }]} keyboardShouldPersistTaps="handled">
      {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text> : null}
      <View style={styles.field}><Overline color={theme.mutedText}>{parentId ? 'Subcategory name' : 'Category name'}</Overline><TextInput accessibilityLabel="Category name" onChangeText={setName} value={name} style={[styles.input, { backgroundColor: theme.surface, borderColor: errors.name ? theme.destructive : theme.hairline, color: theme.primaryText }]} />{errors.name ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.name}</Text> : null}</View>

      <View style={styles.field}>
        <Overline color={theme.mutedText}>Belongs to</Overline>
        {parentLock ? (
          <>
            <View style={[styles.lockedValue, { backgroundColor: theme.disabledSurface }]}>
              <Text style={{ color: theme.secondaryText }}>
                {parentId === null ? 'Top-level category' : selectedParent?.name ?? ''}
              </Text>
            </View>
            <Text style={[styles.hint, { color: theme.mutedText }]}>{parentLock}</Text>
          </>
        ) : (
          <>
            <View accessibilityRole="radiogroup" style={styles.parentList}>
              <Pressable
                accessibilityLabel="Top-level category, no parent"
                accessibilityRole="radio"
                accessibilityState={{ selected: parentId === null }}
                onPress={() => selectParent(null)}
                style={[styles.parentOption, { backgroundColor: parentId === null ? theme.tintPrimary : theme.surface, borderColor: parentId === null ? theme.primaryAction : 'transparent' }]}>
                <Text style={{ color: parentId === null ? theme.primaryText : theme.secondaryText }}>Top-level category</Text>
              </Pressable>
              {parents.map((parent) => {
                const selected = parentId === parent.id;
                // An archived parent is only ever shown because this category is
                // already inside it. It stays visible but cannot be chosen.
                return (
                  <Pressable
                    accessibilityLabel={`Subcategory of ${parent.name}${parent.isArchived ? ', archived' : ''}`}
                    accessibilityRole="radio"
                    accessibilityState={{ selected, disabled: parent.isArchived }}
                    disabled={parent.isArchived}
                    key={parent.id}
                    onPress={() => selectParent(parent.id)}
                    style={[styles.parentOption, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent' }]}>
                    <Text numberOfLines={1} style={{ color: selected ? theme.primaryText : theme.secondaryText }}>
                      {parent.isArchived ? `${parent.name} (archived)` : parent.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={[styles.hint, { color: theme.mutedText }]}>
              {parents.length === 0
                ? 'There are no top-level categories of this type yet, so this will be one.'
                : 'A subcategory can only be one level deep.'}
            </Text>
          </>
        )}
        {errors.parentCategoryId ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.parentCategoryId}</Text> : null}
      </View>

      <View style={styles.field}><Overline color={theme.mutedText}>Category type</Overline><View style={styles.row}>{(['expense', 'income'] as CategoryType[]).map((value) => { const selected = type === value; return <Pressable accessibilityRole="radio" accessibilityState={{ selected, disabled: typeLocked }} disabled={typeLocked} key={value} onPress={() => setType(value)} style={[styles.choice, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent', opacity: typeLocked && !selected ? 0.4 : 1 }]}><Text style={{ color: selected ? theme.primaryText : theme.secondaryText }}>{value === 'expense' ? 'Expense' : 'Income'}</Text></Pressable>; })}</View>{typeLocked ? <Text style={[styles.hint, { color: theme.mutedText }]}>A subcategory always uses its parent&apos;s type.</Text> : null}{errors.type ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.type}</Text> : null}</View>

      <View style={styles.field}><Overline color={theme.mutedText}>Icon</Overline><TextInput accessibilityLabel="Search category icons" onChangeText={setIconSearch} placeholder="Search icons" placeholderTextColor={theme.mutedText} value={iconSearch} style={[styles.input, { backgroundColor: theme.surface, borderColor: theme.hairline, color: theme.primaryText }]} />{categoryIconGroupNames.map((group) => { const values = searchCategoryIcons(iconSearch).filter((value) => categoryIconCatalog[value].group === group); if (!values.length) return null; return <View key={group} style={styles.iconGroup}><Text style={[styles.groupLabel, { color: theme.secondaryText }]}>{group}</Text><View accessibilityRole="radiogroup" style={styles.icons}>{values.map((value) => { const selected = icon === value; const definition = categoryIconCatalog[value]; return <Pressable accessibilityLabel={`${definition.label} icon`} accessibilityHint={`Category icon in ${definition.group}`} accessibilityRole="radio" accessibilityState={{ selected }} key={value} onPress={() => setIcon(value)} style={[styles.icon, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent' }]}><SymbolView name={definition.symbol} size={24} tintColor={selected ? theme.primaryAction : theme.primaryText} />{selected ? <View style={[styles.selectedMark, { backgroundColor: theme.primaryAction }]}><SymbolView name={{ ios: 'checkmark', android: 'check', web: 'check' }} size={10} tintColor={theme.onPrimaryAction} /></View> : null}</Pressable>; })}</View></View>; })}{searchCategoryIcons(iconSearch).length === 0 ? <Text style={[styles.error, { color: theme.secondaryText }]}>No matching icons.</Text> : null}{errors.icon ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.icon}</Text> : null}</View>
    </ScrollView>
    <View style={[styles.footer, { backgroundColor: theme.appBackground, borderTopColor: theme.hairline, paddingBottom: insets.bottom + spacing.md }]}>
      <Button busy={saving} fullWidth label={parentId ? 'Save subcategory' : 'Save category'} onPress={() => void save()} size="lg" variant="primary" />
    </View>
  </KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ flex: { flex: 1 }, loading: { alignItems: 'center', flex: 1, justifyContent: 'center' }, header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm }, headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' }, content: { gap: spacing.lg, padding: spacing.md }, field: { gap: spacing.sm }, input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md }, row: { flexDirection: 'row', gap: spacing.sm }, choice: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flex: 1, justifyContent: 'center', minHeight: 48 }, parentList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, parentOption: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', maxWidth: '100%', minHeight: 44, paddingHorizontal: spacing.md }, lockedValue: { borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md }, hint: { ...typography.caption }, iconGroup: { gap: spacing.sm }, groupLabel: { ...typography.label, textTransform: 'uppercase' }, icons: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }, icon: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, height: 56, justifyContent: 'center', position: 'relative', width: 56 }, selectedMark: { alignItems: 'center', borderRadius: borderRadii.full, height: 18, justifyContent: 'center', position: 'absolute', right: 2, top: 2, width: 18 }, error: { ...typography.caption }, footer: { borderTopWidth: borderWidths.thin, paddingHorizontal: spacing.md, paddingTop: spacing.md }, save: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56 }, saveText: { ...typography.body, fontWeight: '700' } });
