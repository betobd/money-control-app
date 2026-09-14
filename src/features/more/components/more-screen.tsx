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
import { languageNativeNames } from '@/i18n/languages';
import type { Messages } from '@/i18n/messages';
import { useLanguage, useMessages } from '@/i18n/use-messages';

type MenuKey = Exclude<keyof Messages['more']['items'], 'language'>;

type MenuItem = {
  key: MenuKey | 'language';
  icon: SymbolViewProps['name'];
  href: Href;
};

// Text is looked up at render: this table is module scope, so it holds only keys.
const menuItems: MenuItem[] = [
  { key: 'security', icon: { ios: 'lock.shield.fill', android: 'shield_lock', web: 'lock' }, href: '/security' as Href },
  { key: 'notifications', icon: { ios: 'bell.badge.fill', android: 'notifications', web: 'notifications' }, href: '/notifications-settings' as Href },
  { key: 'backup', icon: { ios: 'externaldrive.fill', android: 'backup', web: 'backup' }, href: '/backup' as Href },
  { key: 'dataExport', icon: { ios: 'tablecells.fill', android: 'csv', web: 'table_view' }, href: '/data-export' as Href },
  { key: 'investments', icon: { ios: 'chart.line.uptrend.xyaxis', android: 'trending_up', web: 'trending_up' }, href: '/investments' as Href },
  { key: 'reports', icon: { ios: 'chart.xyaxis.line', android: 'query_stats', web: 'query_stats' }, href: '/reports' as Href },
  { key: 'currency', icon: { ios: 'coloncurrencysign.circle.fill', android: 'currency_exchange', web: 'currency_exchange' }, href: '/currency-rates' as Href },
  { key: 'language', icon: { ios: 'globe', android: 'language', web: 'language' }, href: '/language' as Href },
  { key: 'categories', icon: { ios: 'square.grid.2x2.fill', android: 'category', web: 'category' }, href: '/categories' as Href },
  { key: 'recurring', icon: { ios: 'repeat', android: 'repeat', web: 'repeat' }, href: '/recurring' as Href },
];

export function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useAppTheme();
  const t = useMessages();
  const language = useLanguage();
  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="close" leadingAccessibilityLabel={t.more.closeLabel} title={t.more.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Card padding={0}>
          {menuItems.map((item, index) => {
            const text = t.more.items[item.key];
            const description = item.key === 'language' ? languageNativeNames[language] : t.more.items[item.key].description;
            return (
            <Fragment key={item.key}>
              {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.hairline }]} /> : null}
              <PressableScale
                accessibilityLabel={text.accessibilityLabel}
                accessibilityHint={text.accessibilityHint}
                accessibilityRole="button"
                onPress={() => router.push(item.href)}
                style={styles.row}>
                <IconChip background={theme.tintPrimary} color={theme.primaryAction} icon={item.icon} iconSize={22} size={44} />
                <View style={styles.text}>
                  <Text style={[styles.label, { color: theme.primaryText }]}>{text.label}</Text>
                  <Text style={[styles.description, { color: theme.secondaryText }]}>{description}</Text>
                </View>
                <SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={22} tintColor={theme.mutedText} />
              </PressableScale>
            </Fragment>
            );
          })}
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
