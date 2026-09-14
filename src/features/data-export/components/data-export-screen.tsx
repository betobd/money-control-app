import { SymbolView } from 'expo-symbols';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import {
  budgetMonthLabel,
  shiftBudgetMonth,
} from '@/features/budgets/budget-month';
import { ReportPeriodSelector } from '@/features/reports/components/report-period-selector';
import {
  countActiveTransactionFilters,
  getTransactionFilterDateRange,
} from '@/features/transactions/transaction-list-filters';
import { formatTransactionDateRange } from '@/features/transactions/transaction-date';
import { TransactionFilterModal } from '@/features/transactions/components/transaction-filter-modal';
import type { DataExportKind } from '@/features/data-export/data-export.types';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getMessages, getIntlLocale } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import { useDataExport } from '../use-data-export';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';

function formatEstimatedSize(bytes: number): string {
  const text = getMessages().dataExport;
  if (bytes < 1024) return text.sizeBytes(bytes);
  if (bytes < 1024 * 1024) return text.sizeKib(Math.max(1, Math.round(bytes / 1024)));
  return text.sizeMib((bytes / (1024 * 1024)).toFixed(1));
}

export function DataExportScreen() {
  const dialog = useDialog();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterModalKey, setFilterModalKey] = useState(0);
  const {
    applyTransactionFilters,
    budgetMonth,
    error,
    exportAccounts,
    exportBudgets,
    exportCreditCardStatements,
    exportInvestments,
    exportInvestmentValuations,
    exportRecurringRules,
    exportReport,
    exportTransactions,
    loadingOverview,
    notice,
    operation,
    overview,
    recurringIncludeNotes,
    reportSelection,
    setBudgetMonth,
    setIncludeTransactionNotes,
    setRecurringIncludeNotes,
    setReportSelection,
    transactionOptions,
  } = useDataExport();
  const busy = operation !== null;

  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  const transactionDateRange = useMemo(
    () => getTransactionFilterDateRange(transactionOptions.filters),
    [transactionOptions.filters],
  );
  const transactionFilterCount = countActiveTransactionFilters(transactionOptions.filters);
  const selectedAccount = overview?.transactionFilters.accounts.find(
    (account) => account.id === transactionOptions.filters.accountId,
  );
  const selectedCategory = overview?.transactionFilters.categories.find(
    (category) => category.id === transactionOptions.filters.categoryId,
  );

  function confirmExport(
    title: string,
    action: () => Promise<void>,
    detail = '',
  ): void {
    dialog.confirm({
      title,
      message: t.dataExport.confirmMessage(detail),
      confirmLabel: t.dataExport.confirmLabel,
      onConfirm: () => void action(),
    });
  }

  const transactionCount = overview?.transactions.count ?? 0;
  const noTransactions = !loadingOverview && transactionCount === 0;
  const transactionBlocked = Boolean(overview?.transactions.exceedsLimit);

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}> 
      <ScreenHeader leading="back" leadingDisabled={busy} title={t.dataExport.title} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.feedback, { backgroundColor: theme.tintDestructive, color: theme.destructive }]}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.feedback, { backgroundColor: theme.tintIncome, color: theme.income }]}>
            {notice}
          </Text>
        ) : null}

        <View style={[styles.warning, { backgroundColor: theme.tintWarning }]}>
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
            size={24}
            tintColor={theme.warning}
          />
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{t.dataExport.warningTitle}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{t.dataExport.warningBody}</Text>
          </View>
        </View>

        <Card style={styles.distinction}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>{t.dataExport.notBackupTitle}</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{t.dataExport.notBackupBody}</Text>
          <Button
            accessibilityHint={t.dataExport.openBackupHint}
            accessibilityLabel={t.dataExport.openBackupLabel}
            label={t.dataExport.openBackupButton}
            onPress={() => router.push('/backup' as Href)}
            variant="ghost"
          />
        </Card>

        <ExportCard
          description={t.dataExport.transactionsDescription}
          kind="transactions"
          operation={operation}
          recordCount={transactionCount}
          theme={theme}
          title={t.dataExport.transactionsTitle}>
          <View style={styles.detailList}>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>{t.dataExport.filterDate(formatTransactionDateRange(transactionDateRange))}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>{t.dataExport.filterType(transactionOptions.filters.type ? t.dataExport.typeValues[transactionOptions.filters.type] : t.dataExport.allTypes)}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>{t.dataExport.filterStatus(transactionOptions.filters.status ? t.dataExport.statusValues[transactionOptions.filters.status] : t.dataExport.allStatuses)}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>{t.dataExport.filterAccount(selectedAccount?.name ?? t.dataExport.allAccounts)}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>{t.dataExport.filterCategory(selectedCategory?.name ?? t.dataExport.allCategories)}</Text>
            <Text style={[styles.caption, { color: theme.mutedText }]}>{t.dataExport.activeFilters(transactionFilterCount, formatEstimatedSize(overview?.transactions.estimatedBytes ?? 0))}</Text>
          </View>
          <Button
            accessibilityLabel={t.dataExport.configureFiltersLabel}
            disabled={busy || loadingOverview}
            fullWidth
            label={t.dataExport.configureFilters}
            onPress={() => {
              setFilterModalKey((value) => value + 1);
              setFilterModalVisible(true);
            }}
            size="lg"
            variant="tonal"
          />
          <NotesToggle
            disabled={busy}
            label={t.dataExport.includeTransactionNotes}
            onValueChange={setIncludeTransactionNotes}
            theme={theme}
            value={transactionOptions.includeNotes}
          />
          {noTransactions ? (
            <Text accessibilityLiveRegion="polite" style={[styles.emptyText, { color: theme.secondaryText }]}>{t.dataExport.noTransactionsMatch}</Text>
          ) : null}
          {overview?.transactions.isLarge ? (
            <Text style={[styles.warningText, { color: theme.warning }]}>{t.dataExport.largeExport}</Text>
          ) : null}
          {transactionBlocked ? (
            <Text style={[styles.warningText, { color: theme.destructive }]}>{t.dataExport.transactionLimitExceeded}</Text>
          ) : null}
          <ExportButton
            disabled={busy || loadingOverview || noTransactions || transactionBlocked}
            kind="transactions"
            label={t.dataExport.exportTransactionsButton}
            operation={operation}
            onPress={() => confirmExport(
              t.dataExport.exportTransactionsTitle,
              exportTransactions,
              transactionOptions.includeNotes
                ? t.dataExport.transactionNotesIncluded
                : t.dataExport.transactionNotesExcluded,
            )}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.accountsDescription}
          kind="accounts"
          operation={operation}
          recordCount={overview?.accounts}
          theme={theme}
          title={t.dataExport.accountsTitle}>
          <Text style={[styles.caption, { color: theme.mutedText }]}>{t.dataExport.accountsCaption}</Text>
          <ExportButton
            disabled={busy || loadingOverview || overview?.accounts === 0}
            kind="accounts"
            label={t.dataExport.exportAccountsButton}
            operation={operation}
            onPress={() => confirmExport(t.dataExport.exportAccountsTitle, exportAccounts)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.budgetsDescription}
          kind="budgets"
          operation={operation}
          recordCount={overview?.budgets}
          theme={theme}
          title={t.dataExport.budgetsTitle}>
          <View style={styles.monthSelector}>
            <Pressable
              accessibilityLabel={t.dataExport.previousBudgetMonth}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setBudgetMonth(shiftBudgetMonth(budgetMonth, -1))}
              style={styles.monthButton}>
              <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={22} tintColor={theme.primaryAction} />
            </Pressable>
            <Text accessibilityLabel={t.dataExport.selectedBudgetMonth(budgetMonthLabel(budgetMonth))} style={[styles.monthLabel, { color: theme.primaryText }]}>{budgetMonthLabel(budgetMonth)}</Text>
            <Pressable
              accessibilityLabel={t.dataExport.nextBudgetMonth}
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setBudgetMonth(shiftBudgetMonth(budgetMonth, 1))}
              style={styles.monthButton}>
              <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={22} tintColor={theme.primaryAction} />
            </Pressable>
          </View>
          <ExportButton
            disabled={busy || loadingOverview || overview?.budgets === 0}
            kind="budgets"
            label={t.dataExport.exportBudgetsButton}
            operation={operation}
            onPress={() => confirmExport(t.dataExport.exportBudgetsTitle, exportBudgets)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.recurringDescription}
          kind="recurring-rules"
          operation={operation}
          recordCount={overview?.recurringRules}
          theme={theme}
          title={t.dataExport.recurringTitle}>
          <NotesToggle
            disabled={busy}
            label={t.dataExport.includeRecurringNotes}
            onValueChange={setRecurringIncludeNotes}
            theme={theme}
            value={recurringIncludeNotes}
          />
          <ExportButton
            disabled={busy || loadingOverview || overview?.recurringRules === 0}
            kind="recurring-rules"
            label={t.dataExport.exportRecurringButton}
            operation={operation}
            onPress={() => confirmExport(
              t.dataExport.exportRecurringTitle,
              exportRecurringRules,
              recurringIncludeNotes ? t.dataExport.recurringNotesIncluded : t.dataExport.recurringNotesExcluded,
            )}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.statementsDescription}
          kind="credit-card-statements"
          operation={operation}
          recordCount={overview?.creditCardStatements}
          theme={theme}
          title={t.dataExport.statementsTitle}>
          <Text style={[styles.caption, { color: theme.mutedText }]}>{t.dataExport.statementsCaption}</Text>
          <ExportButton
            disabled={busy || loadingOverview || overview?.creditCardStatements === 0}
            kind="credit-card-statements"
            label={t.dataExport.exportStatementsButton}
            operation={operation}
            onPress={() => confirmExport(t.dataExport.exportStatementsTitle, exportCreditCardStatements)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.reportDescription}
          kind="report-summary"
          operation={operation}
          recordCount={overview?.reportMetrics}
          theme={theme}
          title={t.dataExport.reportTitle}>
          <ReportPeriodSelector selection={reportSelection} onChange={setReportSelection} />
          <ExportButton
            disabled={busy || loadingOverview}
            kind="report-summary"
            label={t.dataExport.exportReportButton}
            operation={operation}
            onPress={() => confirmExport(t.dataExport.exportReportTitle, exportReport)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.investmentsDescription}
          kind="investments"
          operation={operation}
          recordCount={overview?.investments}
          theme={theme}
          title={t.dataExport.investmentsTitle}>
          <Text style={[styles.caption, { color: theme.mutedText }]}>{t.dataExport.investmentsCaption}</Text>
          <ExportButton
            disabled={busy || loadingOverview || overview?.investments === 0}
            kind="investments"
            label={t.dataExport.exportInvestmentsButton}
            operation={operation}
            onPress={() => confirmExport(t.dataExport.exportInvestmentsTitle, exportInvestments)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description={t.dataExport.valuationsDescription}
          kind="investment-valuations"
          operation={operation}
          recordCount={overview?.investments}
          theme={theme}
          title={t.dataExport.valuationsTitle}>
          <Text style={[styles.caption, { color: theme.mutedText }]}>{t.dataExport.valuationsCaption}</Text>
          <ExportButton
            disabled={busy || loadingOverview || overview?.investments === 0}
            kind="investment-valuations"
            label={t.dataExport.exportValuationsButton}
            operation={operation}
            onPress={() => confirmExport(t.dataExport.exportValuationsTitle, exportInvestmentValuations)}
            theme={theme}
          />
        </ExportCard>

        <Text style={[styles.footerNote, { color: theme.mutedText }]}>{t.dataExport.footerNote}</Text>
      </ScrollView>

      <TransactionFilterModal
        key={`export-filters-${filterModalKey}`}
        filterOptions={overview?.transactionFilters ?? { accounts: [], categories: [] }}
        filters={transactionOptions.filters}
        onApply={(filters) => {
          applyTransactionFilters(filters);
          setFilterModalVisible(false);
        }}
        onClearAll={() => {
          applyTransactionFilters({
            ...transactionOptions.filters,
            type: null,
            status: null,
            accountId: null,
            categoryId: null,
            datePreset: 'all-time',
          });
          setFilterModalVisible(false);
        }}
        onClose={() => setFilterModalVisible(false)}
        visible={filterModalVisible}
      />
      <DialogHost dialog={dialog} />
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>;

function ExportCard({
  children,
  description,
  kind,
  recordCount,
  theme,
  title,
}: {
  children: React.ReactNode;
  description: string;
  kind: DataExportKind;
  operation: DataExportKind | 'loading' | null;
  recordCount?: number;
  theme: Theme;
  title: string;
}) {
  const t = useMessages();
  return (
    <Card style={styles.card}>
      <View style={styles.cardHeading}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{description}</Text>
        </View>
        {recordCount === undefined ? <ActivityIndicator color={theme.primaryAction} size="small" /> : (
          <Text accessibilityLabel={t.dataExport.recordCount(recordCount)} style={[styles.count, { backgroundColor: theme.elevatedSurface, color: theme.primaryText }]}>{recordCount.toLocaleString(getIntlLocale())}</Text>
        )}
      </View>
      {recordCount === 0 && kind !== 'transactions' ? (
        <Text accessibilityLiveRegion="polite" style={[styles.emptyText, { color: theme.secondaryText }]}>{t.dataExport.emptyCard}</Text>
      ) : null}
      {children}
      <Text style={[styles.notBackup, { color: theme.mutedText }]}>{t.dataExport.notRestorable}</Text>
    </Card>
  );
}

function NotesToggle({ disabled, label, onValueChange, theme, value }: {
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  theme: Theme;
  value: boolean;
}) {
  const t = useMessages();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={[styles.body, { color: theme.primaryText }]}>{label}</Text>
        <Text style={[styles.caption, { color: theme.mutedText }]}>{t.dataExport.notesPrivacy}</Text>
      </View>
      <Switch
        accessibilityLabel={label}
        disabled={disabled}
        onValueChange={onValueChange}
        trackColor={{ false: theme.disabledSurface, true: theme.selectedNavigationBackground }}
        thumbColor={value ? theme.primaryAction : theme.mutedText}
        value={value}
      />
    </View>
  );
}

