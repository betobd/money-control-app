import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { Overline } from '@/components/overline';
import { spacing, typography } from '@/constants/theme';
import { formatBase } from '@/features/accounts/account-format';
import { budgetMonthLabel } from '@/features/budgets/budget-month';
import { BudgetProgressBar } from '@/features/budgets/components/budget-progress-bar';
import type { MonthlyBudgetView } from '@/features/budgets/monthly-budget.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { intlLocaleFor } from '@/i18n/languages';
import { useLanguage, useMessages } from '@/i18n/use-messages';

/**
 * The overall monthly ceiling.
 *
 * Sits above the category budgets because it is the wider claim: category
 * budgets answer "did I overspend on food", this answers "did I overspend at
 * all". Its `spent` counts every expense, including the ones no category budget
 * watches — which is the whole reason it exists.
 */
export function MonthlyCeilingCard({
  ceiling,
  onEdit,
}: {
  ceiling: MonthlyBudgetView;
  onEdit: () => void;
}) {
  const theme = useAppTheme();
  const t = useMessages();
  const locale = intlLocaleFor(useLanguage());
  const over = ceiling.remaining < 0;
  const remainingLabel = over ? formatBase(Math.abs(ceiling.remaining)) : formatBase(ceiling.remaining);
  return (
    <Card
      accessibilityLabel={t.budgets.ceilingAccessibility(formatBase(ceiling.limitAmount), formatBase(ceiling.spent), over, remainingLabel, ceiling.percentageUsed)}
      style={styles.card}
      variant="raised">
      <View style={styles.heading}>
        <Overline>{t.budgets.monthlyCeiling}</Overline>
        <Button label={t.common.edit} onPress={onEdit} size="sm" variant="ghost" />
      </View>
      <Text adjustsFontSizeToFit minimumFontScale={0.7} numberOfLines={1} style={[styles.total, { color: theme.primaryText }]}>
        {formatBase(ceiling.limitAmount)}
      </Text>
      {ceiling.inheritedFrom ? (
        <Text style={[styles.note, { color: theme.mutedText }]}>
          {t.budgets.carriedForward(budgetMonthLabel(ceiling.inheritedFrom, locale))}
        </Text>
      ) : null}

      <View style={styles.amounts}>
        <Amount label={t.budgets.spentThisMonth} value={formatBase(ceiling.spent)} />
        <Amount destructive={over} label={over ? t.budgets.overBy : t.budgets.remaining} value={remainingLabel} />
      </View>

      <View style={styles.progressLabelRow}>
        <Text style={[styles.progressLabel, { color: theme.secondaryText }]}>{t.budgets.allSpending}</Text>
        <Text style={[styles.progressValue, { color: over ? theme.destructive : theme.primaryText }]}>
          {ceiling.percentageUsed}%
        </Text>
      </View>
      <BudgetProgressBar percentage={ceiling.percentageUsed} progressWidth={ceiling.progressWidth} status={ceiling.status} />

      {/* The point of the ceiling: money inside it that no category budget is
          watching, which is exactly the spending that used to go unnoticed. */}
      <Text style={[styles.note, { color: ceiling.unallocated < 0 ? theme.warning : theme.mutedText }]}>
        {ceiling.unallocated < 0
          ? t.budgets.ceilingOverAllocated(formatBase(ceiling.categoryBudgetTotal), formatBase(Math.abs(ceiling.unallocated)))
          : t.budgets.ceilingUnallocated(formatBase(ceiling.categoryBudgetTotal), formatBase(ceiling.unallocated))}
      </Text>
    </Card>
  );
}

/** Shown in place of the card when no ceiling applies to the month. */
export function MonthlyCeilingEmptyCard({ onCreate }: { onCreate: () => void }) {
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <Card style={styles.card}>
      <Overline>{t.budgets.monthlyCeiling}</Overline>
      <Text style={[styles.emptyBody, { color: theme.secondaryText }]}>
        {t.budgets.ceilingEmptyBody}
      </Text>
      <Button
        fullWidth
        icon={{ ios: 'plus', android: 'add', web: 'add' }}
        label={t.budgets.setMonthlyCeiling}
        onPress={onCreate}
        size="md"
        variant="tonal"
      />
    </Card>
  );
}

function Amount({ label, value, destructive = false }: { label: string; value: string; destructive?: boolean }) {
  const theme = useAppTheme();
  return (
    <View style={styles.amount}>
      <Overline>{label}</Overline>
      <Text
        adjustsFontSizeToFit
        minimumFontScale={0.7}
        numberOfLines={1}
        style={[styles.amountValue, { color: destructive ? theme.destructive : theme.primaryText }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { gap: spacing.sm },
  heading: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  total: { ...typography.moneyHero },
  amounts: { flexDirection: 'row', gap: spacing.md, justifyContent: 'space-between', marginTop: spacing.sm },
  amount: { flex: 1, gap: spacing.xs - 2, minWidth: 0 },
  amountValue: { ...typography.moneyRow, fontSize: 15, lineHeight: 20 },
  progressLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  progressLabel: { ...typography.caption },
  progressValue: { ...typography.captionStrong },
  note: { ...typography.label },
  emptyBody: { ...typography.caption },
});
