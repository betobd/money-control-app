import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, fonts, spacing, typography } from '@/constants/theme';
import { accountTypeLabels } from '@/features/accounts/account-format';
import { formatMoneyWithSymbol } from '@/features/currency/currency';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

type AccountPickerProps = {
  visible: boolean;
  title?: string;
  accounts: AccountWithBalance[];
  selectedId?: string;
  onSelect: (id: string) => void;
  onClose: () => void;
};

export function AccountPicker({
  visible,
  title,
  accounts,
  selectedId,
  onSelect,
  onClose,
}: AccountPickerProps) {
  const theme = useAppTheme();
  const t = useMessages();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel={t.addTransaction.accountPicker.close} onPress={onClose} style={[styles.backdrop, { backgroundColor: theme.overlay }]} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
            {title ?? t.addTransaction.selectAccount}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={{ color: theme.primaryAction }}>{t.common.close}</Text>
          </Pressable>
        </View>
        <ScrollView accessibilityRole="radiogroup" keyboardShouldPersistTaps="handled">
          {accounts.length === 0 ? (
            <Text style={[styles.empty, { color: theme.secondaryText }]}>
              {t.addTransaction.accountPicker.empty}
            </Text>
          ) : null}
          {accounts.map((account) => {
            const selected = account.id === selectedId;
            return (
              <Pressable
                accessibilityLabel={t.addTransaction.accountPicker.accountA11y(account.name, accountTypeLabels[account.type], `${formatMoneyWithSymbol(account.balance, account.currency)} ${account.currency}`)}
                accessibilityRole="radio"
                accessibilityState={{ checked: selected }}
                key={account.id}
                onPress={() => {
                  onSelect(account.id);
                  onClose();
                }}
                style={[
                  styles.row,
                  { backgroundColor: selected ? theme.tintPrimary : theme.elevatedSurface },
                ]}>
                <AccountTypeIcon kind={account.type} size={36} />
                <View style={styles.accountCopy}>
                  <Text numberOfLines={1} style={[styles.name, { color: theme.primaryText }]}>{account.name}</Text>
                  <Text numberOfLines={1} style={[styles.type, { color: theme.mutedText }]}>
                    {accountTypeLabels[account.type]}
                  </Text>
                </View>
                <Text style={[styles.balance, { color: theme.secondaryText }]}>{formatMoneyWithSymbol(account.balance, account.currency)} {account.currency}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1 },
  sheet: {
    borderTopLeftRadius: borderRadii.lg,
    borderTopRightRadius: borderRadii.lg,
    gap: spacing.md,
    maxHeight: '70%',
    padding: spacing.md,
  },
  grabber: { alignSelf: 'center', borderRadius: 2, height: 4, marginBottom: spacing.xs, width: 36 },
  heading: { alignItems: 'center', flexDirection: 'row' },
  title: { ...typography.sectionTitle, flex: 1 },
  close: {
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  row: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    flexDirection: 'row',
    gap: spacing.sm + 2,
    marginBottom: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.sm,
  },
  accountCopy: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontFamily: typography.sectionTitle.fontFamily, fontSize: 14, fontWeight: '700', lineHeight: 19 },
  type: { ...typography.caption, fontSize: 12, lineHeight: 16 },
  balance: { ...typography.moneyRow, fontFamily: fonts.mono.medium, fontWeight: '500', textAlign: 'right' },
  empty: { ...typography.body, padding: spacing.lg, textAlign: 'center' },
});
