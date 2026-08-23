import { useRouter } from 'expo-router';
import { Button } from '@/components/button';
import { toUserMessage } from '@/errors/user-error';
import { SymbolView } from 'expo-symbols';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
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
import { budgetMonthLabel } from '@/features/budgets/budget-month';
import { BudgetValidationError } from '@/features/budgets/budget.service';
import type { BudgetValidationErrors } from '@/features/budgets/budget.types';
import { budgetService } from '@/features/budgets/budgets';
import { BudgetCategorySelector, type BudgetCategoryOption } from '@/features/budgets/components/budget-category-selector';
import { BudgetColorPicker } from '@/features/budgets/components/budget-color-picker';
import { categoryService } from '@/features/categories/categories';
import { getCategoryIcon } from '@/features/categories/category-icons';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetForm({ budgetId, initialMonth }: { budgetId?: string; initialMonth: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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
        if (budgetId && !budget) throw new Error('Budget not found.');
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
      .catch((cause) => setGeneralError(toUserMessage(cause, 'Unable to load budget.')))
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
      else setGeneralError(toUserMessage(cause, 'Unable to save budget.'));
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove() {
    if (!budgetId) return;
    Alert.alert(
      'Remove budget?',
      wasRecurring
        ? 'This stops the recurring budget and removes this month and future months. Past months stay. Categories and transactions are not deleted.'
        : 'This removes only this monthly plan. Categories and transactions are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Budget',
          style: 'destructive',
          onPress: () => {
            void budgetService.remove(budgetId)
              .then(() => router.back())
              .catch((cause) => setGeneralError(toUserMessage(cause, 'Unable to remove budget.')));
          },
        },
      ],
    );
  }

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={[styles.flex, { backgroundColor: theme.appBackground }]}>
      <View style={[styles.header, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable accessibilityLabel="Close budget form" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.primaryText }]}>{editing ? 'Edit Budget' : 'Create Budget'}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {generalError ? <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text> : null}
        {lockCategoryAndMonth ? (
          <View style={styles.field}>
            <Overline color={theme.mutedText}>Category</Overline>
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
          <Overline color={theme.mutedText}>Budget month</Overline>
          {lockCategoryAndMonth ? (
            <View style={[styles.readonlyRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
              <Text style={[styles.readonlyText, { color: theme.primaryText }]}>{budgetMonthLabel(month)}</Text>
            </View>
          ) : (
            <>
              <TextInput
                accessibilityLabel="Budget month in YYYY-MM format"
                autoCapitalize="none"
                keyboardType="number-pad"
                maxLength={7}
                onChangeText={(value) => { setMonth(value.replace(/[^\d-]/g, '').slice(0, 7)); clear('month'); }}
                placeholder="YYYY-MM"
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
          label="Budget limit"
          onDigitsChange={(value) => { setDigits(value); clear('limitAmount'); }}
          type="expense"
        />

        <BudgetColorPicker onChange={(value) => { setColor(value); clear('color'); }} value={color} />
        {errors.color ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{errors.color}</Text> : null}

        <View style={[styles.recurringRow, { backgroundColor: theme.surface, borderColor: theme.hairline }]}>
          <View style={styles.recurringText}>
            <Text style={[styles.recurringTitle, { color: theme.primaryText }]}>Repeat every month</Text>
            <Text style={[styles.recurringHint, { color: theme.mutedText }]}>
              Reappears automatically each month. Editing the amount applies from this month onward.
            </Text>
          </View>
          <Switch
            accessibilityLabel="Repeat this budget every month"
            onValueChange={setRecurring}
            value={recurring}
          />
        </View>

        {editing ? (
          <Button accessibilityLabel="Remove budget" fullWidth label="Remove budget" onPress={confirmRemove} size="lg" variant="destructive" />
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.appBackground, borderTopColor: theme.hairline, paddingBottom: insets.bottom + spacing.sm }]}>
        <Button
          accessibilityLabel={editing ? 'Save budget changes' : 'Create budget'}
          busy={saving}
          fullWidth
          label={editing ? 'Save changes' : 'Create budget'}
          onPress={() => void save()}
          size="lg"
          variant="primary"
        />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
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
  footer: { borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md },
});
