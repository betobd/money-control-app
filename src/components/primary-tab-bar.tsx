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
          backgroundColor: theme.navigationSurface,
          borderTopColor: theme.hairline,
          height: 74 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}>
      <TabButton item={tabs[0]} onPress={onHomePress} selected={pathname === tabs[0].pathname} />
      <TabButton item={tabs[1]} selected={pathname === tabs[1].pathname} />
      <View style={styles.addCell}>
        <Pressable
          accessibilityHint="Opens the Add Transaction modal"
          accessibilityLabel="Add transaction"
          accessibilityRole="button"
          onPress={() => router.push('/add-transaction')}
          style={[styles.addButton, { backgroundColor: theme.primaryAction }]}>
          <SymbolView name={{ ios: 'plus', android: 'add', web: 'add' }} size={24} tintColor={theme.onPrimaryAction} />
          <Text style={[styles.addLabel, { color: theme.onPrimaryAction }]}>Add</Text>
        </Pressable>
      </View>
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
  const tintColor = selected ? theme.primaryAction : theme.navigationInactive;

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
      {selected ? <View style={[styles.indicator, { backgroundColor: theme.primaryAction }]} /> : null}
      <SymbolView name={item.icon} size={22} tintColor={tintColor} />
      <Text numberOfLines={1} style={[styles.tabLabel, { color: tintColor }]}>
        {item.label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignItems: 'stretch',
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 3,
    justifyContent: 'center',
    minWidth: 48,
    paddingTop: 6,
  },
  indicator: {
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2,
    height: 2,
    position: 'absolute',
    top: 0,
    width: 26,
  },
  tabLabel: {
    ...typography.label,
    fontFamily: typography.label.fontFamily,
    fontSize: 10,
    lineHeight: 13,
  },
  addCell: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
    minWidth: 56,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.sm,
  },
  addButton: {
    alignItems: 'center',
    borderRadius: borderRadii.card,
    flex: 1,
    gap: 1,
    justifyContent: 'center',
    width: '100%',
  },
  addLabel: {
    ...typography.label,
    fontSize: 10,
    lineHeight: 12,
  },
});
