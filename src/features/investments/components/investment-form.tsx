import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
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

import { Overline } from '@/components/overline';
import { borderRadii, borderWidths, fonts, spacing, typography } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { getCurrency, listCurrencies, parseMoney, type CurrencyCode } from '@/features/currency/currency';
import { useAppTheme } from '@/hooks/use-app-theme';
import { investmentLiquidityLabels, investmentTypeLabels } from '../investment-format';
import { InvestmentValidationError } from '../investment.service';
import {
  investmentLiquidities,
  investmentTypes,
  type InvestmentAccountField,
  type InvestmentAccountInput,
  type InvestmentLiquidity,
  type InvestmentType,
  type InvestmentValidationErrors,
} from '../investment.types';
import { investmentService } from '../investments';

/** Guided (editable) default liquidity for a given investment type. */
function defaultLiquidityFor(type: InvestmentType): InvestmentLiquidity {
  if (type === 'fixed_term_deposit') return 'locked';
  if (type === 'voluntary_pension') return 'restricted';
  return 'liquid';
}

/** Sanitizes raw money input for the given currency: digits and optional dot (USD). */
function sanitizeMoneyInput(value: string, currency: CurrencyCode): string {
  const allowDot = getCurrency(currency).fractionDigits > 0;
  return value.replace(allowDot ? /[^\d.]/g : /\D/g, '');
}

/** Formats a stored minor-unit magnitude for editing (no grouping). */
function editStringFromMinor(minor: number, currency: CurrencyCode): string {
  const definition = getCurrency(currency);
  if (definition.fractionDigits === 0) return String(minor);
  const whole = Math.trunc(minor / definition.minorUnitFactor);
  const fraction = minor % definition.minorUnitFactor;
  return `${whole}.${String(fraction).padStart(definition.fractionDigits, '0')}`;
}

