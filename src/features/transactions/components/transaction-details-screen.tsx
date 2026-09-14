import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
import {
  ActivityIndicator,
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

import { ActionTileRow } from '@/components/action-tile';
import { DateField } from '@/components/date-field';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { useAccounts } from '@/features/accounts/use-accounts';
import {
  describeRate,
  formatMoney,
  formatMoneyWithSymbol,
  getCurrency,
  parseMoney,
  type CurrencyCode,
} from '@/features/currency/currency';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput, sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid, type CategorySelection } from '@/features/add-transaction/components/category-grid';
import { CategoryPicker } from '@/features/add-transaction/components/category-picker';
import { FixedSaveBar } from '@/features/add-transaction/components/fixed-save-bar';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { TransferAccountFields } from '@/features/add-transaction/components/transfer-account-fields';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { buildCategoryTree } from '@/features/categories/category.types';
import { useCategories } from '@/features/categories/use-categories';
import { refundService } from '@/features/refunds/refunds';
import { useRefundSummary } from '@/features/refunds/use-refund-summary';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { categoryPathLabel, transactionTypeLabel } from '@/features/transactions/transaction-presentation';
import { TransactionValidationError } from '@/features/transactions/transaction.service';
import { transactionService } from '@/features/transactions/transactions';
import type {
  TransactionListItem,
  TransactionValidationErrors,
} from '@/features/transactions/transaction.types';
import { useTransactionDetails } from '@/features/transactions/use-transaction-details';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getIntlLocale } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';

type AccountPickerField = 'account' | 'source' | 'destination' | null;

