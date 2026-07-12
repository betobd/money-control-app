import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { formatCop, accountTypeLabels } from '@/features/accounts/account-format';
import type { AccountWithBalance } from '@/features/accounts/account.types';
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
      <Pressable accessibilityLabel="Close account picker" onPress={onClose} style={styles.backdrop} />
      <View
        style={[
          styles.sheet,
          { backgroundColor: theme.appBackground, paddingBottom: insets.bottom + spacing.md },
        ]}>
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
                  {
                    backgroundColor: selected ? theme.selectedNavigationBackground : theme.surface,
                    borderColor: selected ? theme.primaryAction : theme.border,
                  },
                ]}>
                <View style={styles.accountCopy}>
                  <Text style={[styles.name, { color: theme.primaryText }]}>{account.name}</Text>
                  <Text style={[styles.type, { color: theme.secondaryText }]}>
                    {accountTypeLabels[account.type]}
                  </Text>
                </View>
                <Text style={[styles.balance, { color: theme.primaryText }]}>{formatCop(account.balance)}</Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { backgroundColor: 'rgba(0,0,0,0.45)', flex: 1 },
  sheet: {
    borderTopLeftRadius: borderRadii.lg,
    borderTopRightRadius: borderRadii.lg,
    gap: spacing.md,
    maxHeight: '70%',
    padding: spacing.md,
  },
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
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    minHeight: 72,
    padding: spacing.md,
  },
  accountCopy: { flex: 1, minWidth: 0 },
  name: { ...typography.body, fontWeight: '700' },
  type: { ...typography.caption },
  balance: { ...typography.caption, fontWeight: '700', textAlign: 'right' },
});