export function InvestmentForm({ accountId }: { accountId?: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const theme = useAppTheme();
  const isEditing = Boolean(accountId);

  const [name, setName] = useState('');
  const [currency, setCurrency] = useState<CurrencyCode>('COP');
  const [investmentType, setInvestmentType] = useState<InvestmentType>('brokerage');
  const [liquidity, setLiquidity] = useState<InvestmentLiquidity>('liquid');
  const [liquidityTouched, setLiquidityTouched] = useState(false);
  const [providerName, setProviderName] = useState('');
  const [openingBalance, setOpeningBalance] = useState('0');
  const [startDate, setStartDate] = useState('');
  const [maturityDate, setMaturityDate] = useState('');
  const [note, setNote] = useState('');
  const [errors, setErrors] = useState<InvestmentValidationErrors>({});
  const [generalError, setGeneralError] = useState<string>();
  const [loading, setLoading] = useState(Boolean(accountId));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!accountId) return;
    investmentService
      .get(accountId)
      .then((loaded) => {
        if (!loaded) throw new Error('Investment not found.');
        const { account, metadata } = loaded;
        setName(account.name);
        setCurrency(account.currency);
        setInvestmentType(metadata.investmentType);
        setLiquidity(metadata.liquidity);
        setLiquidityTouched(true);
        setProviderName(metadata.providerName ?? '');
        setOpeningBalance(editStringFromMinor(account.openingBalance, account.currency));
        setStartDate(metadata.startDate ?? '');
        setMaturityDate(metadata.maturityDate ?? '');
        setNote(metadata.note ?? '');
      })
      .catch((cause) => setGeneralError(toUserMessage(cause, 'Unable to load investment.')))
      .finally(() => setLoading(false));
  }, [accountId]);

  function clearError(field: InvestmentAccountField) {
    setErrors((current) => ({ ...current, [field]: undefined }));
  }

  function selectType(option: InvestmentType) {
    setInvestmentType(option);
    if (!liquidityTouched) setLiquidity(defaultLiquidityFor(option));
    clearError('investmentType');
  }

  async function save() {
    setSaving(true);
    setErrors({});
    setGeneralError(undefined);
    try {
      const openingParsed = parseMoney(openingBalance.trim() || '0', currency);
      if (!openingParsed.ok) {
        setErrors({ openingBalance: 'Enter a valid, non-negative amount.' });
        setSaving(false);
        return;
      }
      const input: InvestmentAccountInput = {
        name,
        currency,
        openingBalanceMinor: openingParsed.minor,
        investmentType,
        liquidity,
        providerName: providerName.trim() ? providerName.trim() : null,
        startDate: startDate.trim() ? startDate.trim() : null,
        maturityDate: maturityDate.trim() ? maturityDate.trim() : null,
        note: note.trim() ? note.trim() : null,
      };
      if (accountId) await investmentService.update(accountId, input);
      else await investmentService.create(input);
      router.back();
    } catch (cause) {
      if (cause instanceof InvestmentValidationError) setErrors(cause.fields);
      else setGeneralError(toUserMessage(cause, 'Unable to save investment.'));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <View style={[styles.loading, { backgroundColor: theme.appBackground }]}><ActivityIndicator color={theme.primaryAction} /></View>;
  }

  const inputStyle = (invalid: boolean) => [
    styles.input,
    { backgroundColor: theme.surface, borderColor: invalid ? theme.destructive : theme.hairline, color: theme.primaryText },
  ];

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.flex, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Pressable accessibilityLabel="Close investment form" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}>
          <SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.headerTitle, { color: theme.primaryText }]}>{isEditing ? 'Edit Investment' : 'New Investment'}</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {generalError ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.error, { color: theme.destructive }]}>{generalError}</Text>
        ) : null}

        <FormField label="Investment name" error={errors.name} theme={theme}>
          <TextInput
            accessibilityLabel="Investment name"
            autoCapitalize="words"
            maxLength={80}
            onChangeText={(value) => { setName(value); clearError('name'); }}
            placeholder="e.g. Brokerage — S&P 500"
            placeholderTextColor={theme.mutedText}
            style={inputStyle(Boolean(errors.name))}
            value={name}
          />
        </FormField>

        <FormField label="Investment type" error={errors.investmentType} theme={theme}>
          <View style={styles.grid}>
            {investmentTypes.map((option) => {
              const selected = investmentType === option;
              return (
                <Pressable
                  accessibilityLabel={investmentTypeLabels[option]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => selectType(option)}
                  style={[styles.gridCell, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent' }]}>
                  <Text style={[styles.gridText, { color: selected ? theme.primaryText : theme.secondaryText }]}>{investmentTypeLabels[option]}</Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>

        <FormField label="Liquidity" error={errors.liquidity} theme={theme}>
          <View style={styles.segment}>
            {investmentLiquidities.map((option) => {
              const selected = liquidity === option;
              return (
                <Pressable
                  accessibilityLabel={investmentLiquidityLabels[option]}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option}
                  onPress={() => { setLiquidity(option); setLiquidityTouched(true); clearError('liquidity'); }}
                  style={[styles.segmentCell, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent' }]}>
                  <Text style={[styles.segmentText, { color: selected ? theme.primaryText : theme.secondaryText }]}>{investmentLiquidityLabels[option]}</Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>

        <FormField label="Currency" error={errors.currency} theme={theme}>
          <View style={styles.segment}>
            {listCurrencies().map((option) => {
              const selected = currency === option.code;
              return (
                <Pressable
                  accessibilityLabel={`${option.code} ${option.name}`}
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option.code}
                  onPress={() => { setCurrency(option.code); clearError('currency'); clearError('openingBalance'); }}
                  style={[styles.segmentCell, { backgroundColor: selected ? theme.tintPrimary : theme.surface, borderColor: selected ? theme.primaryAction : 'transparent' }]}>
                  <Text style={[styles.segmentText, { color: selected ? theme.primaryText : theme.secondaryText }]}>{option.code}</Text>
                </Pressable>
              );
            })}
          </View>
        </FormField>

        <FormField label={`Initial value (${currency})`} error={errors.openingBalance} theme={theme}>
          <TextInput
            accessibilityLabel={`Initial value in ${getCurrency(currency).name}`}
            keyboardType={getCurrency(currency).fractionDigits > 0 ? 'decimal-pad' : 'number-pad'}
            onChangeText={(value) => { setOpeningBalance(sanitizeMoneyInput(value, currency)); clearError('openingBalance'); }}
            placeholder={getCurrency(currency).fractionDigits > 0 ? '0.00' : '0'}
            placeholderTextColor={theme.mutedText}
            style={[styles.moneyInput, inputStyle(Boolean(errors.openingBalance))]}
            value={openingBalance}
          />
          <Text style={[styles.help, { color: theme.secondaryText }]}>The capital initially placed in this investment. Record later contributions as transfers.</Text>
        </FormField>

        <FormField label="Provider (optional)" error={errors.providerName} theme={theme}>
          <TextInput
            accessibilityLabel="Provider name"
            maxLength={100}
            onChangeText={(value) => { setProviderName(value); clearError('providerName'); }}
            placeholder="e.g. Bancolombia, Interactive Brokers"
            placeholderTextColor={theme.mutedText}
            style={inputStyle(Boolean(errors.providerName))}
            value={providerName}
          />
        </FormField>

        <FormField label="Start date (optional)" error={errors.startDate} theme={theme}>
          <TextInput
            accessibilityLabel="Start date, year month day"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={(value) => { setStartDate(value); clearError('startDate'); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.mutedText}
            style={inputStyle(Boolean(errors.startDate))}
            value={startDate}
          />
        </FormField>

        <FormField label="Maturity date (optional)" error={errors.maturityDate} theme={theme}>
          <TextInput
            accessibilityLabel="Maturity date, year month day"
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            onChangeText={(value) => { setMaturityDate(value); clearError('maturityDate'); }}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={theme.mutedText}
            style={inputStyle(Boolean(errors.maturityDate))}
            value={maturityDate}
          />
        </FormField>

        <FormField label="Note (optional)" error={errors.note} theme={theme}>
          <TextInput
            accessibilityLabel="Note"
            maxLength={200}
            multiline
            onChangeText={(value) => { setNote(value); clearError('note'); }}
            placeholder="Anything worth remembering about this investment"
            placeholderTextColor={theme.mutedText}
            style={[styles.multiline, inputStyle(Boolean(errors.note))]}
            value={note}
          />
        </FormField>
      </ScrollView>

      <View style={[styles.saveBar, { backgroundColor: theme.appBackground, borderTopColor: theme.hairline, paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
        <Pressable
          accessibilityLabel={isEditing ? 'Save investment changes' : 'Create investment'}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          disabled={saving}
          onPress={() => void save()}
          style={[styles.save, { backgroundColor: saving ? theme.disabledSurface : theme.primaryAction }]}>
          {saving ? <ActivityIndicator color={theme.disabledText} /> : <Text style={[styles.saveText, { color: theme.onPrimaryAction }]}>{isEditing ? 'Save Changes' : 'Create Investment'}</Text>}
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}

type Theme = ReturnType<typeof useAppTheme>;
function FormField({ children, error, label, theme }: { children: React.ReactNode; error?: string; label: string; theme: Theme }) {
  return (
    <View style={styles.field}>
      <Overline color={theme.mutedText}>{label}</Overline>
      {children}
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm },
  headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 },
  headerTitle: { ...typography.sectionTitle, flex: 1, textAlign: 'center' },
  content: { gap: spacing.lg, padding: spacing.md, paddingBottom: spacing.xl },
  field: { gap: spacing.sm },
  input: { ...typography.body, borderRadius: borderRadii.md, borderWidth: borderWidths.thin, minHeight: 56, paddingHorizontal: spacing.md },
  moneyInput: { fontFamily: fonts.mono.medium },
  multiline: { minHeight: 96, paddingTop: spacing.md, textAlignVertical: 'top' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  gridCell: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    borderWidth: borderWidths.thin,
    flexBasis: '47%',
    flexGrow: 1,
    justifyContent: 'center',
    minHeight: 56,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  gridText: { ...typography.caption, fontFamily: fonts.sans.bold, fontWeight: '700', textAlign: 'center' },
  segment: { flexDirection: 'row', gap: spacing.sm },
  segmentCell: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    borderWidth: borderWidths.thin,
    flex: 1,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.sm,
  },
  segmentText: { ...typography.caption, fontFamily: fonts.sans.bold, fontWeight: '700' },
  error: { ...typography.caption },
  help: { ...typography.caption },
  saveBar: { borderTopWidth: StyleSheet.hairlineWidth, paddingHorizontal: spacing.md, paddingTop: spacing.md },
  save: { alignItems: 'center', borderRadius: borderRadii.full, justifyContent: 'center', minHeight: 56, paddingHorizontal: spacing.lg },
  saveText: { ...typography.body, fontFamily: fonts.sans.bold, fontWeight: '700' },
});
