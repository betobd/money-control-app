import { SymbolView } from 'expo-symbols';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export default function AddTransactionModal() {
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.screen,
        {
          backgroundColor: theme.background,
          paddingBottom: insets.bottom + spacing.lg,
          paddingTop: insets.top + spacing.md,
        },
      ]}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Close Add Transaction"
          accessibilityRole="button"
          hitSlop={8}
          onPress={() => router.back()}
          style={styles.closeButton}>
          <SymbolView
            name={{ ios: 'xmark', android: 'close', web: 'close' }}
            size={24}
            tintColor={theme.text}
          />
        </Pressable>
        <Text accessibilityRole="header" style={[styles.title, { color: theme.text }]}>
          Add Transaction
        </Text>
        <View style={styles.headerSpacer} />
      </View>
      <View style={[styles.placeholder, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <Text style={[styles.placeholderText, { color: theme.textMuted }]}>Transaction entry coming soon</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
  },
  closeButton: {
    alignItems: 'center',
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  title: {
    ...typography.title,
    flex: 1,
    fontSize: 26,
    lineHeight: 34,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 48,
  },
  placeholder: {
    alignItems: 'center',
    borderRadius: borderRadii.lg,
    borderWidth: 1,
    justifyContent: 'center',
    marginTop: spacing.xl,
    minHeight: 180,
    padding: spacing.lg,
  },
  placeholderText: {
    ...typography.body,
    textAlign: 'center',
  },
});
