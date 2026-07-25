import { useRouter } from 'expo-router';
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
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
import { BudgetValidationError } from '@/features/budgets/budget.service';
import type { BudgetValidationErrors } from '@/features/budgets/budget.types';
import { budgetService } from '@/features/budgets/budgets';
import { BudgetCategorySelector, type BudgetCategoryOption } from '@/features/budgets/components/budget-category-selector';
import { categoryService } from '@/features/categories/categories';
import { useAppTheme } from '@/hooks/use-app-theme';

export function BudgetForm({ budgetId, initialMonth }: { budgetId?: string; initialMonth: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [categoryId, setCategoryId] = useState('');
  const [month, setMonth] = useState(initialMonth);
  const [digits, setDigits] = useState('');
  const [categories, setCategories] = useState<BudgetCategoryOption[]>([]);
  const [search, setSearch] = useState('');
  const [errors, setErrors] = useState<BudgetValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(budgetId);

  useEffect(() => {
    Promise.all([
      categoryService.listSelectable('expense'),
      budgetId ? budgetService.get(budgetId) : Promise.resolve(null),
    ])
      .then(([activeCategories, budget]) => {
        if (budgetId && !budget) throw new Error('Budget not found.');
        const options: BudgetCategoryOption[] = activeCategories.map((category) => ({
          id: category.id,
          name: category.name,
          icon: category.icon,
          isArchived: category.isArchived,
        }));
        if (budget) {
          if (!options.some((category) => category.id === budget.categoryId)) {
            options.unshift({
              id: budget.categoryId,
              name: budget.categoryName,
              icon: budget.categoryIcon,
              isArchived: budget.categoryIsArchived,
            });
          }
          setCategoryId(budget.categoryId);
          setMonth(budget.month);
          setDigits(String(budget.limitAmount));
        }
        setCategories(options);
      })
      .catch((cause) => setGeneralError(cause instanceof Error ? cause.message : 'Unable to load budget.'))
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
      const input = { categoryId, month, limitAmount: digits ? Number(digits) : 0 };
      if (budgetId) await budgetService.update(budgetId, input);
      else await budgetService.create(input);
      router.back();
    } catch (cause) {
      if (cause instanceof BudgetValidationError) setErrors(cause.fields);
      else setGeneralError(cause instanceof Error ? cause.message : 'Unable to save budget.');
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove() {
    if (!budgetId) return;
    Alert.alert(
      'Remove budget?',
      'This removes only this monthly plan. Categories and transactions are not deleted.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove Budget',
          style: 'destructive',
          onPress: () => {
            void budgetService.remove(budgetId)
              .then(() => router.back())
              .catch((cause) => setGeneralError(cause instanceof Error ? cause.message : 'Unable to remove budget.'));
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
        <BudgetCategorySelector
          categories={categories}
          error={errors.categoryId}
          onChange={(value) => { setCategoryId(value); clear('categoryId'); }}
          onSearchChange={setSearch}
          search={search}
          selectedId={categoryId}
        />

        <View style={styles.field}>
          <Overline color={theme.mutedText}>Budget month</Overline>
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
        </View>

        <AmountInput
          autoFocus={false}
          digits={digits}
          error={errors.limitAmount}
          label="Limit amount"
          onDigitsChange={(value) => { setDigits(value); clear('limitAmount'); }}
          type="expense"
        />

        {editing ? (
          <Pressable accessibilityLabel="Remove budget" accessibilityRole="button" onPress={confirmRemove} style={[styles.remove, { backgroundColor: theme.tintDestructive }]}>
            <Text style={[styles.removeText, { color: theme.destructive }]}>Remove Budget</Text>
          </Pressable>
        ) : null}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: theme.appBackground, borderTopColor: theme.hairline, paddingBottom: insets.bottom + spacing.sm }]}>
        <Pressable
          accessibilityLabel={editing ? 'Save budget changes' : 'Create budget'}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: saving ? theme.disabledSurface : theme.primaryAction }]}>
          {saving ? <ActivityIndicator color={theme.disabledText} /> : <Text style={[styles.saveText, { color: theme.onPrimaryAction }]}>{editing ? 'Save Changes' : 'Create Budget'}</Text>}
        </Pressable>
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
  error: { ...typography.caption },
  remove: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56 },
  removeText: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
  footer: { borderTopWidth: StyleSheet.hairlineWidth, padding: spacing.md },
  save: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56 },
  saveText: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
});