export function TransactionDetailsScreen({ transactionId }: { transactionId: string }) {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const td = t.transactions.details;
  const { transaction, loading, error, reload } = useTransactionDetails(transactionId);
  const originalExpenseId = transaction?.type === 'refund'
    ? transaction.originalTransactionId
    : transaction?.type === 'expense'
      ? transaction.id
      : null;
  const { summary: refundSummary, error: refundError, reload: reloadRefunds } =
    useRefundSummary(originalExpenseId);
  const [editing, setEditing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [actionError, setActionError] = useState<string>();

  const isExpense = transaction?.type === 'expense';
  const isRefund = transaction?.type === 'refund';
  // For an expense the refund summary decides what is still allowed, so every
  // action stays disabled until it arrives rather than briefly offering an edit
  // the service would refuse.
  const refundSummaryPending = isExpense && !refundSummary;
  const lockedByRefunds = isExpense && (refundSummary?.refundedAmount ?? 0) > 0;
  const canAddRefund = isExpense && (refundSummary?.refundableRemaining ?? 0) > 0;
  const canEdit = !isRefund && !lockedByRefunds && !refundSummaryPending;
  const canVoid = !lockedByRefunds && !refundSummaryPending && !voiding;
  // An unavailable action stays visible and says why, instead of disappearing
  // and leaving the reason to be guessed.
  const actionHints: string[] = [];
  if (lockedByRefunds) actionHints.push(td.lockedByRefundsHint);
  else if (isRefund) actionHints.push(td.refundNotEditableHint);

  function confirmVoid() {
    if (!transaction || transaction.status === 'voided' || voiding) return;
    const isRefund = transaction.type === 'refund';
    dialog.confirm({
      title: isRefund ? td.voidRefundTitle : td.voidTransactionTitle,
      message: isRefund ? td.voidRefundMessage : td.voidTransactionMessage,
      confirmLabel: isRefund ? td.voidRefund : td.voidTransaction,
      tone: 'destructive',
      onConfirm: () => {
        setVoiding(true);
        setActionError(undefined);
        const action = isRefund
          ? refundService.void(transaction.id)
          : transactionService.void(transaction.id);
        void action
          .then(async () => {
            await Promise.all([reload(), reloadRefunds()]);
          })
          .catch((cause: unknown) => {
            setActionError(actionErrorMessage(cause, t.transactions.errors.unableToVoid));
          })
          .finally(() => setVoiding(false));
      },
    });
  }

  if (loading && transaction === undefined) {
    return <CenteredState label={td.loading} loading />;
  }
  if (error) return <CenteredState label={error} />;
  if (!transaction) return <CenteredState label={t.transactions.errors.notFound} />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader
        leading={editing ? 'close' : 'back'}
        leadingAccessibilityLabel={editing ? td.cancelEditing : td.close}
        onLeadingPress={() => editing ? setEditing(false) : router.back()}
        title={editing ? td.editTitle : td.title}
      />

      {editing && transaction.type !== 'refund' ? (
        <TransactionEditForm
          onCancel={() => setEditing(false)}
          onSaved={async () => {
            await reload();
            setEditing(false);
          }}
          transaction={transaction}
        />
      ) : (
        <ScrollView contentContainerStyle={[styles.detailsContent, { paddingBottom: insets.bottom + spacing.xl }]}>
          <View
            accessibilityLabel={td.statusA11y(t.transactions.status[transaction.status])}
            style={[
              styles.statusBadge,
              { backgroundColor: transaction.status === 'voided' ? theme.disabledSurface : theme.tintPrimary },
            ]}>
            <SymbolView
              name={transaction.status === 'voided'
                ? { ios: 'nosign', android: 'block', web: 'block' }
                : { ios: 'checkmark.circle.fill', android: 'check_circle', web: 'check_circle' }}
              size={20}
              tintColor={transaction.status === 'voided' ? theme.mutedText : theme.primaryAction}
            />
            <Text style={[styles.statusText, { color: transaction.status === 'voided' ? theme.mutedText : theme.primaryAction }]}>
              {t.transactions.status[transaction.status]}
            </Text>
          </View>

          <View style={[styles.amountCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.detailLabel, { color: theme.mutedText }]}>{td.amount}</Text>
            <Text
              style={[
                styles.detailAmount,
                transaction.status === 'voided' && styles.voidedAmount,
                { color: transaction.status === 'voided' ? theme.mutedText : theme.primaryText },
              ]}>
              {formatMoneyWithSymbol(transaction.amount, transaction.currency)}
            </Text>
            {transaction.type !== 'transfer' && transaction.baseCurrencyCode !== null && transaction.currency !== transaction.baseCurrencyCode && transaction.baseAmountMinor !== null ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                {td.atSavedRate(formatMoney(transaction.baseAmountMinor, transaction.baseCurrencyCode))}
                {transaction.exchangeRateScaled && transaction.exchangeRateScale && transaction.exchangeRateBaseCode && transaction.exchangeRateQuoteCode
                  ? ` (${describeRate({ rateScaled: transaction.exchangeRateScaled, rateScale: transaction.exchangeRateScale, baseCurrencyCode: transaction.exchangeRateBaseCode, quoteCurrencyCode: transaction.exchangeRateQuoteCode })})`
                  : ''}
              </Text>
            ) : null}
            {transaction.type === 'transfer' && transaction.destinationAmountMinor !== null && transaction.destinationCurrencyCode
              && transaction.destinationCurrencyCode !== transaction.currency ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                → {formatMoneyWithSymbol(transaction.destinationAmountMinor, transaction.destinationCurrencyCode)}
                {transaction.exchangeRateScaled && transaction.exchangeRateScale && transaction.exchangeRateBaseCode && transaction.exchangeRateQuoteCode
                  ? ` · ${td.effectiveRate(describeRate({ rateScaled: transaction.exchangeRateScaled, rateScale: transaction.exchangeRateScale, baseCurrencyCode: transaction.exchangeRateBaseCode, quoteCurrencyCode: transaction.exchangeRateQuoteCode }))}`
                  : ''}
              </Text>
            ) : null}
            {transaction.status === 'voided' ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                {td.excluded}
              </Text>
            ) : null}
          </View>

          {transaction.type === 'expense' && refundSummary ? (
            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.refundHeading, { color: theme.primaryText }]}>
                {refundSummary.refundStatus === 'full'
                  ? td.fullyRefunded
                  : refundSummary.refundStatus === 'partial'
                    ? td.partiallyRefunded
                    : td.refundStatus}
              </Text>
              <DetailRow label={td.grossAmount} value={formatMoneyWithSymbol(refundSummary.grossAmount, transaction.currency)} />
              <DetailRow label={td.refunded} value={formatMoneyWithSymbol(refundSummary.refundedAmount, transaction.currency)} />
              <DetailRow label={td.netExpense} value={formatMoneyWithSymbol(refundSummary.netExpense, transaction.currency)} />
              <DetailRow label={td.refundableRemaining} value={formatMoneyWithSymbol(refundSummary.refundableRemaining, transaction.currency)} />
              {refundSummary.refunds.map((refund) => (
                <Pressable
                  accessibilityHint={td.openRefundHint}
                  accessibilityRole="button"
                  key={refund.id}
                  onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: refund.id } })}
                  style={[styles.refundLink, { borderTopColor: theme.hairline }]}>
                  <Text style={[styles.refundLinkText, { color: theme.primaryAction }]}>
                    {refund.status === 'voided' ? td.voidedRefund : t.transactions.types.refund} · {formatTransactionDate(refund.transactionDate)}
                  </Text>
                  <Text style={[styles.refundLinkAmount, { color: refund.status === 'voided' ? theme.mutedText : theme.primaryAction }]}>
                    +{formatMoneyWithSymbol(refund.amount, refund.currency)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
            <DetailRow label={td.type} value={transactionTypeLabel(transaction)} />
            {transaction.type === 'transfer' ? (
              <>
                <DetailRow label={td.fromAccount} value={transaction.accountName} />
                <DetailRow label={td.toAccount} value={transaction.destinationAccountName ?? t.transactions.unknownAccount} />
              </>
            ) : transaction.type === 'refund' ? (
              <>
                <DetailRow label={td.returnedToAccount} value={transaction.accountName} />
                <DetailRow
                  label={td.inheritedCategory}
                  value={categoryPathLabel(transaction.categoryName, transaction.subcategoryName) ?? t.transactions.unknownCategory}
                />
              </>
            ) : (
              <>
                <DetailRow label={transaction.type === 'income' ? td.destinationAccount : td.sourceAccount} value={transaction.accountName} />
                <DetailRow
                  label={td.category}
                  value={categoryPathLabel(transaction.categoryName, transaction.subcategoryName) ?? t.transactions.unknownCategory}
                />
              </>
            )}
            <DetailRow label={td.transactionDate} value={formatTransactionDate(transaction.transactionDate)} />
            <DetailRow label={td.note} value={transaction.note ?? td.noNote} />
            <DetailRow label={td.created} value={formatAuditTimestamp(transaction.createdAt)} />
            <DetailRow label={td.updated} value={formatAuditTimestamp(transaction.updatedAt)} />
          </View>

          {transaction.type === 'refund' ? (
            <View style={[styles.refundExplanation, { backgroundColor: theme.tintPrimary }]}>
              <Text style={[styles.refundExplanationText, { color: theme.primaryText }]}>
                {td.refundExplanation}
              </Text>
              <Pressable
                accessibilityLabel={td.viewOriginalExpense}
                accessibilityRole="button"
                onPress={() => router.replace({
                  pathname: '/transactions/[id]',
                  params: { id: transaction.originalTransactionId },
                })}>
                <Text style={[styles.originalLink, { color: theme.primaryAction }]}>{td.viewOriginalExpense}</Text>
              </Pressable>
            </View>
          ) : null}

          {actionError || refundError ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {actionError ?? refundError}
            </Text>
          ) : null}

          {transaction.status === 'posted' ? (
            <ActionTileRow
              actions={[
                ...(isExpense ? [{
                  label: td.refundAction,
                  icon: { ios: 'arrow.uturn.backward', android: 'undo', web: 'undo' } as const,
                  disabled: !canAddRefund,
                  onPress: () => router.push({
                    pathname: '/refund-form',
                    params: { originalTransactionId: transaction.id },
                  }),
                }] : []),
                {
                  label: t.common.edit,
                  icon: { ios: 'pencil', android: 'edit', web: 'edit' },
                  disabled: !canEdit,
                  onPress: () => {
                    setActionError(undefined);
                    setEditing(true);
                  },
                },
                {
                  label: td.voidAction,
                  accessibilityLabel: voiding ? td.voiding : isRefund ? td.voidRefund : td.voidTransaction,
                  icon: { ios: 'slash.circle', android: 'block', web: 'block' },
                  busy: voiding,
                  disabled: !canVoid,
                  onPress: confirmVoid,
                  tone: 'destructive',
                },
              ]}
              hints={actionHints}
            />
          ) : null}
        </ScrollView>
      )}
      <DialogHost dialog={dialog} />
    </View>
  );
}

