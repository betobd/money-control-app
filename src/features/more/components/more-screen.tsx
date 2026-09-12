import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useRouter, type Href } from 'expo-router';
import { Fragment } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Card } from '@/components/card';
import { IconChip } from '@/components/icon-chip';
import { PressableScale } from '@/components/pressable-scale';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { ScreenHeader } from '@/components/screen-header';

type MenuItem = {
  accessibilityLabel: string;
  accessibilityHint: string;
  icon: SymbolViewProps['name'];
  label: string;
  description: string;
  href: Href;
};

const menuItems: MenuItem[] = [
  {
    accessibilityLabel: 'Open security settings',
    accessibilityHint: 'Configure PIN, device biometrics, and automatic App Lock',
    icon: { ios: 'lock.shield.fill', android: 'shield_lock', web: 'lock' },
    label: 'Security',
    description: 'PIN, biometrics, and automatic locking',
    href: '/security' as Href,
  },
  {
    accessibilityLabel: 'Open notification settings',
    accessibilityHint: 'Configure local recurring, budget, and daily reminders',
    icon: { ios: 'bell.badge.fill', android: 'notifications', web: 'notifications' },
    label: 'Notifications',
    description: 'Local reminders and notification privacy',
    href: '/notifications-settings' as Href,
  },
  {
    accessibilityLabel: 'Open backup and restore',
    accessibilityHint: 'Create a local backup or replace local data from a backup file',
    icon: { ios: 'externaldrive.fill', android: 'backup', web: 'backup' },
    label: 'Backup & Restore',
    description: 'Back up or restore a complete local copy',
    href: '/backup' as Href,
  },
  {
    accessibilityLabel: 'Open data export',
    accessibilityHint: 'Create readable CSV files for spreadsheets, analysis, and sharing',
    icon: { ios: 'tablecells.fill', android: 'csv', web: 'table_view' },
    label: 'Data Export',
    description: 'Readable CSV files for analysis and sharing',
    href: '/data-export' as Href,
  },
  {
    accessibilityLabel: 'Open investments',
    accessibilityHint: 'Review investment accounts, valuations, and estimated gain or loss',
    icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' },
    label: 'Investments',
    description: 'Track balances, valuations, and estimated returns',
    href: '/investments' as Href,
  },
  {
    accessibilityLabel: 'Open reports',
    accessibilityHint: 'Review income, expenses, categories, net worth, and period comparisons',
    icon: { ios: 'chart.xyaxis.line', android: 'query_stats', web: 'query_stats' },
    label: 'Reports',
    description: 'Explore cash flow, categories, and net worth',
    href: '/reports' as Href,
  },
  {
    accessibilityLabel: 'Open currency and rates',
    accessibilityHint: 'Review the base currency and the USD/COP reference rate',
    icon: { ios: 'coloncurrencysign.circle.fill', android: 'currency_exchange', web: 'currency_exchange' },
    label: 'Currency & Rates',
    description: 'Base currency and USD/COP reference rate',
    href: '/currency-rates' as Href,
  },
  {
    accessibilityLabel: 'Manage categories',
    accessibilityHint: 'Create, edit, archive, and restore categories',
    icon: { ios: 'square.grid.2x2.fill', android: 'category', web: 'category' },
    label: 'Categories',
    description: 'Manage expense and income categories',
    href: '/categories' as Href,
  },
  {
    accessibilityLabel: 'Manage recurring transactions',
    accessibilityHint: 'Review due occurrences and manage recurring rules',
    icon: { ios: 'repeat', android: 'repeat', web: 'repeat' },
    label: 'Recurring Transactions',
    description: 'Review, confirm, pause, and schedule recurring items',
    href: '/recurring' as Href,
  },
];

export function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel="Close More" title="More" />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Card padding={0}>
          {menuItems.map((item, index) => (
            <Fragment key={item.label}>
              {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.hairline }]} /> : null}
              <PressableScale
                accessibilityLabel={item.accessibilityLabel}
                accessibilityHint={item.accessibilityHint}
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                style={styles.row}>
                <IconChip background={theme.tintPrimary} color={theme.primaryAction} icon={item.icon} iconSize={22} size={44} />
                <View style={styles.text}>
                  <Text style={[styles.label, { color: theme.primaryText }]}>{item.label}</Text>
                  <Text style={[styles.description, { color: theme.secondaryText }]}>{item.description}</Text>
                </View>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={22} tintColor={theme.mutedText} />
              </PressableScale>
            </Fragment>
          ))}
        </Card>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: spacing.md },
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 76, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md + 44 + spacing.md },
  text: { flex: 1 },
  label: { ...typography.body },
  description: { ...typography.caption },
});
