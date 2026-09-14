import { useRouter } from 'expo-router';
import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { IconChip } from '@/components/icon-chip';
import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, budgetColorKeys, fonts, spacing, typography, type BudgetColorKey } from '@/constants/theme';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
import { budgetMonthTitle } from '@/features/budgets/budget-month';
import { BudgetValidationError } from '@/features/budgets/budget.service';
import type { BudgetValidationErrors } from '@/features/budgets/budget.types';
import { budgetService } from '@/features/budgets/budgets';
import { BudgetCategorySelector, type BudgetCategoryOption } from '@/features/budgets/components/budget-category-selector';
import { BudgetColorPicker } from '@/features/budgets/components/budget-color-picker';
import { categoryService } from '@/features/categories/categories';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { useAppTheme } from '@/hooks/use-app-theme';
import { intlLocaleFor } from '@/i18n/languages';
import { getMessages } from '@/i18n/messages';
import { useLanguage, useMessages } from '@/i18n/use-messages';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';
import { FixedFooter } from '@/components/fixed-footer';

export function BudgetForm({ budgetId, initialMonth }: { budgetId?: string; initialMonth: string }) {
  const dialog = useDialog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const locale = intlLocaleFor(useLanguage());
  const [categoryId, setCategoryId] = useState('');
  const [month, setMonth] = useState(initialMonth);
  const [digits, setDigits] = useState('');
  const [color, setColor] = useState<BudgetColorKey>(budgetColorKeys[0]);
  const [recurring, setRecurring] = useState(false);
  const [wasRecurring, setWasRecurring] = useState(false);
  const [lockedCategory, setLockedCategory] = useState<{ name: string; icon: string } | null>(null);
  const [categories, setCategories] = useState<BudgetCategoryOption[]>([]);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<BudgetValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(budgetId);
  // An already-recurring budget locks its category and month: the rule owns them.
  const lockCategoryAndMonth = editing && wasRecurring;

  useEffect(() => {
    Promise.all([
      categoryService.listTree('expense', false),
      budgetId ? budgetService.getEditModel(budgetId) : Promise.resolve(null),
    ])
      .then(([tree, budget]) => {
        if (budgetId && !budget) throw new Error(getMessages().budgets.notFound);
        // Flattened parent-then-children, so a subcategory is listed next to the
        // category it belongs to rather than alphabetically somewhere else.
        const options: BudgetCategoryOption[] = tree.flatMap((category) => [
          { id: category.id, name: category.name, icon: category.icon, isArchived: category.isArchived, parentName: null },
          ...category.subcategories.map((subcategory) => ({
            id: subcategory.id,
            name: subcategory.name,
            icon: subcategory.icon,
            isArchived: subcategory.isArchived,
            parentName: category.name,
          })),
        ]);
        if (budget) {
          if (!options.some((category) => category.id === budget.categoryId)) {
            options.unshift({
              id: budget.categoryId,
              name: budget.categoryName,
              icon: budget.categoryIcon,
              isArchived: budget.categoryIsArchived,
              parentName: budget.categoryParentName,
            });
          }
          setCategoryId(budget.categoryId);
          setMonth(budget.month);
          setDigits(String(budget.limitAmount));
          if (budget.color) setColor(budget.color);
          setRecurring(budget.isRecurring);
          setWasRecurring(budget.isRecurring);
          setLockedCategory({ name: budget.categoryName, icon: budget.categoryIcon });
        }
        setCategories(options);
      })
      .catch((cause) => setGeneralError(toUserMessage(cause, getMessages().budgets.loadError)))
      .finally(() => setLoading(false));
  }, [budgetId]);

  function clear(field: keyof BudgetValidationErrors) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const input = { categoryId, month, limitAmount: digits ? Number(digits) : 0, color };
      if (budgetId) await budgetService.update(budgetId, input, { recurring });
      else await budgetService.create(input, { recurring });
      router.back();
    } catch (cause) {
      if (cause instanceof BudgetValidationError) setErrors(cause.fields);
      else setGeneralError(toUserMessage(cause, t.budgets.saveError));
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove() {
    if (!budgetId) return;
    dialog.confirm({
      title: t.budgets.removeTitle,
      message: wasRecurring ? t.budgets.removeRecurringMessage : t.budgets.removeOneOffMessage,
      confirmLabel: t.budgets.removeBudget,
      tone: 'destructive',
      onConfirm: () => {
        void budgetService.remove(budgetId)
          .then(() => router.back())
          .catch((cause) => setGeneralError(toUserMessage(cause, t.budgets.removeError)));
      },
    });
  }

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.flex, { backgroundColor: theme.appBackground }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel={t.budgets.closeForm} title={editing ? t.budgets.editTitle : t.budgets.createTitle} topInset={insets.top + spacing.sm} />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text> : null}
        {lockCategoryAndMonth ? (
          <View style={styles.field}>
            <Overline color={theme.mutedText}>{t.budgets.category}</Overline>
            <View style={[styles.readonlyRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
              <IconChip background={theme.elevatedSurface} color={theme.secondaryText} icon={getCategoryIcon(lockedCategory?.icon ?? 'other')} iconSize={19} size={36} />
              <Text style={[styles.readonlyText, { color: theme.primaryText }]}>{lockedCategory?.name ?? ''}</Text>
            </View>
          </View>
        ) : (
          <BudgetCategorySelector
            categories={categories}
            error={errors.categoryId}
            onChange={(value) => { setCategoryId(value); clear('categoryId'); }}
            onSearchChange={setSearch}
            search={search}
            selectedId={categoryId}
          />
        )}

        <View style={styles.field}>
          <Overline color={theme.mutedText}>{t.budgets.budgetMonth}</Overline>
          {lockCategoryAndMonth ? (
            <View style={[styles.readonlyRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
              <Text style={[styles.readonlyText, { color: theme.primaryText }]}>{budgetMonthTitle(month, locale)}</Text>
            </View>
          ) : (
            <>
              <TextInput
                accessibilityLabel={t.budgets.budgetMonthInput}
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={7}
                onChangeText={(value) => { setMonth(value.replace(/[^\d-]/g, '').slice(0, 7)); clear('month'); }}
                placeholder={t.budgets.monthPlaceholder}
                placeholderTextColor={theme.mutedText}
                style={[styles.input, { backgroundColor: theme.surface, borderColor: errors.month ? theme.destructive : theme.hairline, color: theme.primaryText }]}
                value={month}
              />
              {errors.month ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{errors.month}</Text> : null}
            </>
          )}
        </View>

        <AmountInput
          autoFocus={false}
          digits={digits}
          error={errors.limitAmount}
          label={t.budgets.budgetLimit}
          onDigitsChange={(value) => { setDigits(value); clear('limitAmount'); }}
          type="expense"
        />

        <BudgetColorPicker onChange={(value) => { setColor(value); clear('color'); }} value={color} />
        {errors.color ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{errors.color}</Text> : null}

        <View style={[styles.recurringRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          <View style={styles.recurringText}>
            <Text style={[styles.recurringTitle, { color: theme.primaryText }]}>{t.budgets.repeatTitle}</Text>
            <Text style={[styles.recurringHint, { color: theme.mutedText }]}>
              {t.budgets.repeatHint}
            </Text>
          </View>
          <Switch
            accessibilityLabel={t.budgets.repeatAccessibility}
            onValueChange={setRecurring}
            value={recurring}
          />
        </View>

        {editing ? (
          <Button accessibilityLabel={t.budgets.removeBudget} fullWidth label={t.budgets.removeBudget} onPress={confirmRemove} size="lg" variant="destructive" />
        ) : null}
      </ScrollView>

      <FixedFooter bottomInset={insets.bottom}>
        <Button
          accessibilityLabel={editing ? t.budgets.saveBudgetChanges : t.budgets.createBudget}
          busy={saving}
          fullWidth
          label={editing ? t.budgets.saveChanges : t.budgets.createBudget}
          onPress={() => void save()}
          size="lg"
          variant="primary"
        />
      </FixedFooter>
      <DialogHost dialog={dialog} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xxl },
  field: { gap: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  readonlyRow: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.sm + 2, minHeight: 56, paddingHorizontal: spacing.md },
  readonlyText: { ...typography.body, flex: 1 },
  recurringRow: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  recurringText: { flex: 1, gap: 2 },
  recurringTitle: { ...typography.body, fontFamily: fonts.sans.semibold, fontWeight: '600' },
  recurringHint: { ...typography.caption, fontSize: 12, lineHeight: 16 },
  error: { ...typography.caption },
});
