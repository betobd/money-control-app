import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { DialogHost, useDialog } from '@/components/dialog';
import { spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
import { budgetMonthLabel } from '@/features/budgets/budget-month';
import { MonthlyBudgetValidationError } from '@/features/budgets/budget.service';
import { budgetService } from '@/features/budgets/budgets';
import type { MonthlyBudgetValidationErrors } from '@/features/budgets/monthly-budget.types';
import { getBaseCurrency } from '@/features/settings/settings';
import { parseMoney } from '@/features/currency/currency';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ScreenHeader } from '@/components/screen-header';
import { FixedFooter } from '@/components/fixed-footer';

/**
 * Sets the overall monthly ceiling.
 *
 * There is exactly one field, because the ceiling has no category, no color and
 * no nesting. The month is fixed by the screen that opened this form.
 */
export function MonthlyCeilingForm({ month }: { month: string }) {
  const dialog = useDialog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const currency = getBaseCurrency();
  const [digits, setDigits] = useState('');
  const [existed, setExisted] = useState(false);
  const [errors, setErrors] = useState<MonthlyBudgetValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    budgetService.getCeiling(month).then(
      (ceiling) => {
        if (cancelled) return;
        if (ceiling?.isActive) {
          setDigits(String(ceiling.limitAmount));
          setExisted(true);
        }
        setLoading(false);
      },
      (cause: unknown) => {
        if (cancelled) return;
        setGeneralError(toUserMessage(cause, 'Unable to load the monthly ceiling.'));
        setLoading(false);
      },
    );
    return () => { cancelled = true; };
  }, [month]);

  async function save() {
    const parsed = parseMoney(digits, currency);
    if (!parsed.ok) {
      setErrors({ limitAmount: 'Enter a positive amount.' });
      return;
    }
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      await budgetService.setCeiling({ month, limitAmount: parsed.minor });
      router.back();
    } catch (cause) {
      if (cause instanceof MonthlyBudgetValidationError) setErrors(cause.fields);
      else setGeneralError(toUserMessage(cause, 'Unable to save the monthly ceiling.'));
    } finally {
      setSaving(false);
    }
  }

  function confirmRemove() {
    dialog.confirm({
      title: 'Remove the monthly ceiling?',
      message: `No ceiling will apply from ${budgetMonthLabel(month)} onward. Earlier months keep theirs, and no category budget is affected.`,
      confirmLabel: 'Remove',
      tone: 'destructive',
      onConfirm: () => {
        setSaving(true);
        void budgetService.removeCeiling(month)
          .then(() => router.back())
          .catch((cause: unknown) => setGeneralError(toUserMessage(cause, 'Unable to remove the monthly ceiling.')))
          .finally(() => setSaving(false));
      },
    });
  }

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: theme.appBackground }]}>
        <ActivityIndicator color={theme.primaryAction} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel="Close monthly ceiling form" title="Monthly ceiling" />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text>
        ) : null}

        <AmountInput
          currency={currency}
          digits={digits}
          error={errors.limitAmount}
          label={`Ceiling for ${budgetMonthLabel(month)}`}
          onDigitsChange={setDigits}
          type="expense"
        />

        <Text style={[styles.help, { color: theme.secondaryText }]}>
          Every posted expense counts against this, minus refunds — including spending no category
          budget covers. Transfers and investment contributions do not count.
        </Text>
        <Text style={[styles.help, { color: theme.mutedText }]}>
          It applies from {budgetMonthLabel(month)} onward until you change it. A later month you
          set explicitly keeps its own ceiling.
        </Text>

        {existed ? (
          <Button
            fullWidth
            label="Remove ceiling"
            onPress={confirmRemove}
            size="md"
            variant="destructive"
          />
        ) : null}
      </ScrollView>

      <FixedFooter bottomInset={insets.bottom}>
        <Button
          busy={saving}
          fullWidth
          label={existed ? 'Save ceiling' : 'Set ceiling'}
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
  help: { ...typography.caption },
  error: { ...typography.caption },
});
