import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type SectionHeaderProps = {
  title: string;
  action?: ReactNode;
};

export function SectionHeader({ title, action }: SectionHeaderProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.row}>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>
        {title}
      </Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.sectionTitle,
    flexShrink: 1,
  },
});
