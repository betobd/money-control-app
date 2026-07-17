import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import type { BackupSummary } from '../backup.types';
import { useBackup } from '../use-backup';

const countLabels: { key: keyof BackupSummary; label: string }[] = [
  { key: 'accounts', label: 'Accounts' },
  { key: 'categories', label: 'Categories' },
  { key: 'transactions', label: 'Transactions' },
  { key: 'budgets', label: 'Budgets' },
  { key: 'recurringRules', label: 'Recurring rules' },
  { key: 'recurringOccurrences', label: 'Recurring occurrences' },
  { key: 'transactionSplits', label: 'Ledger splits' },
];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

export function BackupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const {
    candidate,
    createBackup,
    error,
    loadingOverview,
    notice,
    operation,
    overview,
    restore,
    selectBackup,
  } = useBackup();
  const busy = operation !== null;

  useEffect(() => {
    if (notice) AccessibilityInfo.announceForAccessibility(notice);
  }, [notice]);

  function confirmExport(): void {
    Alert.alert(
      'Create readable backup?',
      'The JSON file will contain account names, amounts, dates, notes, budgets, and recurring records. It is not encrypted. Anyone with the file can read this financial information.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Create backup', onPress: () => void createBackup() },
      ],
    );
  }

  function confirmRestore(): void {
    if (!candidate) return;
    Alert.alert(
      'Replace all local financial data?',
      'Existing accounts, categories, transactions, budgets, and recurring records will be deleted and replaced by this backup. The operation may take a moment and cannot be undone unless you create a current backup first.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace local data', style: 'destructive', onPress: () => void restore() },
      ],
    );
  }

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
        <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>Backup & Restore</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.feedback, { backgroundColor: theme.surface, color: theme.destructive, borderColor: theme.destructive }]}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[styles.feedback, { backgroundColor: theme.surface, color: theme.income, borderColor: theme.income }]}>
            {notice}
          </Text>
        ) : null}

        <View style={[styles.warningCard, { backgroundColor: theme.elevatedSurface, borderColor: theme.warning }]}>
          <SymbolView name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }} size={24} tintColor={theme.warning} />
          <View style={styles.flex}>
            <Text style={[styles.warningTitle, { color: theme.primaryText }]}>Plaintext financial data</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>Backups are readable JSON files, not encrypted files. Store them somewhere private and share them only with people you trust.</Text>
          </View>
        </View>

        <Section title="Create backup" description="Includes every persisted financial record needed to reconstruct this app, including archived history and recurring links." theme={theme}>
          <Text style={[styles.subheading, { color: theme.primaryText }]}>Current record counts</Text>
          {loadingOverview ? <ActivityIndicator color={theme.primaryAction} /> : overview ? (
            <CountList summary={overview.summary} theme={theme} />
          ) : <Text style={[styles.body, { color: theme.secondaryText }]}>Counts unavailable.</Text>}
          <PrimaryButton
            busy={operation === 'exporting'}
            disabled={busy || loadingOverview}
            label="Create backup"
            onPress={confirmExport}
            theme={theme}
          />
          <Text style={[styles.caption, { color: theme.mutedText }]}>After generation, Android opens its native save/share interface. Money Control cannot verify whether a destination file was saved.</Text>
        </Section>

        <Section title="Restore backup" description="Select a Money Control JSON backup. It will be read and validated before any local data changes." theme={theme}>
          <View style={[styles.destructiveNotice, { borderColor: theme.destructive }]}>
            <Text style={[styles.warningTitle, { color: theme.destructive }]}>Replace mode only</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>Restoring deletes and replaces all existing local financial data. Merge is not supported.</Text>
          </View>
          <SecondaryButton
            busy={operation === 'selecting'}
            disabled={busy}
            label="Select backup file"
            onPress={() => void selectBackup()}
            theme={theme}
          />
          <Pressable
            accessibilityHint="Opens the same readable backup export confirmation"
            accessibilityLabel="Create a current safety backup first"
            accessibilityRole="button"
            disabled={busy}
            onPress={confirmExport}
            style={styles.linkButton}>
            <Text style={[styles.linkLabel, { color: busy ? theme.disabledText : theme.primaryAction }]}>Create current backup first</Text>
          </Pressable>
        </Section>

        {candidate ? (
          <Section title="Restore preview" description="The selected file passed structural, relationship, safety, and checksum validation." theme={theme}>
            <PreviewRow label="File" value={`${candidate.preview.fileName} (${formatFileSize(candidate.preview.fileSize)})`} theme={theme} />
            <PreviewRow label="Created" value={formatCreatedAt(candidate.preview.createdAt)} theme={theme} />
            <PreviewRow label="Format" value={`Version ${candidate.preview.formatVersion}`} theme={theme} />
            <PreviewRow label="Created by app" value={candidate.preview.appVersion} theme={theme} />
            <PreviewRow label="Currency" value={candidate.preview.currency} theme={theme} />
            <PreviewRow label="Compatibility" value="Compatible" theme={theme} />
            <CountList summary={candidate.preview.summary} theme={theme} />
            <PreviewRow
              label="Transaction dates"
              value={candidate.preview.transactionDateRange.oldest
                ? `${candidate.preview.transactionDateRange.oldest} to ${candidate.preview.transactionDateRange.newest}`
                : 'No transactions'}
              theme={theme}
            />
            {candidate.preview.warnings.map((warning) => (
              <Text key={warning} style={[styles.caption, { color: theme.warning }]}>{warning}</Text>
            ))}
            <PrimaryButton
              busy={operation === 'restoring'}
              destructive
              disabled={busy}
              label="Restore and replace local data"
              onPress={confirmRestore}
              theme={theme}
            />
          </Section>
        ) : null}

        <Text style={[styles.caption, { color: theme.mutedText }]}>Password-protected encrypted backups are a future enhancement. This feature never uploads backup data and does not request broad storage permission.</Text>
      </ScrollView>
    </View>
  );
}

