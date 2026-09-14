import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionSheet, actionIcons, type SheetAction } from '@/components/action-sheet';
import { DialogHost, useDialog } from '@/components/dialog';
import { EmptyState } from '@/components/empty-state';
import { IconChip } from '@/components/icon-chip';
import { PressableScale } from '@/components/pressable-scale';
import { SegmentedControl } from '@/components/segmented-control';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { Messages } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import { getCategoryIcon } from '../category-icons';
import { CategoryActionError, type CategoryDeletionBlocker } from '../category.service';
import { categoryService } from '../categories';
import { buildCategoryTree, type Category, type CategoryType } from '../category.types';
import { useCategories } from '../use-categories';
import { ScreenHeader } from '@/components/screen-header';

/**
 * Why permanent deletion is unavailable, phrased for the user.
 *
 * Archived subcategories are the confusing case: they still belong to the
 * category but are listed apart from it, so "has subcategories" on its own reads
 * as wrong. The count says where to look.
 */
function deletionReason(
  messages: Messages['categories'],
  blocker: CategoryDeletionBlocker,
  subcategories: { active: number; archived: number },
): string | undefined {
  if (blocker === null) return undefined;
  if (blocker === 'history') return messages.deletionBlockedByHistory;
  const total = subcategories.active + subcategories.archived;
  return messages.deletionBlockedBySubcategories(total, subcategories.archived);
}

/** What the data-dependent rows need. `null` until the two queries answer. */
type CategoryActionDetails = {
  blocker: CategoryDeletionBlocker;
  subcategories: { active: number; archived: number };
};

type SheetTarget = {
  category: Category;
  details: CategoryActionDetails | null;
};

