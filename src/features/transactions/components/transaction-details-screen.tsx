import { router } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useState } from 'react';
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

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { useAccounts } from '@/features/accounts/use-accounts';
import {
  formatExchangeRate,
  formatMoney,
  formatMoneyWithSymbol,
  getCurrency,
  parseMoney,
  type CurrencyCode,
} from '@/features/currency/currency';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput, sanitizeAmountEntry } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid } from '@/features/add-transaction/components/category-grid';
import { FixedSaveBar } from '@/features/add-transaction/components/fixed-save-bar';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { TransferAccountFields } from '@/features/add-transaction/components/transfer-account-fields';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useCategories } from '@/features/categories/use-categories';
import { refundService } from '@/features/refunds/refunds';
import { useRefundSummary } from '@/features/refunds/use-refund-summary';
import { formatTransactionDate } from '@/features/transactions/transaction-date';
import { transactionTypeLabel } from '@/features/transactions/transaction-presentation';
import { TransactionValidationError } from '@/features/transactions/transaction.service';
import { transactionService } from '@/features/transactions/transactions';
import type {
  TransactionListItem,
  TransactionValidationErrors,
} from '@/features/transactions/transaction.types';
import { useTransactionDetails } from '@/features/transactions/use-transaction-details';
import { useAppTheme } from '@/hooks/use-app-theme';

type AccountPickerField = 'account' | 'source' | 'destination' | null;

