import type { ReactNode } from 'react';
import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type PrimaryScreenHeaderProps = {
  title?: string;
  /** Optional element rendered between the title and the More button (e.g. a month pill). */
  accessory?: ReactNode;
};

export function PrimaryScreenHeader({ title = 'Money Control', accessory }: PrimaryScreenHeaderProps) {
  const router = useRouter();
  const theme = useAppTheme();

  return (
    <View style={styles.header}>
      <Text accessibilityRole="header" numberOfLines={1} style={[styles.title, { color: theme.primaryText }]}>
        {title}
      </Text>
      {accessory}
      <Pressable
        accessibilityLabel="More"
        accessibilityHint="Open app management options"
        accessibilityRole="button"
        onPress={() => router.push('/more')}
        style={styles.action}>
        <SymbolView name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }} size={24} tintColor={theme.secondaryText} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 44,
  },
  title: {
    ...typography.heading,
    flex: 1,
  },
  action: {
    alignItems: 'center',
    height: 44,
    justifyContent: 'center',
    width: 32,
  },
});
