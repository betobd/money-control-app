import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button } from '@/components/button';
import { Card } from '@/components/card';
import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { getIntlLocale } from '@/i18n/messages';
import { useMessages } from '@/i18n/use-messages';
import type { BackupSummary } from '../backup.types';
import { useBackup } from '../use-backup';
import { DialogHost, useDialog } from '@/components/dialog';
import { ScreenHeader } from '@/components/screen-header';

const countKeys = [
  'accounts',
  'categories',
  'transactions',
  'budgets',
  'recurringRules',
  'recurringOccurrences',
  'creditCardStatements',
  'transactionSplits',
] as const satisfies readonly (keyof BackupSummary)[];

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatCreatedAt(value: string): string {
  return new Intl.DateTimeFormat(getIntlLocale(), {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(new Date(value));
}

export function BackupScreen() {
  const dialog = useDialog();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
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
    dialog.confirm({
      title: t.backup.exportConfirmTitle,
      message: t.backup.exportConfirmMessage,
      confirmLabel: t.backup.createButton,
      onConfirm: () => void createBackup(),
    });
  }

  function confirmRestore(): void {
    if (!candidate) return;
    dialog.confirm({
      title: t.backup.restoreConfirmTitle,
      message: t.backup.restoreConfirmMessage,
      confirmLabel: t.backup.restoreConfirmLabel,
      tone: 'destructive',
      onConfirm: () => void restore(),
    });
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" leadingDisabled={busy} title={t.backup.title} />

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.xxl }]}
        showsVerticalScrollIndicator={false}>
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.feedback, { backgroundColor: theme.tintDestructive, color: theme.destructive }]}>
            {error}
          </Text>
        ) : null}
        {notice ? (
          <Text accessibilityLiveRegion="polite" style={[styles.feedback, { backgroundColor: theme.tintIncome, color: theme.income }]}>
            {notice}
          </Text>
        ) : null}

        <View style={[styles.warningCard, { backgroundColor: theme.tintWarning }]}>
          <SymbolView name={{ ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' }} size={24} tintColor={theme.warning} />
          <View style={styles.flex}>
            <Text style={[styles.warningTitle, { color: theme.primaryText }]}>{t.backup.warningTitle}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{t.backup.warningBody}</Text>
          </View>
        </View>

        <Section title={t.backup.createTitle} description={t.backup.createDescription} theme={theme}>
          <Text style={[styles.subheading, { color: theme.primaryText }]}>{t.backup.currentCounts}</Text>
          {loadingOverview ? <ActivityIndicator color={theme.primaryAction} /> : overview ? (
            <CountList summary={overview.summary} theme={theme} />
          ) : <Text style={[styles.body, { color: theme.secondaryText }]}>{t.backup.countsUnavailable}</Text>}
          <PrimaryButton
            busy={operation === 'exporting'}
            disabled={busy || loadingOverview}
            label={t.backup.createButton}
            onPress={confirmExport}
            theme={theme}
          />
          <Text style={[styles.caption, { color: theme.mutedText }]}>{t.backup.shareCaption}</Text>
        </Section>

        <Section title={t.backup.restoreTitle} description={t.backup.restoreDescription} theme={theme}>
          <View style={[styles.destructiveNotice, { backgroundColor: theme.tintDestructive }]}>
            <Text style={[styles.warningTitle, { color: theme.destructive }]}>{t.backup.replaceModeTitle}</Text>
            <Text style={[styles.body, { color: theme.secondaryText }]}>{t.backup.replaceModeBody}</Text>
          </View>
          <SecondaryButton
            busy={operation === 'selecting'}
            disabled={busy}
            label={t.backup.selectFile}
            onPress={() => void selectBackup()}
            theme={theme}
          />
          <Button
            accessibilityHint={t.backup.safetyBackupHint}
            accessibilityLabel={t.backup.safetyBackupLabel}
            disabled={busy}
            label={t.backup.safetyBackupButton}
            onPress={confirmExport}
            variant="ghost"
          />
        </Section>

        {candidate ? (
          <Section title={t.backup.previewTitle} description={t.backup.previewDescription} theme={theme}>
            <PreviewRow label={t.backup.previewFile} value={t.backup.fileValue(candidate.preview.fileName, formatFileSize(candidate.preview.fileSize))} theme={theme} />
            <PreviewRow label={t.backup.previewCreated} value={formatCreatedAt(candidate.preview.createdAt)} theme={theme} />
            <PreviewRow label={t.backup.previewFormat} value={t.backup.formatVersion(candidate.preview.formatVersion)} theme={theme} />
            <PreviewRow label={t.backup.previewCreatedBy} value={candidate.preview.appVersion} theme={theme} />
            <PreviewRow label={t.backup.previewCurrency} value={candidate.preview.currency} theme={theme} />
            <PreviewRow label={t.backup.previewCompatibility} value={t.backup.compatible} theme={theme} />
            <CountList summary={candidate.preview.summary} theme={theme} />
            <PreviewRow
              label={t.backup.previewDates}
              value={candidate.preview.transactionDateRange.oldest
                ? t.backup.dateRange(candidate.preview.transactionDateRange.oldest, `${candidate.preview.transactionDateRange.newest}`)
                : t.backup.noTransactions}
              theme={theme}
            />
            {candidate.preview.warnings.map((warning) => (
              <Text key={warning} style={[styles.caption, { color: theme.warning }]}>{warning}</Text>
            ))}
            <PrimaryButton
              busy={operation === 'restoring'}
              destructive
              disabled={busy}
              label={t.backup.restoreButton}
              onPress={confirmRestore}
              theme={theme}
            />
          </Section>
        ) : null}

        <Text style={[styles.caption, { color: theme.mutedText }]}>{t.backup.footer}</Text>
      </ScrollView>
      <DialogHost dialog={dialog} />
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
    <Card style={styles.card}>
      <Text accessibilityRole="header" style={[styles.sectionTitle, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{description}</Text>
      {children}
    </Card>
  );
}

function CountList({ summary, theme }: { summary: BackupSummary; theme: Theme }) {
  const t = useMessages();
  return (
    <View style={[styles.countList, { borderTopColor: theme.hairline }]}>
      {countKeys.map((key) => (
        <View key={key} style={styles.countRow}>
          <Text style={[styles.body, { color: theme.secondaryText }]}>{t.backup.counts[key]}</Text>
          <Text style={[styles.count, { color: theme.primaryText }]}>{summary[key].toLocaleString(getIntlLocale())}</Text>
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
    <Button busy={busy} disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" style={{ backgroundColor }} variant="primary" />
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
    <Button busy={busy} disabled={disabled} fullWidth label={label} onPress={onPress} size="lg" variant="tonal" />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, paddingHorizontal: spacing.md },
  feedback: { ...typography.caption, borderRadius: borderRadii.md, padding: spacing.md },
  warningCard: { borderRadius: borderRadii.md, flexDirection: 'row', gap: spacing.md, padding: spacing.md },
  warningTitle: { ...typography.bodyStrong },
  flex: { flex: 1, gap: spacing.xs },
  body: { ...typography.body },
  caption: { ...typography.caption },
  card: { gap: spacing.md },
  sectionTitle: { ...typography.sectionTitle },
  subheading: { ...typography.captionStrong },
  countList: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: spacing.sm },
  countRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 32 },
  count: { ...typography.bodyStrong },
  destructiveNotice: { borderRadius: borderRadii.md, gap: spacing.xs, padding: spacing.md },
  buttonLabel: { ...typography.bodyStrong, textAlign: 'center' },
  linkLabel: { ...typography.bodyStrong, textAlign: 'center' },
  previewRow: { gap: spacing.xs },
  previewValue: { ...typography.body, fontFamily: fonts.sans.semibold, fontWeight: '600' },
});
