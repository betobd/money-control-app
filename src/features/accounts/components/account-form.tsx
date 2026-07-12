import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
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

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { accountTypeLabels } from '@/features/accounts/account-format';
import { AccountValidationError } from '@/features/accounts/account.service';
import { accountService } from '@/features/accounts/accounts';
import { accountTypes, type AccountField, type AccountType, type AccountValidationErrors } from '@/features/accounts/account.types';
import { useAppTheme } from '@/hooks/use-app-theme';

function parseWholePesos(value: string): number {
  if (!/^-?\d+$/.test(value.trim())) return Number.NaN;
  return Number(value);
}

export function AccountForm({ accountId }: { accountId?: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useAppTheme();
  const [name, setName] = useState('');
  const [type, setType] = useState<AccountType>('checking');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [creditLimit, setCreditLimit] = useState('');
  const [errors, setErrors] = useState<AccountValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(accountId));
  const [saving, setSaving] = useState(false);
  const [openingBalanceEditable, setOpeningBalanceEditable] = useState(true);
  const isEditing = Boolean(accountId);

  useEffect(() => {
    if (!accountId) return;
    Promise.all([accountService.get(accountId), accountService.canEditOpeningBalance(accountId)])
      .then(([account, canEdit]) => {
        if (!account) throw new Error('Account not found.');
        setName(account.name);
        setType(account.type);
        setOpeningBalance(String(account.type === 'credit_card' ? Math.abs(account.openingBalance) : account.openingBalance));
        setCreditLimit(account.creditLimit === null ? '' : String(account.creditLimit));
        setOpeningBalanceEditable(canEdit);
      })
      .catch((cause) => setGeneralError(cause instanceof Error ? cause.message : 'Unable to load account.'))
      .finally(() => setLoading(false));
  }, [accountId]);

  function clearError(field: AccountField) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const input = {
        name,
        type,
        openingBalance: parseWholePesos(openingBalance),
        creditLimit: type === 'credit_card' && creditLimit.trim() ? parseWholePesos(creditLimit) : null,
      };
      if (accountId) await accountService.update(accountId, input);
      else await accountService.create(input);
      router.back();
    } catch (cause) {
      if (cause instanceof AccountValidationError) setErrors(cause.fields);
      else setGeneralError(cause instanceof Error ? cause.message : 'Unable to save account.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: theme.appBackground }]}>
      <View style={[styles.header, { borderBottomColor: theme.border, paddingTop: insets.top + spacing.sm }]}>
        <Pressable accessibilityLabel="Close account form" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.primaryText }]}>{isEditing ? 'Edit Account' : 'New Account'}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        keyboardShouldPersistTaps="handled">
        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>
            {generalError}
          </Text>
        ) : null}
        <FormField label="Account name" error={errors.name} theme={theme}>
          <TextInput
            accessibilityLabel="Account name"
            autoCapitalize="words"
            maxLength={80}
            onChangeText={(value) => { setName(value); clearError('name'); }}
            placeholder="e.g. Main Checking"
            placeholderTextColor={theme.mutedText}
            style={[styles.input, { backgroundColor: theme.surface, borderColor: errors.name ? theme.destructive : theme.border, color: theme.primaryText }]}
            value={name}
          />
        </FormField>

        <FormField label="Account type" error={errors.type} theme={theme}>
          <View style={styles.typeGrid}>
            {accountTypes.map((option) => {
              const selected = type === option;
              return (
                <Pressable
                  accessibilityLabel={accountTypeLabels[option]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => { setType(option); clearError('type'); clearError('creditLimit'); }}
                  style={[styles.typeButton, { backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface, borderColor: selected ? theme.primaryAction : theme.border }]}>
                  <Text style={[styles.typeText, { color: selected ? theme.selectedNavigationForeground : theme.secondaryText }]}>{accountTypeLabels[option]}</Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>

        <FormField label="Currency" theme={theme}>
          <View style={[styles.readOnly, { backgroundColor: theme.disabledSurface, borderColor: theme.border }]}><Text style={[styles.inputText, { color: theme.secondaryText }]}>COP · Colombian peso</Text></View>
        </FormField>

        <FormField label="Opening balance" error={errors.openingBalance} theme={theme}>
          <TextInput
            accessibilityLabel="Opening balance in whole Colombian pesos"
            editable={openingBalanceEditable}
            keyboardType="number-pad"
            onChangeText={(value) => { setOpeningBalance(value.replace(/[^\d-]/g, '')); clearError('openingBalance'); }}
            placeholder="0"
            placeholderTextColor={theme.mutedText}
            style={[styles.input, { backgroundColor: openingBalanceEditable ? theme.surface : theme.disabledSurface, borderColor: errors.openingBalance ? theme.destructive : theme.border, color: openingBalanceEditable ? theme.primaryText : theme.disabledText }]}
            value={openingBalance}
          />
          {!openingBalanceEditable ? <Text style={[styles.help, { color: theme.secondaryText }]}>Locked because this account has posted activity. Use an adjustment transaction for corrections.</Text> : null}
        </FormField>

        {type === 'credit_card' ? (
          <FormField label="Credit limit (optional)" error={errors.creditLimit} theme={theme}>
            <TextInput
              accessibilityLabel="Credit limit in whole Colombian pesos"
              keyboardType="number-pad"
              onChangeText={(value) => { setCreditLimit(value.replace(/\D/g, '')); clearError('creditLimit'); }}
              placeholder="0"
              placeholderTextColor={theme.mutedText}
              style={[styles.input, { backgroundColor: theme.surface, borderColor: errors.creditLimit ? theme.destructive : theme.border, color: theme.primaryText }]}
              value={creditLimit}
            />
          </FormField>
        ) : null}

        <Pressable
          accessibilityLabel={isEditing ? 'Save account changes' : 'Create account'}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: saving ? theme.disabledSurface : theme.primaryAction }]}>
          {saving ? <ActivityIndicator color={theme.disabledText} /> : <Text style={[styles.saveText, { color: theme.onPrimaryAction }]}>{isEditing ? 'Save Changes' : 'Create Account'}</Text>}
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

type Theme = ReturnType<typeof useAppTheme>;
function FormField({ children, error, label, theme }: { children: React.ReactNode; error?: string; label: string; theme: Theme }) {
  return <View style={styles.field}><Text style={[styles.label, { color: theme.primaryText }]}>{label}</Text>{children}{error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}</View>;
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', borderBottomWidth: borderWidths.thin, flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md },
  field: { gap: spacing.sm },
  label: { ...typography.body, fontWeight: '700' },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 52, paddingHorizontal: spacing.md },
  inputText: { ...typography.body },
  readOnly: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  typeButton: { alignItems: 'center', borderRadius: borderRadii.full, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 48, paddingHorizontal: spacing.md },
  typeText: { ...typography.caption, fontWeight: '700' },
  error: { ...typography.caption },
  help: { ...typography.caption },
  save: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  saveText: { ...typography.body, fontWeight: '700' },
});