type Theme = ReturnType<typeof useAppTheme>;

function Section({
  children,
  description,
  theme,
  title,
}: {
  children: React.ReactNode;
  description: string;
  theme: Theme;
  title: string;
}) {
  return (
    <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{description}</Text>
      {children}
    </View>
  );
}

function CountList({ summary, theme }: { summary: BackupSummary; theme: Theme }) {
  return (
    <View style={[styles.countList, { borderColor: theme.border }]}>
      {countLabels.map(({ key, label }) => (
        <View key={key} style={styles.countRow}>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{label}</Text>
          <Text style={[styles.count, { color: theme.primaryText }]}>{summary[key].toLocaleString('en-US')}</Text>
        </View>
      ))}
    </View>
  );
}

function PreviewRow({ label, theme, value }: { label: string; theme: Theme; value: string }) {
  return (
    <View style={styles.previewRow}>
      <Text style={[styles.caption, { color: theme.mutedText }]}>{label}</Text>
      <Text style={[styles.previewValue, { color: theme.primaryText }]}>{value}</Text>
    </View>
  );
}

function PrimaryButton({
  busy,
  destructive = false,
  disabled,
  label,
  onPress,
  theme,
}: {
  busy: boolean;
  destructive?: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  const backgroundColor = disabled
    ? theme.disabledSurface
    : destructive ? theme.destructive : theme.primaryAction;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.primaryButton, { backgroundColor }]}>
      {busy ? <ActivityIndicator color={disabled ? theme.disabledText : theme.onPrimaryAction} /> : (
        <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.onPrimaryAction }]}>{label}</Text>
      )}
    </Pressable>
  );
}

function SecondaryButton({ busy, disabled, label, onPress, theme }: {
  busy: boolean;
  disabled: boolean;
  label: string;
  onPress: () => void;
  theme: Theme;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ busy, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.secondaryButton, { borderColor: disabled ? theme.disabledText : theme.primaryAction }]}>
      {busy ? <ActivityIndicator color={theme.primaryAction} /> : (
        <Text style={[styles.buttonLabel, { color: disabled ? theme.disabledText : theme.primaryAction }]}>{label}</Text>
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
  warningCard: { borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  warningTitle: { ...typography.body, fontWeight: '700' },
  flex: { flex: 1, gap: spacing.xs },
  body: { ...typography.body },
  caption: { ...typography.caption },
  card: { borderRadius: borderRadii.lg, borderWidth: borderWidths.thin, gap: spacing.md, padding: spacing.md },
  sectionTitle: { ...typography.sectionTitle },
  subheading: { ...typography.caption, fontWeight: '700' },
  countList: { borderTopWidth: borderWidths.thin, paddingTop: spacing.sm },
  countRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  count: { ...typography.body, fontWeight: '700' },
  destructiveNotice: { borderLeftWidth: 3, gap: spacing.xs, paddingLeft: spacing.md },
  primaryButton: { alignItems: 'center', borderRadius: borderRadii.md, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  secondaryButton: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, justifyContent: 'center', minHeight: 52, paddingHorizontal: spacing.md },
  buttonLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  linkButton: { alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  linkLabel: { ...typography.body, fontWeight: '700', textAlign: 'center' },
  previewRow: { gap: spacing.xs },
  previewValue: { ...typography.body, fontWeight: '600' },
});