export function TransactionDetailsScreen({ transactionId }: { transactionId: string }) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
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

  function confirmVoid() {
    if (!transaction || transaction.status === 'voided' || voiding) return;
    const isRefund = transaction.type === 'refund';
    Alert.alert(
      isRefund ? 'Void refund?' : 'Void transaction?',
      isRefund
        ? 'This restores the refundable amount and removes the refund from balances, budgets, and reports.'
        : 'This removes the transaction from balances and reports while preserving it in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: isRefund ? 'Void refund' : 'Void transaction',
          style: 'destructive',
          onPress: () => {
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
                setActionError(actionErrorMessage(cause, 'Unable to void transaction.'));
              })
              .finally(() => setVoiding(false));
          },
        },
      ],
    );
  }

  if (loading && transaction === undefined) {
    return <CenteredState label="Loading transaction…" loading />;
  }
  if (error) return <CenteredState label={error} />;
  if (!transaction) return <CenteredState label="Transaction not found." />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel={editing ? 'Cancel editing' : 'Close transaction details'}
          accessibilityRole="button"
          onPress={() => editing ? setEditing(false) : router.back()}
          style={styles.headerButton}>
          <SymbolView
            name={{ ios: editing ? 'xmark' : 'chevron.left', android: editing ? 'close' : 'arrow_back', web: editing ? 'close' : 'arrow_back' }}
            size={24}
            tintColor={theme.primaryText}
          />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.primaryText }]}>
          {editing ? 'Edit Transaction' : 'Transaction Details'}
        </Text>
        <View style={styles.headerButton} />
      </View>

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
            accessibilityLabel={`Status, ${transaction.status === 'voided' ? 'Voided' : 'Posted'}`}
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
              {transaction.status === 'voided' ? 'Voided' : 'Posted'}
            </Text>
          </View>

          <View style={[styles.amountCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.detailLabel, { color: theme.mutedText }]}>Amount</Text>
            <Text
              style={[
                styles.detailAmount,
                transaction.status === 'voided' && styles.voidedAmount,
                { color: transaction.status === 'voided' ? theme.mutedText : theme.primaryText },
              ]}>
              {formatMoneyWithSymbol(transaction.amount, transaction.currency)}
            </Text>
            {transaction.type !== 'transfer' && transaction.currency !== 'COP' && transaction.baseAmountMinor !== null ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                {formatMoney(transaction.baseAmountMinor, 'COP')} at the rate saved when recorded
                {transaction.exchangeRateScaled && transaction.exchangeRateScale
                  ? ` (COP ${formatExchangeRate({ rateScaled: transaction.exchangeRateScaled, rateScale: transaction.exchangeRateScale })}/USD)`
                  : ''}
              </Text>
            ) : null}
            {transaction.type === 'transfer' && transaction.destinationAmountMinor !== null && transaction.destinationCurrencyCode
              && transaction.destinationCurrencyCode !== transaction.currency ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                → {formatMoneyWithSymbol(transaction.destinationAmountMinor, transaction.destinationCurrencyCode)}
                {transaction.exchangeRateScaled && transaction.exchangeRateScale
                  ? ` · effective COP ${formatExchangeRate({ rateScaled: transaction.exchangeRateScaled, rateScale: transaction.exchangeRateScale })}/USD`
                  : ''}
              </Text>
            ) : null}
            {transaction.status === 'voided' ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                Excluded from balances and reports
              </Text>
            ) : null}
          </View>

          {transaction.type === 'expense' && refundSummary ? (
            <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
              <Text style={[styles.refundHeading, { color: theme.primaryText }]}>
                {refundSummary.refundStatus === 'full'
                  ? 'Fully refunded'
                  : refundSummary.refundStatus === 'partial'
                    ? 'Partially refunded'
                    : 'Refund status'}
              </Text>
              <DetailRow label="Gross amount" value={formatMoneyWithSymbol(refundSummary.grossAmount, transaction.currency)} />
              <DetailRow label="Refunded" value={formatMoneyWithSymbol(refundSummary.refundedAmount, transaction.currency)} />
              <DetailRow label="Net expense" value={formatMoneyWithSymbol(refundSummary.netExpense, transaction.currency)} />
              <DetailRow label="Refundable remaining" value={formatMoneyWithSymbol(refundSummary.refundableRemaining, transaction.currency)} />
              {refundSummary.refunds.map((refund) => (
                <Pressable
                  accessibilityHint="Opens refund details"
                  accessibilityRole="button"
                  key={refund.id}
                  onPress={() => router.push({ pathname: '/transactions/[id]', params: { id: refund.id } })}
                  style={[styles.refundLink, { borderTopColor: theme.hairline }]}>
                  <Text style={[styles.refundLinkText, { color: theme.primaryAction }]}>
                    {refund.status === 'voided' ? 'Voided refund' : 'Refund'} · {formatTransactionDate(refund.transactionDate)}
                  </Text>
                  <Text style={[styles.refundLinkAmount, { color: refund.status === 'voided' ? theme.mutedText : theme.primaryAction }]}>
                    +{formatMoneyWithSymbol(refund.amount, refund.currency)}
                  </Text>
                </Pressable>
              ))}
            </View>
          ) : null}

          <View style={[styles.detailCard, { backgroundColor: theme.surface }]}>
            <DetailRow label="Type" value={transactionTypeLabel(transaction)} />
            {transaction.type === 'transfer' ? (
              <>
                <DetailRow label="From account" value={transaction.accountName} />
                <DetailRow label="To account" value={transaction.destinationAccountName ?? 'Unknown account'} />
              </>
            ) : transaction.type === 'refund' ? (
              <>
                <DetailRow label="Returned to account" value={transaction.accountName} />
                <DetailRow label="Inherited category" value={transaction.categoryName ?? 'Unknown category'} />
              </>
            ) : (
              <>
                <DetailRow label={transaction.type === 'income' ? 'Destination account' : 'Source account'} value={transaction.accountName} />
                <DetailRow label="Category" value={transaction.categoryName ?? 'Unknown category'} />
              </>
            )}
            <DetailRow label="Transaction date" value={formatTransactionDate(transaction.transactionDate)} />
            <DetailRow label="Note" value={transaction.note ?? 'No note'} />
            <DetailRow label="Created" value={formatAuditTimestamp(transaction.createdAt)} />
            <DetailRow label="Updated" value={formatAuditTimestamp(transaction.updatedAt)} />
          </View>

          {transaction.type === 'refund' ? (
            <View style={[styles.refundExplanation, { backgroundColor: theme.tintPrimary }]}>
              <Text style={[styles.refundExplanationText, { color: theme.primaryText }]}>
                This refund reduces expenses and returns money to the original account. It is not income.
              </Text>
              <Pressable
                accessibilityLabel="View original expense"
                accessibilityRole="button"
                onPress={() => router.replace({
                  pathname: '/transactions/[id]',
                  params: { id: transaction.originalTransactionId },
                })}>
                <Text style={[styles.originalLink, { color: theme.primaryAction }]}>View original expense</Text>
              </Pressable>
            </View>
          ) : null}

          {actionError || refundError ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {actionError ?? refundError}
            </Text>
          ) : null}

          {transaction.status === 'posted' ? (
            <View style={styles.actions}>
              {transaction.type === 'expense'
                && refundSummary
                && refundSummary.refundableRemaining > 0 ? (
                <Pressable
                  accessibilityLabel="Add refund"
                  accessibilityRole="button"
                  onPress={() => router.push({
                    pathname: '/refund-form',
                    params: { originalTransactionId: transaction.id },
                  })}
                  style={[styles.actionButton, { backgroundColor: theme.primaryAction }]}>
                  <Text style={[styles.actionLabel, { color: theme.onPrimaryAction }]}>Add refund</Text>
                </Pressable>
              ) : null}
              {transaction.type !== 'refund'
                && (transaction.type !== 'expense' || refundSummary?.refundedAmount === 0) ? (
                <Pressable
                accessibilityLabel="Edit transaction"
                accessibilityRole="button"
                onPress={() => {
                  setActionError(undefined);
                  setEditing(true);
                }}
                style={[styles.actionButton, { backgroundColor: theme.primaryAction }]}>
                <Text style={[styles.actionLabel, { color: theme.onPrimaryAction }]}>Edit transaction</Text>
              </Pressable>
              ) : null}
              {transaction.type !== 'expense' || refundSummary?.refundedAmount === 0 ? (
              <Pressable
                accessibilityLabel={transaction.type === 'refund' ? 'Void refund' : 'Void transaction'}
                accessibilityRole="button"
                accessibilityState={{ disabled: voiding }}
                disabled={voiding}
                onPress={confirmVoid}
                style={[styles.actionButton, { backgroundColor: theme.tintDestructive }]}>
                {voiding ? <ActivityIndicator color={theme.destructive} /> : null}
                <Text style={[styles.actionLabel, { color: theme.destructive }]}>
                  {voiding ? 'Voiding…' : transaction.type === 'refund' ? 'Void refund' : 'Void transaction'}
                </Text>
              </Pressable>
              ) : (
                <Text style={[styles.lockedExplanation, { color: theme.secondaryText }]}>
                  Void all posted refunds before editing or voiding this expense.
                </Text>
              )}
            </View>
          ) : null}
        </ScrollView>
      )}
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
  const type = transaction.type as TransactionFormType;
  const editCurrency: CurrencyCode = transaction.currency;
  const [amountDigits, setAmountDigits] = useState(editStringFromMinor(transaction.amount, editCurrency));
  const [selectedAccountId, setSelectedAccountId] = useState(transaction.accountId);
  const [destinationAccountId, setDestinationAccountId] = useState(transaction.destinationAccountId ?? undefined);
  const [selectedCategoryId, setSelectedCategoryId] = useState(transaction.categoryId ?? undefined);
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
  const activeCategories = categories.filter((category) => !category.isArchived);
  const selectedAccount = accounts.find((account) => account.id === selectedAccountId);
  const destinationAccount = accounts.find((account) => account.id === destinationAccountId);
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  const pickerAccounts = pickerField === 'source'
    ? activeAccounts.filter((account) => account.id !== destinationAccountId)
    : pickerField === 'destination'
      ? activeAccounts.filter((account) => account.id !== selectedAccountId)
      : activeAccounts;

  async function save() {
    if (saving) return;
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const parsedAmount = parseMoney(amountDigits || '0', editCurrency);
      if (!parsedAmount.ok) {
        setErrors({ amount: 'Enter a valid amount greater than zero.' });
        setSaving(false);
        return;
      }
      // Preserve the original rate snapshot; the amount recomputes the COP base against it.
      const savedRate = transaction.exchangeRateScaled && transaction.exchangeRateScale && transaction.exchangeRateDate && transaction.exchangeRateSource
        ? {
            rateScaled: transaction.exchangeRateScaled,
            rateScale: transaction.exchangeRateScale,
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
          categoryId: selectedCategoryId ?? '',
          exchangeRate: savedRate,
        });
      }
      await onSaved();
    } catch (cause) {
      if (cause instanceof TransactionValidationError) {
        setErrors(cause.fields);
      } else {
        setGeneralError(actionErrorMessage(cause, 'Unable to edit transaction.'));
      }
      setSaving(false);
    }
  }

  const pickerTitle = pickerField === 'source'
    ? 'Select source account'
    : pickerField === 'destination'
      ? 'Select destination account'
      : 'Select account';
  const pickerSelectedId = pickerField === 'destination' ? destinationAccountId : selectedAccountId;
  const historicalCategory = selectedCategory?.isArchived
    ? `${selectedCategory.name} (archived historical value)`
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
          <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Transaction type</Text>
          <Text style={[styles.lockedTypeValue, { color: theme.primaryText }]}>{transactionTypeLabel(transaction)}</Text>
        </View>

        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
            {generalError}
          </Text>
        ) : null}

        {transaction.type === 'transfer' ? (
          <TransferAccountFields
            destination={destinationAccount?.name ?? 'Select account'}
            destinationError={errors.destinationAccountId}
            helperText={destinationAccount?.type === 'credit_card' ? 'This transfer reduces the card’s current debt.' : undefined}
            onSelectDestination={() => setPickerField('destination')}
            onSelectSource={() => setPickerField('source')}
            source={selectedAccount?.name ?? 'Select account'}
            sourceError={errors.accountId}
          />
        ) : (
          <>
            {historicalCategory ? (
              <Text style={[styles.historicalValue, { color: theme.secondaryText }]}>{historicalCategory}</Text>
            ) : null}
            <CategoryGrid
              categories={activeCategories}
              error={errors.categoryId}
              onSelect={(id) => {
                setSelectedCategoryId(id);
                setErrors((current) => ({ ...current, categoryId: undefined }));
              }}
              onViewAll={() => router.push({ pathname: '/categories', params: { type: transaction.type } })}
              selectedId={selectedCategoryId}
              type={transaction.type}
            />
            <FormFieldButton
              error={errors.accountId}
              icon={{ ios: 'wallet.bifold.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' }}
              label={transaction.type === 'income' ? 'Destination account' : 'Source account'}
              onPress={() => setPickerField('account')}
              value={selectedAccount
                ? `${selectedAccount.name}${selectedAccount.isArchived ? ' (archived historical value)' : ''}`
                : 'Select account'}
            />
          </>
        )}

        <View style={styles.field}>
          <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Transaction date</Text>
          <TextInput
            accessibilityLabel="Transaction date, YYYY-MM-DD"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={setTransactionDate}
            style={[
              styles.textInput,
              {
                backgroundColor: theme.surface,
                borderColor: errors.transactionDate ? theme.destructive : theme.hairline,
                color: theme.primaryText,
              },
            ]}
            value={transactionDate}
          />
          {errors.transactionDate ? <Text style={[styles.error, { color: theme.destructive }]}>{errors.transactionDate}</Text> : null}
        </View>

        <View style={styles.field}>
          <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Note (optional)</Text>
          <TextInput
            accessibilityLabel="Transaction note, optional"
            maxLength={200}
            multiline
            onChangeText={setNote}
            placeholder="Add a description…"
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
  return (
    <View style={[styles.centeredState, { backgroundColor: theme.appBackground }]}>
      {loading ? <ActivityIndicator color={theme.primaryAction} /> : null}
      <Text style={[styles.centeredLabel, { color: theme.secondaryText }]}>{label}</Text>
      {!loading ? (
        <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.centeredBack}>
          <Text style={{ color: theme.primaryAction }}>Go back</Text>
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
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-CO', { timeZone: 'America/Bogota' });
}

function actionErrorMessage(cause: unknown, fallback: string): string {
  // TransactionActionError carries curated, user-facing text; toUserMessage
  // passes those through while replacing raw driver/technical messages.
  return toUserMessage(cause, fallback);
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.md },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
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
  statusText: { ...typography.caption, fontWeight: '700' },
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
  originalLink: { ...typography.caption, fontWeight: '700' },
  lockedExplanation: { ...typography.caption, textAlign: 'center' },
  detailRow: { borderBottomWidth: StyleSheet.hairlineWidth, gap: spacing.xs, paddingVertical: spacing.sm + spacing.xs },
  detailLabel: { ...typography.overline },
  detailValue: { ...typography.body, fontFamily: typography.caption.fontFamily, fontSize: 14, lineHeight: 20 },
  actions: { gap: spacing.md },
  actionButton: { alignItems: 'center', borderRadius: borderRadii.full, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.lg },
  actionLabel: { ...typography.body, fontWeight: '700' },
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
