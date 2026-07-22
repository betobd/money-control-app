import { SymbolView } from 'expo-symbols';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
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
import { useDataExport } from '../use-data-export';

function formatEstimatedSize(bytes: number): string {
  if (bytes < 1024) return `about ${bytes} B`;
  if (bytes < 1024 * 1024) return `about ${Math.max(1, Math.round(bytes / 1024))} KiB`;
  return `about ${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export function DataExportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [filterModalKey, setFilterModalKey] = useState(0);
  const {
    applyTransactionFilters,
    budgetMonth,
    error,
    exportAccounts,
    exportBudgets,
    exportCreditCardStatements,
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
    Alert.alert(
      title,
      `CSV files may contain sensitive financial information. Anyone with access to the file may read it. App Lock does not protect the file after it leaves Money Control.${detail ? `\n\n${detail}` : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Continue', onPress: () => void action() },
      ],
    );
  }

  const transactionCount = overview?.transactions.count ?? 0;
  const noTransactions = !loadingOverview && transactionCount === 0;
  const transactionBlocked = Boolean(overview?.transactions.exceedsLimit);

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}> 
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Back"
          accessibilityRole="button"
          disabled={busy}
          onPress={() => router.back()}
          style={styles.headerButton}>
          <SymbolView
            name={{ ios: 'chevron.left', android: 'arrow_back', web: 'arrow_back' }}
            size={24}
            tintColor={busy ? theme.disabledText : theme.primaryText}
          />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Data Export</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}>
        {error ? (
          <Text
            accessibilityLiveRegion="assertive"
            style={[styles.feedback, { backgroundColor: theme.surface, borderColor: theme.destructive, color: theme.destructive }]}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text
            accessibilityLiveRegion="polite"
            style={[styles.feedback, { backgroundColor: theme.surface, borderColor: theme.income, color: theme.income }]}>
            {notice}
          </Text>
        ) : null}

        <View style={[styles.warning, { backgroundColor: theme.elevatedSurface, borderColor: theme.warning }]}>
          <SymbolView
            name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }}
            size={24}
            tintColor={theme.warning}
          />
          <View style={styles.flex}>
            <Text style={[styles.cardTitle, { color: theme.primaryText }]}>Plaintext financial information</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>CSV files are readable by anyone who can access them. They are intended for spreadsheets, analysis, and sharing—not full app restoration.</Text>
          </View>
        </View>

        <View style={[styles.distinction, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.primaryText }]}>CSV is not a backup</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>Need to restore Money Control later? Backup & Restore preserves IDs and relationships in versioned JSON. CSV cannot be restored.</Text>
          <Pressable
            accessibilityHint="Opens the complete restoration backup feature"
            accessibilityLabel="Open Backup and Restore"
            accessibilityRole="button"
            onPress={() => router.push('/backup' as Href)}
            style={styles.linkButton}>
            <Text style={[styles.linkText, { color: theme.primaryAction }]}>Open Backup & Restore</Text>
          </Pressable>
        </View>

        <ExportCard
          description="Readable transaction rows with source/destination accounts, category, status, dates, and optional notes."
          kind="transactions"
          operation={operation}
          recordCount={transactionCount}
          theme={theme}
          title="Transactions">
          <View style={styles.detailList}>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>Date: {formatTransactionDateRange(transactionDateRange)}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>Type: {transactionOptions.filters.type ?? 'All'}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>Status: {transactionOptions.filters.status ?? 'All'}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>Account: {selectedAccount?.name ?? 'All'}</Text>
            <Text style={[styles.caption, { color: theme.secondaryText }]}>Category: {selectedCategory?.name ?? 'All'}</Text>
            <Text style={[styles.caption, { color: theme.mutedText }]}>{transactionFilterCount} active {transactionFilterCount === 1 ? 'filter' : 'filters'} · {formatEstimatedSize(overview?.transactions.estimatedBytes ?? 0)}</Text>
          </View>
          <Pressable
            accessibilityLabel="Configure transaction export filters"
            accessibilityRole="button"
            disabled={busy || loadingOverview}
            onPress={() => {
              setFilterModalKey((value) => value + 1);
              setFilterModalVisible(true);
            }}
            style={[styles.secondaryButton, { borderColor: theme.primaryAction }]}>
            <Text style={[styles.buttonLabel, { color: theme.primaryAction }]}>Configure filters</Text>
          </Pressable>
          <NotesToggle
            disabled={busy}
            label="Include transaction notes"
            onValueChange={setIncludeTransactionNotes}
            theme={theme}
            value={transactionOptions.includeNotes}
          />
          {noTransactions ? (
            <Text accessibilityLiveRegion="polite" style={[styles.emptyText, { color: theme.secondaryText }]}>No transactions match the selected filters.</Text>
          ) : null}
          {overview?.transactions.isLarge ? (
            <Text style={[styles.warningText, { color: theme.warning }]}>Large export: generation may take longer and use more memory.</Text>
          ) : null}
          {transactionBlocked ? (
            <Text style={[styles.warningText, { color: theme.destructive }]}>Narrow the filters. The 50,000-row safety limit is exceeded and no partial file will be created.</Text>
          ) : null}
          <ExportButton
            disabled={busy || loadingOverview || noTransactions || transactionBlocked}
            kind="transactions"
            label="Export transactions CSV"
            operation={operation}
            onPress={() => confirmExport(
              'Export transactions?',
              exportTransactions,
              transactionOptions.includeNotes
                ? 'Transaction notes are enabled and will be included.'
                : 'Transaction notes are excluded.',
            )}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description="Active and archived accounts with opening and derived current balances. Card debt fields use the existing signed-balance model."
          kind="accounts"
          operation={operation}
          recordCount={overview?.accounts}
          theme={theme}
          title="Accounts">
          <Text style={[styles.caption, { color: theme.mutedText }]}>Includes all account types. Credit-card-only columns stay blank for other accounts.</Text>
          <ExportButton
            disabled={busy || loadingOverview || overview?.accounts === 0}
            kind="accounts"
            label="Export accounts CSV"
            operation={operation}
            onPress={() => confirmExport('Export accounts?', exportAccounts)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description="Monthly limits and the same calculated spending, remaining amount, percentage, and status used by Budgets."
          kind="budgets"
          operation={operation}
          recordCount={overview?.budgets}
          theme={theme}
          title="Budgets">
          <View style={styles.monthSelector}>
            <Pressable
              accessibilityLabel="Previous budget month"
              accessibilityRole="button"
              disabled={busy}
              onPress={() => setBudgetMonth(shiftBudgetMonth(budgetMonth, -1))}
              style={styles.monthButton}>
              <SymbolView name={{ ios: 'chevron.left', android: 'chevron_left', web: 'chevron_left' }} size={22} tintColor={theme.primaryAction} />
            </Pressable>
            <Text accessibilityLabel={`Selected budget month ${budgetMonthLabel(budgetMonth)}`} style={[styles.monthLabel, { color: theme.primaryText }]}>{budgetMonthLabel(budgetMonth)}</Text>
            <Pressable
              accessibilityLabel="Next budget month"
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
            label="Export budgets CSV"
            operation={operation}
            onPress={() => confirmExport('Export budgets?', exportBudgets)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description="Recurring templates only: schedule, lifecycle, accounts, category, amount, and optional note. Exporting never generates occurrences or transactions."
          kind="recurring-rules"
          operation={operation}
          recordCount={overview?.recurringRules}
          theme={theme}
          title="Recurring transactions">
          <NotesToggle
            disabled={busy}
            label="Include recurring notes"
            onValueChange={setRecurringIncludeNotes}
            theme={theme}
            value={recurringIncludeNotes}
          />
          <ExportButton
            disabled={busy || loadingOverview || overview?.recurringRules === 0}
            kind="recurring-rules"
            label="Export recurring rules CSV"
            operation={operation}
            onPress={() => confirmExport(
              'Export recurring rules?',
              exportRecurringRules,
              recurringIncludeNotes ? 'Recurring notes are enabled and will be included.' : 'Recurring notes are excluded.',
            )}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description="Historical statements with bank-entered balance/minimum, attributed qualifying payments, remaining amounts, and status."
          kind="credit-card-statements"
          operation={operation}
          recordCount={overview?.creditCardStatements}
          theme={theme}
          title="Credit-card statements">
          <Text style={[styles.caption, { color: theme.mutedText }]}>No card numbers, CVV, expiration dates, installment inference, or credentials are stored or exported.</Text>
          <ExportButton
            disabled={busy || loadingOverview || overview?.creditCardStatements === 0}
            kind="credit-card-statements"
            label="Export statements CSV"
            operation={operation}
            onPress={() => confirmExport('Export credit-card statements?', exportCreditCardStatements)}
            theme={theme}
          />
        </ExportCard>

        <ExportCard
          description="One row per summary metric for the same persisted reporting periods and financial rules used by Reports."
          kind="report-summary"
          operation={operation}
          recordCount={overview?.reportMetrics}
          theme={theme}
          title="Report summary">
          <ReportPeriodSelector selection={reportSelection} onChange={setReportSelection} />
          <ExportButton
            disabled={busy || loadingOverview}
            kind="report-summary"
            label="Export report summary CSV"
            operation={operation}
            onPress={() => confirmExport('Export report summary?', exportReport)}
            theme={theme}
          />
        </ExportCard>

        <Text style={[styles.footerNote, { color: theme.mutedText }]}>Files are generated locally, shared one at a time, and removed from Money Control’s temporary cache after the native interface closes. No data is uploaded by Money Control.</Text>
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
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>;

function ExportCard({
  children,
  description,
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
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={styles.cardHeading}>
        <View style={styles.flex}>
          <Text accessibilityRole="header" style={[styles.cardTitle, { color: theme.primaryText }]}>{title}</Text>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{description}</Text>
        </View>
        {recordCount === undefined ? <ActivityIndicator color={theme.primaryAction} size="small" /> : (
          <Text accessibilityLabel={`${recordCount} records`} style={[styles.count, { backgroundColor: theme.elevatedSurface, color: theme.primaryText }]}>{recordCount.toLocaleString('en-US')}</Text>
        )}
      </View>
      {children}
      <Text style={[styles.notBackup, { color: theme.mutedText }]}>Human-readable CSV · Not a restorable backup</Text>
    </View>
  );
}

function NotesToggle({ disabled, label, onValueChange, theme, value }: {
  disabled: boolean;
  label: string;
  onValueChange: (value: boolean) => void;
  theme: Theme;
  value: boolean;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.flex}>
        <Text style={[styles.body, { color: theme.primaryText }]}>{label}</Text>
        <Text style={[styles.caption, { color: theme.mutedText }]}>Off by default for plaintext-file privacy.</Text>
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
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor: disabled ? theme.disabledSurface : theme.primaryAction }]}>
      {busy ? <ActivityIndicator color={theme.onPrimaryAction} /> : (
        <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.onPrimaryAction }]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  title: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.md, paddingHorizontal: spacing.md },
  feedback: { ...typography.caption, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, padding: spacing.md },
  warning: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  distinction: { borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.md },
  linkButton: { alignItems: 'flex-start', justifyContent: 'center', minHeight: 48 },
  linkText: { ...typography.body, fontWeight: '700' },
  card: { borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.md },
  cardHeading: { alignItems: 'flex-start', flexDirection: 'row', gap: spacing.sm },
  cardTitle: { ...typography.sectionTitle },
  body: { ...typography.body },
  caption: { ...typography.caption },
  flex: { flex: 1, gap: spacing.xs },
  count: { ...typography.caption, borderRadius: borderRadii.full, fontWeight: '700', minWidth: 40, overflow: 'hidden', paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, textAlign: 'center' },
  detailList: { gap: spacing.xs },
  secondaryButton: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  primaryButton: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  buttonLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  toggleRow: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 52 },
  emptyText: { ...typography.body, fontWeight: '600' },
  warningText: { ...typography.caption, fontWeight: '700' },
  monthSelector: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  monthButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  monthLabel: { ...typography.body, flex: 1, fontWeight: '700', textAlign: 'center' },
  notBackup: { ...typography.label, textTransform: 'uppercase' },
  footerNote: { ...typography.caption, textAlign: 'center' },
});

