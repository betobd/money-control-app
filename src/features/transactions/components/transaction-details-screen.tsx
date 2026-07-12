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
import { formatCop } from '@/features/accounts/account-format';
import { useAccounts } from '@/features/accounts/use-accounts';
import { AccountPicker } from '@/features/add-transaction/components/account-picker';
import { AmountInput } from '@/features/add-transaction/components/amount-input';
import { CategoryGrid } from '@/features/add-transaction/components/category-grid';
import { FixedSaveBar } from '@/features/add-transaction/components/fixed-save-bar';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { TransferAccountFields } from '@/features/add-transaction/components/transfer-account-fields';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useCategories } from '@/features/categories/use-categories';
import { transactionTypeLabel } from '@/features/transactions/transaction-presentation';
import {
  TransactionActionError,
  TransactionValidationError,
} from '@/features/transactions/transaction.service';
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
  const [editing, setEditing] = useState(false);
  const [voiding, setVoiding] = useState(false);
  const [actionError, setActionError] = useState<string>();

  function confirmVoid() {
    if (!transaction || transaction.status === 'voided' || voiding) return;
    Alert.alert(
      'Void transaction?',
      'This removes the transaction from balances and reports while preserving it in history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Void transaction',
          style: 'destructive',
          onPress: () => {
            setVoiding(true);
            setActionError(undefined);
            void transactionService.void(transaction.id)
              .then(reload)
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

      {editing ? (
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
              {
                backgroundColor: transaction.status === 'voided' ? theme.disabledSurface : theme.elevatedSurface,
                borderColor: transaction.status === 'voided' ? theme.mutedText : theme.primaryAction,
              },
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

          <View style={[styles.amountCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>Amount</Text>
            <Text
              style={[
                styles.detailAmount,
                transaction.status === 'voided' && styles.voidedAmount,
                { color: transaction.status === 'voided' ? theme.mutedText : theme.primaryText },
              ]}>
              {formatCop(transaction.amount)}
            </Text>
            {transaction.status === 'voided' ? (
              <Text style={[styles.voidedExplanation, { color: theme.secondaryText }]}>
                Excluded from balances and reports
              </Text>
            ) : null}
          </View>

          <View style={[styles.detailCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <DetailRow label="Type" value={transactionTypeLabel(transaction)} />
            {transaction.type === 'transfer' ? (
              <>
                <DetailRow label="From account" value={transaction.accountName} />
                <DetailRow label="To account" value={transaction.destinationAccountName ?? 'Unknown account'} />
              </>
            ) : (
              <>
                <DetailRow label={transaction.type === 'income' ? 'Destination account' : 'Source account'} value={transaction.accountName} />
                <DetailRow label="Category" value={transaction.categoryName ?? 'Unknown category'} />
              </>
            )}
            <DetailRow label="Transaction date" value={transaction.transactionDate} />
            <DetailRow label="Note" value={transaction.note ?? 'No note'} />
            <DetailRow label="Created" value={formatAuditTimestamp(transaction.createdAt)} />
            <DetailRow label="Updated" value={formatAuditTimestamp(transaction.updatedAt)} />
          </View>

          {actionError ? (
            <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
              {actionError}
            </Text>
          ) : null}

          {transaction.status === 'posted' ? (
            <View style={styles.actions}>
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
              <Pressable
                accessibilityLabel="Void transaction"
                accessibilityRole="button"
                accessibilityState={{ disabled: voiding }}
                disabled={voiding}
                onPress={confirmVoid}
                style={[styles.actionButton, { backgroundColor: theme.surface, borderColor: theme.destructive, borderWidth: borderWidths.thin }]}>
                {voiding ? <ActivityIndicator color={theme.destructive} /> : null}
                <Text style={[styles.actionLabel, { color: theme.destructive }]}>
                  {voiding ? 'Voiding…' : 'Void transaction'}
                </Text>
              </Pressable>
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
  transaction: TransactionListItem;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const type = transaction.type as TransactionFormType;
  const [amountDigits, setAmountDigits] = useState(String(transaction.amount));
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
      const common = {
        amount: amountDigits ? Number(amountDigits) : 0,
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
        });
      } else {
        await transactionService.update(transaction.id, {
          ...common,
          type: transaction.type,
          categoryId: selectedCategoryId ?? '',
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
          digits={amountDigits}
          error={errors.amount}
          onDigitsChange={setAmountDigits}
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
            helperText={destinationAccount?.type === 'credit_card' ? 'Payment reduces the amount owed.' : undefined}
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
                borderColor: errors.transactionDate ? theme.destructive : theme.border,
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
                borderColor: errors.note ? theme.destructive : theme.border,
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
    <View style={styles.detailRow}>
      <Text style={[styles.detailLabel, { color: theme.secondaryText }]}>{label}</Text>
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

function formatAuditTimestamp(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('en-CO', { timeZone: 'America/Bogota' });
}

function actionErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof TransactionActionError || cause instanceof Error) return cause.message;
  return fallback;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.md },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  detailsContent: { gap: spacing.lg, paddingHorizontal: spacing.md },
  statusBadge: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    borderRadius: borderRadii.full,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 40,
    paddingHorizontal: spacing.md,
  },
  statusText: { ...typography.caption, fontWeight: '700' },
  amountCard: { alignItems: 'center', borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.sm, padding: spacing.lg },
  detailAmount: { ...typography.display, fontVariant: ['tabular-nums'] },
  voidedAmount: { textDecorationLine: 'line-through' },
  voidedExplanation: { ...typography.caption, textAlign: 'center' },
  detailCard: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, padding: spacing.md },
  detailRow: { gap: spacing.xs, paddingVertical: spacing.sm },
  detailLabel: { ...typography.label, textTransform: 'uppercase' },
  detailValue: { ...typography.body },
  actions: { gap: spacing.md },
  actionButton: { alignItems: 'center', borderRadius: borderRadii.full, flexDirection: 'row', gap: spacing.sm, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.lg },
  actionLabel: { ...typography.body, fontWeight: '700' },
  error: { ...typography.caption },
  editArea: { flex: 1 },
  editContent: { gap: spacing.lg, paddingBottom: spacing.xl, paddingHorizontal: spacing.md },
  lockedType: { borderRadius: borderRadii.md, gap: spacing.xs, padding: spacing.md },
  lockedTypeValue: { ...typography.body, fontWeight: '700' },
  historicalValue: { ...typography.caption },
  field: { gap: spacing.sm },
  textInput: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  noteInput: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 104, padding: spacing.md },
  limit: { ...typography.label, textAlign: 'right' },
  centeredState: { alignItems: 'center', flex: 1, gap: spacing.md, justifyContent: 'center', padding: spacing.lg },
  centeredLabel: { ...typography.body, textAlign: 'center' },
  centeredBack: { alignItems: 'center', minHeight: 48, justifyContent: 'center', paddingHorizontal: spacing.md },
});
