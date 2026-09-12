import type { SymbolViewProps } from 'expo-symbols';
import { SymbolView } from 'expo-symbols';
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/button';
import { borderRadii, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type EmptyStateProps = {
  icon: SymbolViewProps['name'];
  title: string;
  body: string;
  /**
   * The "create your first" call to action. This is the one place a labeled
   * create button belongs: once the list has items, creating another is the
   * header `+` (see docs/design-system.md).
   */
  action?: { label: string; onPress: () => void; accessibilityLabel?: string };
};

/** A list with nothing in it yet: icon, one-line title, one sentence, optional CTA. */
export function EmptyState({ icon, title, body, action }: EmptyStateProps) {
  const theme = useAppTheme();
  return (
    <View style={[styles.container, { backgroundColor: theme.surface }]}>
      <View style={[styles.icon, { backgroundColor: theme.tintPrimary }]}>
        <SymbolView name={icon} size={28} tintColor={theme.primaryAction} />
      </View>
      <Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>{title}</Text>
      <Text style={[styles.body, { color: theme.secondaryText }]}>{body}</Text>
      {action ? (
        <Button
          accessibilityLabel={action.accessibilityLabel}
          icon={{ ios: 'plus', android: 'add', web: 'add' }}
          label={action.label}
          onPress={action.onPress}
          style={styles.action}
          variant="primary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', borderRadius: borderRadii.card, gap: spacing.sm, padding: spacing.xl },
  icon: { alignItems: 'center', borderRadius: borderRadii.card, height: 56, justifyContent: 'center', width: 56 },
  title: { ...typography.sectionTitle, textAlign: 'center' },
  body: { ...typography.body, textAlign: 'center' },
  action: { marginTop: spacing.sm },
});