export function CategoriesScreen({ initialType = 'expense' }: { initialType?: CategoryType }) {
  const router = useRouter(); const insets = useSafeAreaInsets(); const theme = useAppTheme(); const t = useMessages(); const [type, setType] = useState<CategoryType>(initialType); const [showArchived, setShowArchived] = useState(false); const [actionError, setActionError] = useState<string>(); const [busyId, setBusyId] = useState<string | null>(null); const busy = busyId !== null;
  const dialog = useDialog();
  const [sheet, setSheet] = useState<SheetTarget | null>(null);
  const { categories, loading, error, reload } = useCategories(type, true);
  const tree = buildCategoryTree(categories.filter((item) => !item.isArchived));
  // Archived rows are shown as a flat list rather than a second tree: archiving a
  // parent cascades, but a subcategory can be archived on its own under an active
  // parent, so a tree here would be half-empty. The parent name is shown instead.
  const parentNames = new Map(categories.map((item) => [item.id, item.name]));
  const archived = categories.filter((item) => item.isArchived);
  const accent = type === 'income' ? theme.income : theme.expense;
  const accentTint = type === 'income' ? theme.tintIncome : theme.tintExpense;

  /**
   * Opens the action sheet immediately, then fills in what needs the database.
   *
   * The two queries used to run before `setSheet`, so tapping a category sat
   * unresponsive for as long as they took (~1s on a real list). Only the rows
   * that actually depend on the answer wait for it.
   */
  function actions(category: Category) {
    if (busy) return;
    setActionError(undefined);
    setSheet({ category, details: null });
    void Promise.all([
      categoryService.deletionBlocker(category.id),
      categoryService.countSubcategories(category.id),
    ]).then(
      ([blocker, subcategories]) => {
        // Ignore a late answer for a category the user already navigated away from.
        setSheet((current) => current && current.category.id === category.id
          ? { ...current, details: { blocker, subcategories } }
          : current);
      },
      (cause: unknown) => {
        setSheet(null);
        setActionError(toUserMessage(cause, t.categories.loadActionsFailed));
      },
    );
  }

  /** The sheet rows for a category, degrading gracefully while `details` loads. */
  function sheetActions(category: Category, details: CategoryActionDetails | null): SheetAction[] {
    const isSubcategory = category.parentCategoryId !== null;
    const options: SheetAction[] = [
      { label: t.common.edit, icon: actionIcons.edit, onPress: () => router.push({ pathname: '/category-form', params: { id: category.id } }) },
    ];
    if (!isSubcategory && !category.isArchived) {
      options.push({
        label: t.categories.addSubcategory,
        description: t.categories.addSubcategoryDescription,
        icon: { ios: 'plus', android: 'add', web: 'add' },
        onPress: () => router.push({ pathname: '/category-form', params: { parentId: category.id, type } }),
      });
    }
    if (category.isArchived) {
      options.push({ label: t.categories.restore, icon: actionIcons.restore, onPress: () => void run(() => categoryService.restore(category.id), 'restore', category.id) });
    } else {
      const active = details?.subcategories.active ?? 0;
      options.push({
        label: t.categories.archive,
        // Stays tappable while the count loads: archiving is the common action,
        // and the count only decides whether a confirmation is needed.
        description: details === null
          ? t.categories.archiveDescription
          : active > 0
            ? t.categories.archiveAlsoSubcategories(active)
            : t.categories.archiveDescription,
        icon: actionIcons.archive,
        onPress: () => void confirmArchive(category, details?.subcategories.active),
      });
    }
    // The row is always present. Hiding it left no way to tell "this cannot be
    // deleted" apart from "this app has no delete".
    options.push({
      label: t.categories.deletePermanently,
      description: details === null
        ? t.categories.checkingDeletion
        : deletionReason(t.categories, details.blocker, details.subcategories),
      disabled: details === null || details.blocker !== null,
      icon: actionIcons.delete,
      tone: 'destructive',
      onPress: () => confirmDelete(category),
    });
    return options;
  }

  async function run(operation: () => Promise<void>, label: keyof Messages['categories']['actionFailed'], id: string) { if (busy) return; setBusyId(id); try { await operation(); await reload(); } catch (cause) { if (cause instanceof CategoryActionError) dialog.notice({ title: t.categories.actionFailed[label], message: cause.message }); else setActionError(toUserMessage(cause, `${t.categories.actionFailed[label]}.`)); } finally { setBusyId(null); } }

  // Archiving one row needs no confirmation: it is reversible and reversible in
  // one tap. Archiving a parent is different, because it silently takes its
  // subcategories with it, and restore deliberately does not cascade back.
  async function confirmArchive(category: Category, knownSubcategoryCount?: number) {
    const archive = () => void run(() => categoryService.archive(category.id), 'archive', category.id);
    // Resolved on demand in the rare case the sheet was tapped before the count
    // arrived, so the cascade warning is never skipped for lack of data.
    let subcategoryCount = knownSubcategoryCount;
    if (subcategoryCount === undefined) {
      try {
        subcategoryCount = (await categoryService.countSubcategories(category.id)).active;
      } catch (cause) {
        setActionError(toUserMessage(cause, t.categories.loadActionsFailed));
        return;
      }
    }
    if (subcategoryCount === 0) { archive(); return; }
    dialog.confirm({
      title: t.categories.archiveConfirmTitle,
      message: t.categories.archiveConfirmMessage(category.name, subcategoryCount),
      confirmLabel: t.categories.archiveAll,
      onConfirm: archive,
    });
  }

  function confirmDelete(category: Category) {
    if (busy) return;
    dialog.confirm({
      title: t.categories.deleteConfirmTitle,
      message: t.categories.deleteConfirmMessage(category.name),
      confirmLabel: t.categories.deletePermanently,
      tone: 'destructive',
      onConfirm: () => void run(() => categoryService.permanentlyDelete(category.id), 'delete', category.id),
    });
  }

  const dimmed = (id: string) => (busy && busyId !== id ? 0.5 : 1);

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader
        action={{ kind: 'add', accessibilityLabel: t.categories.add, onPress: () => router.push({ pathname: '/category-form', params: { type } }) }}
        leading="close"
        leadingAccessibilityLabel={t.categories.close}
        title={t.categories.title}
      />

      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xl }]}>
        <SegmentedControl
          accessibilityLabel={t.categories.typeLabel}
          onChange={setType}
          segments={[
            { value: 'expense', label: t.categories.expense },
            { value: 'income', label: t.categories.income },
          ]}
          value={type}
        />

        {actionError ? <Text style={[styles.error, { color: theme.destructive }]}>{actionError}</Text> : null}
        {loading ? <ActivityIndicator color={theme.primaryAction} /> : null}
        {error ? <Text style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
        {!loading && !error && tree.length === 0 ? (
          <EmptyState
            action={{ label: t.categories.add, onPress: () => router.push({ pathname: '/category-form', params: { type } }) }}
            body={type === 'income' ? t.categories.emptyBodyIncome : t.categories.emptyBodyExpense}
            icon={{ ios: 'square.grid.2x2.fill', android: 'category', web: 'category' }}
            title={type === 'income' ? t.categories.emptyTitleIncome : t.categories.emptyTitleExpense}
          />
        ) : null}

        {tree.map((category) => (
          <View key={category.id} style={[styles.card, { backgroundColor: theme.surface, opacity: dimmed(category.id) }]}>
            <PressableScale
              accessibilityHint={t.categories.categoryRowHint}
              accessibilityLabel={t.categories.categoryRowLabel(category.name, category.subcategories.length)}
              accessibilityRole="button"
              accessibilityState={{ disabled: busy, busy: busyId === category.id }}
              disabled={busy}
              onPress={() => void actions(category)}
              style={styles.cardHeader}>
              <IconChip icon={getCategoryIcon(category.icon)} color={accent} background={accentTint} size={44} iconSize={24} />
              <View style={styles.identity}>
                <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>{category.name}</Text>
                <Text style={[styles.status, { color: theme.secondaryText }]}>
                  {category.subcategories.length === 0
                    ? (type === 'income' ? t.categories.income : t.categories.expense)
                    : t.categories.subcategoryCount(category.subcategories.length)}
                </Text>
              </View>
              <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={22} tintColor={theme.secondaryText} />
            </PressableScale>

            {category.subcategories.length ? (
              <View style={[styles.subcategories, { borderTopColor: theme.hairline }]}>
                {category.subcategories.map((subcategory) => (
                  <PressableScale
                    accessibilityHint={t.categories.subcategoryRowHint}
                    accessibilityLabel={t.categories.subcategoryRowLabel(subcategory.name, category.name)}
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
              accessibilityLabel={t.categories.addSubcategoryTo(category.name)}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => router.push({ pathname: '/category-form', params: { parentId: category.id, type } })}
              style={[styles.addSubcategory, { borderTopColor: theme.hairline }]}>
              <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={14} tintColor={theme.primaryAction} />
              <Text style={[styles.addSubcategoryLabel, { color: theme.primaryAction }]}>{t.categories.addSubcategory}</Text>
            </Pressable>
          </View>
        ))}

        {archived.length ? (
          <>
            <Pressable onPress={() => setShowArchived((value) => !value)} style={styles.archivedToggle}>
              <Text style={[styles.sectionTitle, { color: theme.primaryText }]}>{t.categories.archivedSection(archived.length)}</Text>
              <Text style={{ color: theme.primaryAction }}>{showArchived ? t.categories.hide : t.categories.show}</Text>
            </Pressable>
            {showArchived ? archived.map((category) => {
              const parentName = category.parentCategoryId ? parentNames.get(category.parentCategoryId) : undefined;
              return (
                <PressableScale
                  accessibilityHint={t.categories.categoryRowHint}
                  accessibilityLabel={t.categories.archivedRowLabel(category.name, parentName)}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: busy, busy: busyId === category.id }}
                  disabled={busy}
                  key={category.id}
                  onPress={() => void actions(category)}
                  style={[styles.archivedRow, { backgroundColor: theme.disabledSurface, opacity: dimmed(category.id) }]}>
                  <SymbolView name={getCategoryIcon(category.icon)} size={20} tintColor={theme.mutedText} />
                  <View style={styles.identity}>
                    <Text numberOfLines={1} style={[styles.name, { color: theme.secondaryText }]}>{category.name}</Text>
                    <Text style={[styles.status, { color: theme.mutedText }]}>{parentName ? t.categories.archivedIn(parentName) : t.categories.archived}</Text>
                  </View>
                  <SymbolView name={{ ios: 'ellipsis', android: 'more_vert', web: 'more_vert' }} size={20} tintColor={theme.mutedText} />
                </PressableScale>
              );
            }) : null}
          </>
        ) : null}
      </ScrollView>

      <ActionSheet
        actions={sheet ? sheetActions(sheet.category, sheet.details) : []}
        description={sheet?.category.parentCategoryId ? t.categories.chooseSubcategoryAction : t.categories.chooseCategoryAction}
        onClose={() => setSheet(null)}
        title={sheet?.category.name ?? ''}
        visible={sheet !== null}
      />
      <DialogHost dialog={dialog} />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.md },
  card: { borderRadius: borderRadii.card, overflow: 'hidden' },
  cardHeader: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm + spacing.xs, minHeight: 72, paddingHorizontal: spacing.md },
  identity: { flex: 1, minWidth: 0 },
  name: { ...typography.bodyStrong },
  status: { ...typography.caption },
  subcategories: { borderTopWidth: borderWidths.thin, paddingLeft: spacing.md + 44 + spacing.xs },
  subcategoryRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.sm, minHeight: 48, paddingRight: spacing.md },
  subcategoryName: { ...typography.body, flex: 1, fontSize: 14 },
  addSubcategory: { alignItems: 'center', borderTopWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.xs + 2, justifyContent: 'center', minHeight: 44 },
  // captionStrong, not caption + fontWeight: the unpaired form clipped this label
  // to "+ Add" on Android (see typography.captionStrong).
  addSubcategoryLabel: { ...typography.captionStrong },
  archivedRow: { alignItems: 'center', borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.sm + spacing.xs, minHeight: 60, paddingHorizontal: spacing.md },
  archivedToggle: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 48 },
  sectionTitle: { ...typography.sectionTitle },
  error: { ...typography.caption },
});
