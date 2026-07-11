import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { router, usePathname, type Href } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type TabItem = {
  label: string;
  href?: Href;
  pathname: string;
  icon: SymbolViewProps['name'];
};

const tabs: TabItem[] = [
  {
    label: 'Home',
    pathname: '/',
    icon: { ios: 'house.fill', android: 'home', web: 'home' },
  },
  {
    label: 'Transactions',
    href: '/transactions',
    pathname: '/transactions',
    icon: { ios: 'list.bullet.rectangle.portrait.fill', android: 'receipt_long', web: 'receipt_long' },
  },
  {
    label: 'Accounts',
    href: '/accounts',
    pathname: '/accounts',
    icon: { ios: 'creditcard.fill', android: 'account_balance_wallet', web: 'account_balance_wallet' },
  },
  {
    label: 'Budgets',
    href: '/budgets',
    pathname: '/budgets',
    icon: { ios: 'chart.bar.fill', android: 'monitoring', web: 'monitoring' },
  },
];

export function PrimaryTabBar({ onHomePress }: { onHomePress: () => void }) {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          height: 72 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      <TabButton item={tabs[0]} onPress={onHomePress} selected={pathname === tabs[0].pathname} />
      <TabButton item={tabs[1]} selected={pathname === tabs[1].pathname} />
      <Pressable
        accessibilityHint="Opens the Add Transaction modal"
        accessibilityLabel="Add transaction"
        accessibilityRole="button"
        onPress={() => router.push('/add-transaction')}
        style={styles.addButton}>
        <View style={[styles.addCircle, { backgroundColor: theme.primaryAction }]}>
          <SymbolView
            name={{ ios: 'plus', android: 'add', web: 'add' }}
            size={28}
            tintColor={theme.onPrimaryAction}
          />
        </View>
        <Text style={[styles.addLabel, { color: theme.primaryText }]}>Add</Text>
      </Pressable>
      <TabButton item={tabs[2]} selected={pathname === tabs[2].pathname} />
      <TabButton item={tabs[3]} selected={pathname === tabs[3].pathname} />
    </View>
  );
}

function TabButton({
  item,
  onPress,
  selected,
}: {
  item: TabItem;
  onPress?: () => void;
  selected: boolean;
}) {
  const theme = useAppTheme();
  const tintColor = selected
    ? theme.selectedNavigationForeground
    : theme.navigationInactive;

  return (
    <Pressable
      accessibilityLabel={item.label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => {
        if (onPress) {
          onPress();
        } else if (item.href) {
          router.navigate(item.href);
        }
      }}
      style={styles.tabButton}>
      <View
        style={[
          styles.tabPill,
          selected && { backgroundColor: theme.selectedNavigationBackground },
        ]}>
        <SymbolView name={item.icon} size={22} tintColor={tintColor} />
        <Text numberOfLines={1} style={[styles.tabLabel, { color: tintColor }]}>
          {item.label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    paddingHorizontal: spacing.xs,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    height: 64,
    justifyContent: 'center',
    minWidth: 48,
  },
  tabPill: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    gap: 2,
    justifyContent: 'center',
    minHeight: 52,
    paddingHorizontal: spacing.xs,
    width: '100%',
  },
  tabLabel: {
    ...typography.label,
    fontSize: 10,
  },
  addButton: {
    alignItems: 'center',
    flex: 1,
    height: 78,
    justifyContent: 'flex-start',
    minWidth: 56,
    transform: [{ translateY: -14 }],
  },
  addCircle: {
    alignItems: 'center',
    borderRadius: 30,
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  addLabel: {
    ...typography.label,
    marginTop: 2,
  },
});
