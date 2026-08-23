import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, type AlertButton } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconChip } from '@/components/icon-chip';
import { PressableScale } from '@/components/pressable-scale';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getCategoryIcon } from '../category-icons';
import { CategoryActionError } from '../category.service';
import { categoryService } from '../categories';
import { buildCategoryTree, type Category, type CategoryType } from '../category.types';
import { useCategories } from '../use-categories';

export function CategoriesScreen({ initialType = 'expense' }: { initialType?: CategoryType }) {
  const router = useRouter(); const insets = useSafeAreaInsets(); const theme = useAppTheme(); const [type, setType] = useState<CategoryType>(initialType); const [showArchived, setShowArchived] = useState(false); const [actionError, setActionError] = useState<string>(); const [busyId, setBusyId] = useState<string | null>(null); const busy = busyId !== null;
  const { categories, loading, error, reload } = useCategories(type, true);
  const tree = buildCategoryTree(categories.filter((item) => !item.isArchived));
  // Archived rows are shown as a flat list rather than a second tree: archiving a
  // parent cascades, but a subcategory can be archived on its own under an active
  // parent, so a tree here would be half-empty. The parent name is shown instead.
  const parentNames = new Map(categories.map((item) => [item.id, item.name]));
  const archived = categories.filter((item) => item.isArchived);
  const accent = type === 'income' ? theme.income : theme.expense;
  const accentTint = type === 'income' ? theme.tintIncome : theme.tintExpense;

  async function actions(category: Category, subcategoryCount = 0) {
    if (busy) return;
    setActionError(undefined);
    try {
      const canDelete = await categoryService.canPermanentlyDelete(category.id);
      const isSubcategory = category.parentCategoryId !== null;
      const options: AlertButton[] = [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Edit', onPress: () => router.push({ pathname: '/category-form', params: { id: category.id } }) },
      ];
      if (!isSubcategory && !category.isArchived) {
        options.push({ text: 'Add subcategory', onPress: () => router.push({ pathname: '/category-form', params: { parentId: category.id, type } }) });
      }
      if (category.isArchived) options.push({ text: 'Restore', onPress: () => void run(() => categoryService.restore(category.id), 'restore', category.id) });
      else options.push({ text: 'Archive', onPress: () => confirmArchive(category, subcategoryCount) });
      if (canDelete) options.push({ text: 'Delete permanently', style: 'destructive', onPress: () => confirmDelete(category) });
      Alert.alert(category.name, isSubcategory ? 'Choose a subcategory action.' : 'Choose a category action.', options);
    } catch (cause) {
      setActionError(toUserMessage(cause, 'Unable to load category actions.'));
    }
  }

  async function run(operation: () => Promise<void>, label: string, id: string) { if (busy) return; setBusyId(id); try { await operation(); await reload(); } catch (cause) { if (cause instanceof CategoryActionError) Alert.alert(`Unable to ${label} category`, cause.message); else setActionError(toUserMessage(cause, `Unable to ${label} category.`)); } finally { setBusyId(null); } }

  // Archiving one row needs no confirmation: it is reversible and reversible in
  // one tap. Archiving a parent is different, because it silently takes its
  // subcategories with it, and restore deliberately does not cascade back.
  function confirmArchive(category: Category, subcategoryCount: number) {
    const archive = () => void run(() => categoryService.archive(category.id), 'archive', category.id);
    if (subcategoryCount === 0) { archive(); return; }
    Alert.alert(
      'Archive this category?',
      `${category.name} has ${subcategoryCount} active ${subcategoryCount === 1 ? 'subcategory' : 'subcategories'}, which will be archived too. Restoring the category later does not bring them back automatically.`,
      [{ text: 'Cancel', style: 'cancel' }, { text: 'Archive all', onPress: archive }],
    );
  }

  function confirmDelete(category: Category) { if (busy) return; Alert.alert('Delete category permanently?', `${category.name} will be permanently deleted. This cannot be undone.`, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete permanently', style: 'destructive', onPress: () => void run(() => categoryService.permanentlyDelete(category.id), 'delete', category.id) }]); }

  const dimmed = (id: string) => (busy && busyId !== id ? 0.5 : 1);

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Close categories" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text style={[styles.title, { color: theme.primaryText }]}>Categories</Text>
        <Pressable accessibilityLabel="Add category" onPress={() => router.push({ pathname: '/category-form', params: { type } })} style={styles.headerButton}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={26} tintColor={theme.primaryAction} />
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <View style={[styles.selector, { backgroundColor: theme.elevatedSurface }]}>
          {(['expense', 'income'] as CategoryType[]).map((value) => (
            <Pressable key={value} onPress={() => setType(value)} style={[styles.selectorButton, type === value && { backgroundColor: value === 'income' ? theme.income : theme.expense }]}>
              <Text style={{ color: type === value ? theme.onPrimaryAction : theme.secondaryText, fontWeight: '700' }}>{value === 'expense' ? 'Expense' : 'Income'}</Text>
            </Pressable>
          ))}
        </View>

        {actionError ? <Text style={[styles.error, { color: theme.destructive }]}>{actionError}</Text> : null}
        {loading ? <ActivityIndicator color={theme.primaryAction} /> : null}
        {error ? <Text style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
        {!loading && !error && tree.length === 0 ? (
          <Text style={[styles.empty, { color: theme.secondaryText }]}>No active {type} categories.</Text>
        ) : null}

        {tree.map((category) => (
          <View key={category.id} style={[styles.card, { backgroundColor: theme.surface, opacity: dimmed(category.id) }]}>
            <PressableScale
              accessibilityHint="Opens category actions"
              accessibilityLabel={`${category.name}, ${category.subcategories.length} subcategories`}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy: busyId === category.id }}
              disabled={busy}
              onPress={() => void actions(category, category.subcategories.length)}
              style={styles.cardHeader}>
              <IconChip icon={getCategoryIcon(category.icon)} color={accent} background={accentTint} size={44} iconSize={24} />
              <View style={styles.identity}>
                <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>{category.name}</Text>
                <Text style={[styles.status, { color: theme.secondaryText }]}>
                  {category.subcategories.length === 0
                    ? (type === 'income' ? 'Income' : 'Expense')
                    : `${category.subcategories.length} ${category.subcategories.length === 1 ? 'subcategory' : 'subcategories'}`}
                </Text>
              </View>
              <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={22} tintColor={theme.secondaryText} />
            </PressableScale>

            {category.subcategories.length ? (
              <View style={[styles.subcategories, { borderTopColor: theme.hairline }]}>
                {category.subcategories.map((subcategory) => (
                  <PressableScale
                    accessibilityHint="Opens subcategory actions"
                    accessibilityLabel={`${subcategory.name}, subcategory of ${category.name}`}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: busy, busy: busyId === subcategory.id }}
                    disabled={busy}
                    key={subcategory.id}
                    onPress={() => void actions(subcategory)}
                    style={styles.subcategoryRow}>
                    <SymbolView name={getCategoryIcon(subcategory.icon)} size={17} tintColor={theme.mutedText} />
                    <Text numberOfLines={1} style={[styles.subcategoryName, { color: theme.secondaryText }]}>{subcategory.name}</Text>
                    <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={18} tintColor={theme.mutedText} />
                  </PressableScale>
                ))}
              </View>
            ) : null}

            <Pressable
              accessibilityLabel={`Add a subcategory to ${category.name}`}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push({ pathname: '/category-form', params: { parentId: category.id, type } })}
              style={[styles.addSubcategory, { borderTopColor: theme.hairline }]}>
              <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} tintColor={theme.primaryAction} />
              <Text style={[styles.addSubcategoryLabel, { color: theme.primaryAction }]}>Add subcategory</Text>
            </Pressable>
          </View>
        ))}

        {archived.length ? (
          <>
            <Pressable onPress={() => setShowArchived((value) => !value)} style={styles.archivedToggle}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>Archived ({archived.length})</Text>
              <Text style={{ color: theme.primaryAction }}>{showArchived ? 'Hide' : 'Show'}</Text>
            </Pressable>
            {showArchived ? archived.map((category) => {
              const parentName = category.parentCategoryId ? parentNames.get(category.parentCategoryId) : undefined;
              return (
                <PressableScale
                  accessibilityHint="Opens category actions"
                  accessibilityLabel={`${category.name}, archived${parentName ? `, subcategory of ${parentName}` : ''}`}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy: busyId === category.id }}
                  disabled={busy}
                  key={category.id}
                  onPress={() => void actions(category)}
                  style={[styles.archivedRow, { backgroundColor: theme.disabledSurface, opacity: dimmed(category.id) }]}>
                  <SymbolView name={getCategoryIcon(category.icon)} size={20} tintColor={theme.mutedText} />
                  <View style={styles.identity}>
                    <Text numberOfLines={1} style={[styles.name, { color: theme.secondaryText }]}>{category.name}</Text>
                    <Text style={[styles.status, { color: theme.mutedText }]}>{parentName ? `Archived · in ${parentName}` : 'Archived'}</Text>
                  </View>
                  <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={theme.mutedText} />
                </PressableScale>
              );
            }) : null}
          </>
        ) : null}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.title, flex: 1, fontSize: 26, textAlign: 'center' },
  content: { gap: spacing.md, padding: spacing.md },
  selector: { borderRadius: borderRadii.md, flexDirection: 'row', padding: spacing.xs },
  selectorButton: { alignItems: 'center', borderRadius: borderRadii.sm, flex: 1, justifyContent: 'center', minHeight: 48 },
  card: { borderRadius: borderRadii.card, overflow: 'hidden' },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + spacing.xs, minHeight: 72, paddingHorizontal: spacing.md },
  identity: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: '700' },
  status: { ...typography.caption },
  subcategories: { borderTopWidth: borderWidths.thin, paddingLeft: spacing.md + 44 + spacing.xs },
  subcategoryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingRight: spacing.md },
  subcategoryName: { ...typography.body, flex: 1, fontSize: 14 },
  addSubcategory: { alignItems: 'center', borderTopWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.xs + 2, justifyContent: 'center', minHeight: 44 },
  addSubcategoryLabel: { ...typography.caption, fontWeight: '700' },
  archivedRow: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.sm + spacing.xs, minHeight: 60, paddingHorizontal: spacing.md },
  archivedToggle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  sectionTitle: { ...typography.sectionTitle },
  error: { ...typography.caption },
  empty: { ...typography.body, paddingVertical: spacing.xl, textAlign: 'center' },
});