function TransactionEditForm({
  transaction,
  onSaved,
}: {
  transaction: Exclude<TransactionListItem, { type: 'refund' }>;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const ta = t.addTransaction;
  const type = transaction.type as TransactionFormType;
  const editCurrency: CurrencyCode = transaction.currency;
  const [amountDigits, setAmountDigits] = useState(editStringFromMinor(transaction.amount, editCurrency));
  const [selectedAccountId, setSelectedAccountId] = useState(transaction.accountId);
  const [destinationAccountId, setDestinationAccountId] = useState(transaction.destinationAccountId ?? undefined);
  const [selection, setSelection] = useState<CategorySelection | null>(
    transaction.categoryId
      ? { categoryId: transaction.categoryId, subcategoryId: transaction.subcategoryId }
      : null,
  );
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [transactionDate, setTransactionDate] = useState(transaction.transactionDate);
  const [note, setNote] = useState(transaction.note ?? '');
  const [pickerField, setPickerField] = useState<AccountPickerField>(null);
  const [errors, setErrors] = useState<TransactionValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [saving, setSaving] = useState(false);
  const { accounts } = useAccounts();
  const categoryType = transaction.type === 'income' ? 'income' : 'expense';
  const { categories } = useCategories(categoryType, true);
  const activeAccounts = accounts.filter((account) => !account.isArchived);
  // buildCategoryTree drops a subcategory whose parent is missing, so an active
  // subcategory under an archived category is correctly not offered.
  const activeTree = buildCategoryTree(categories.filter((category) => !category.isArchived));
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  const selectedCategory = categories.find((category) => category.id === selection?.categoryId);
  const selectedSubcategory = categories.find((category) => category.id === selection?.subcategoryId);
  const pickerAccounts = pickerField === 'source'
    ? activeAccounts.filter((account) => account.id !== destinationAccountId)
    : pickerField === 'destination'
      ? activeAccounts.filter((account) => account.id !== selectedAccountId)
      : activeAccounts;

  function selectCategory(next: CategorySelection) {
    setSelection(next);
    setErrors((current) => ({ ...current, categoryId: undefined, subcategoryId: undefined }));
  }

  async function save() {
    if (saving) return;
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const parsedAmount = parseMoney(amountDigits || '0', editCurrency);
      if (!parsedAmount.ok) {
        setErrors({ amount: t.transactions.errors.invalidAmount });
        setSaving(false);
        return;
      }
      // Preserve the original rate snapshot, pair included; the amount recomputes
      // the base-currency value against it rather than against today's rate.
      const savedRate = transaction.exchangeRateScaled
        && transaction.exchangeRateScale
        && transaction.exchangeRateBaseCode
        && transaction.exchangeRateQuoteCode
        && transaction.exchangeRateDate
        && transaction.exchangeRateSource
        ? {
            rateScaled: transaction.exchangeRateScaled,
            rateScale: transaction.exchangeRateScale,
            baseCurrencyCode: transaction.exchangeRateBaseCode,
            quoteCurrencyCode: transaction.exchangeRateQuoteCode,
            effectiveDate: transaction.exchangeRateDate,
            source: transaction.exchangeRateSource,
          }
        : null;
      const common = {
        amount: parsedAmount.minor,
        accountId: selectedAccountId,
        transactionDate,
        note,
      };
      if (transaction.type === 'transfer') {
        await transactionService.update(transaction.id, {
          ...common,
          type: 'transfer',
          destinationAccountId: destinationAccountId ?? '',
          categoryId: null,
          // Preserve the destination leg; for cross-currency, keep both amounts + rate.
          destinationAmountMinor: transaction.destinationCurrencyCode === transaction.currency
            ? parsedAmount.minor
            : transaction.destinationAmountMinor ?? undefined,
          destinationCurrencyCode: transaction.destinationCurrencyCode ?? undefined,
          exchangeRate: savedRate,
        });
      } else {
        await transactionService.update(transaction.id, {
          ...common,
          type: transaction.type,
          categoryId: selection?.categoryId ?? '',
          subcategoryId: selection?.subcategoryId ?? null,
          exchangeRate: savedRate,
        });
      }
      await onSaved();
    } catch (cause) {
      if (cause instanceof TransactionValidationError) {
        setErrors(cause.fields);
      } else {
        setGeneralError(actionErrorMessage(cause, t.transactions.errors.unableToEdit));
      }
      setSaving(false);
    }
  }

  const pickerTitle = pickerField === 'source'
    ? ta.selectSourceAccount
    : pickerField === 'destination'
      ? ta.selectDestinationAccount
      : ta.selectAccount;
  const pickerSelectedId = pickerField === 'destination' ? destinationAccountId : selectedAccountId;
  const categoryPath = [selectedCategory?.name, selectedSubcategory?.name].filter(Boolean).join(' › ');
  const historicalCategory = selectedCategory?.isArchived || selectedSubcategory?.isArchived
    ? t.transactions.details.archivedHistorical(categoryPath)
    : undefined;

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.editArea}>
      <ScrollView contentContainerStyle={styles.editContent} keyboardShouldPersistTaps="handled">
        <AmountInput
          currency={editCurrency}
          digits={amountDigits}
          error={errors.amount}
          onDigitsChange={(value) => setAmountDigits(sanitizeAmountEntry(value, editCurrency))}
          type={type}
        />
        <View style={[styles.lockedType, { backgroundColor: theme.elevatedSurface }]}>
          <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>{t.transactions.details.transactionType}</Text>
          <Text style={[styles.lockedTypeValue, { color: theme.primaryText }]}>{transactionTypeLabel(transaction)}</Text>
        </View>

        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
            {generalError}
          </Text>
        ) : null}

        {transaction.type === 'transfer' ? (
          <TransferAccountFields
            destination={destinationAccount?.name ?? ta.selectAccount}
            destinationError={errors.destinationAccountId}
            helperText={destinationAccount?.type === 'credit_card' ? ta.transferReducesDebt : undefined}
            onSelectDestination={() => setPickerField('destination')}
            onSelectSource={() => setPickerField('source')}
            source={selectedAccount?.name ?? ta.selectAccount}
            sourceError={errors.accountId}
          />
        ) : (
          <>
            {historicalCategory ? (
              <Text style={[styles.historicalValue, { color: theme.secondaryText }]}>{historicalCategory}</Text>
            ) : null}
            <CategoryGrid
              categories={activeTree}
              error={errors.categoryId}
              onSelect={selectCategory}
              onViewAll={() => setCategoryPickerVisible(true)}
              selection={selection}
              subcategoryError={errors.subcategoryId}
              type={transaction.type}
            />
            <CategoryPicker
              categories={activeTree}
              onClose={() => setCategoryPickerVisible(false)}
              onManage={() => router.push({ pathname: '/categories', params: { type: transaction.type } })}
              onSelect={selectCategory}
              selection={selection}
              title={transaction.type === 'income' ? ta.selectIncomeCategory : ta.selectExpenseCategory}
              visible={categoryPickerVisible}
            />
            <FormFieldButton
              error={errors.accountId}
              icon={{ ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
              label={transaction.type === 'income' ? ta.destinationAccount : ta.sourceAccount}
              onPress={() => setPickerField('account')}
              value={selectedAccount
                ? selectedAccount.isArchived
                  ? t.transactions.details.archivedHistorical(selectedAccount.name)
                  : selectedAccount.name
                : ta.selectAccount}
            />
          </>
        )}

        <DateField
          error={errors.transactionDate}
          label={ta.transactionDate}
          onChange={setTransactionDate}
          value={transactionDate}
        />

        <View style={styles.field}>
          <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>{ta.noteOptional}</Text>
          <TextInput
            accessibilityLabel={ta.noteA11y}
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder={ta.notePlaceholder}
            placeholderTextColor={theme.mutedText}
            style={[
              styles.noteInput,
              {
                backgroundColor: theme.surface,
                borderColor: errors.note ? theme.destructive : theme.hairline,
                color: theme.primaryText,
              },
            ]}
            textAlignVertical="top"
            value={note}
          />
          {errors.note ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.note}</Text> : null}
          <Text style={[styles.limit, { color: theme.mutedText }]}>{note.length}/200</Text>
        </View>
      </ScrollView>
      <FixedSaveBar bottomInset={insets.bottom} onPress={() => void save()} saving={saving} type={type} />
      <AccountPicker
        accounts={pickerAccounts}
        onClose={() => setPickerField(null)}
        onSelect={(id) => {
          setGeneralError(undefined);
          if (pickerField === 'destination') {
            setDestinationAccountId(id);
            setErrors((current) => ({ ...current, destinationAccountId: undefined }));
          } else {
            setSelectedAccountId(id);
            setErrors((current) => ({ ...current, accountId: undefined }));
          }
        }}
        selectedId={pickerSelectedId}
        title={pickerTitle}
        visible={pickerField !== null}
      />
    </KeyboardAvoidingView>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  const theme = useAppTheme();
  return (
    <View style={[styles.detailRow, { borderBottomColor: theme.hairline }]}>
      <Text style={[styles.detailLabel, { color: theme.mutedText }]}>{label}</Text>
      <Text selectable style={[styles.detailValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function CenteredState({ label, loading = false }: { label: string; loading?: boolean }) {
  const theme = useAppTheme();
  const t = useMessages();
  return (
    <View style={[styles.centeredState, { backgroundColor: theme.appBackground }]}>
      {loading ? <ActivityIndicator color={theme.primaryAction} /> : null}
      <Text style={[styles.centeredLabel, { color: theme.secondaryText }]}>{label}</Text>
      {!loading ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.centeredBack}>
          <Text style={{ color: theme.primaryAction }}>{t.transactions.details.goBack}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Formats a stored minor-unit amount for editing (no grouping). */
function editStringFromMinor(minor: number, currency: CurrencyCode): string {
  const definition = getCurrency(currency);
  const magnitude = Math.abs(minor);
  if (definition.fractionDigits === 0) return String(magnitude);
  const whole = Math.trunc(magnitude / definition.minorUnitFactor);
  const fraction = magnitude % definition.minorUnitFactor;
  return `${whole}.${String(fraction).padStart(definition.fractionDigits, '0')}`;
}

function formatAuditTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString(getIntlLocale(), { timeZone: 'America/Bogota' });
}

function actionErrorMessage(cause: unknown, fallback: string): string {
  // TransactionActionError carries curated, user-facing text; toUserMessage
  // passes those through while replacing raw driver/technical messages.
  return toUserMessage(cause, fallback);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  detailsContent: { gap: spacing.md, paddingHorizontal: spacing.md },
  statusBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadii.full,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 36,
    paddingHorizontal: spacing.md,
  },
  statusText: { ...typography.captionStrong },
  amountCard: { alignItems: 'center', borderRadius: borderRadii.lg, gap: spacing.sm, padding: spacing.lg },
  detailAmount: { ...typography.moneyHero },
  voidedAmount: { textDecorationLine: 'line-through' },
  voidedExplanation: { ...typography.caption, textAlign: 'center' },
  detailCard: { borderRadius: borderRadii.card, paddingHorizontal: spacing.md },
  refundHeading: { ...typography.sectionTitle, paddingTop: spacing.md },
  refundLink: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingVertical: spacing.sm,
  },
  refundLinkText: { ...typography.caption, flex: 1 },
  refundLinkAmount: { ...typography.moneyRow },
  refundExplanation: { borderRadius: borderRadii.md, gap: spacing.sm, padding: spacing.md },
  refundExplanationText: { ...typography.caption },
  originalLink: { ...typography.captionStrong },
  detailRow: { borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs, paddingVertical: spacing.sm + spacing.xs },
  detailLabel: { ...typography.overline },
  detailValue: { ...typography.body, fontFamily: typography.caption.fontFamily, fontSize: 14, lineHeight: 20 },
  error: { ...typography.caption },
  editArea: { flex: 1 },
  editContent: { gap: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  lockedType: { borderRadius: borderRadii.md, gap: spacing.xs, padding: spacing.md },
  lockedTypeValue: { ...typography.body, fontFamily: typography.sectionTitle.fontFamily, fontSize: 14, fontWeight: '700' },
  historicalValue: { ...typography.caption },
  field: { gap: spacing.sm },
  textInput: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  noteInput: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 104, padding: spacing.md },
  limit: { ...typography.label, textAlign: 'right' },
  centeredState: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  centeredLabel: { ...typography.body, textAlign: 'center' },
  centeredBack: { alignItems: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
});