function ExportButton({ disabled, kind, label, onPress, operation, theme }: {
  disabled: boolean;
  kind: DataExportKind;
  label: string;
  onPress: () => void;
  operation: DataExportKind | 'loading' | null;
  theme: Theme;
}) {
  const busy = operation === kind;
  return (
    <Button busy={busy} disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" variant="primary" />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, paddingHorizontal: spacing.md },
  feedback: { ...typography.caption, borderRadius: borderRadii.md, padding: spacing.md },
  warning: { borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  distinction: { gap: spacing.sm },
  linkText: { ...typography.bodyStrong },
  card: { gap: spacing.md },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  cardTitle: { ...typography.sectionTitle },
  body: { ...typography.body },
  caption: { ...typography.caption },
  flex: { flex: 1, gap: spacing.xs },
  count: { ...typography.captionStrong, borderRadius: borderRadii.full, minWidth: 40, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textAlign: 'center' },
  detailList: { gap: spacing.xs },
  buttonLabel: { ...typography.bodyStrong, textAlign: 'center' },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 52 },
  emptyText: { ...typography.body, fontFamily: fonts.sans.semibold, fontWeight: '600' },
  warningText: { ...typography.captionStrong },
  monthSelector: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  monthButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  monthLabel: { ...typography.bodyStrong, flex: 1, textAlign: 'center' },
  notBackup: { ...typography.label, textTransform: 'uppercase' },
  footerNote: { ...typography.caption, textAlign: 'center' },
});

