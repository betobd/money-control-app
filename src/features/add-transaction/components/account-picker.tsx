import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { formatCop, accountTypeLabels } from '@/features/accounts/account-format';
import type { AccountWithBalance } from '@/features/accounts/account.types';
import { AccountTypeIcon } from '@/features/accounts/components/account-type-icon';
import { useAppTheme } from '@/hooks/use-app-theme';

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
  title = 'Select account',
  accounts,
  selectedId,
  onSelect,
  onClose,
}: AccountPickerProps) {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <Pressable accessibilityLabel="Close account picker" onPress={onClose} style={[styles.backdrop, { backgroundColor: theme.overlay }]} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.surface, paddingBottom: insets.bottom + spacing.md },
        ]}>
        <View style={[styles.grabber, { backgroundColor: theme.border }]} />
        <View style={styles.heading}>
          <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
            {title}
          </Text>
          <Pressable accessibilityRole="button" onPress={onClose} style={styles.close}>
            <Text style={{ color: theme.primaryAction }}>Close</Text>
          </Pressable>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled">
          {accounts.map((account) => {
            const selected = account.id === selectedId;
            return (
              <Pressable
                accessibilityLabel={`${account.name}, ${accountTypeLabels[account.type]}, balance ${formatCop(account.balance)}`}
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
                <Text style={[styles.balance, { color: theme.secondaryText }]}>{formatCop(account.balance)}</Text>
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
  balance: { ...typography.moneyRow, fontWeight: '500', textAlign: 'right' },
});
