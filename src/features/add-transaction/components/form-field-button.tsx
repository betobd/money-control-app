import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type FormFieldButtonProps = {
  icon: SymbolViewProps['name'];
  label: string;
  value: string;
  onPress: () => void;
  error?: string;
};

export function FormFieldButton({ icon, label, value, onPress, error }: FormFieldButtonProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.label, { color: theme.secondaryText }]}>{label}</Text>
      <Pressable
        accessibilityLabel={`${label}, ${value}`}
        accessibilityRole="button"
        onPress={onPress}
        style={[styles.field, { backgroundColor: theme.surface, borderColor: theme.border }]}> 
        <SymbolView name={icon} size={22} tintColor={theme.secondaryText} />
        <Text numberOfLines={1} style={[styles.value, { color: theme.primaryText }]}> 
          {value}
        </Text>
        <SymbolView
          name={{ ios: 'chevron.down', android: 'expand_more', web: 'expand_more' }}
          size={20}
          tintColor={theme.mutedText}
        />
      </Pressable>
      {error ? <Text accessibilityLiveRegion="polite" style={[styles.error, { color: theme.destructive }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.sm,
  },
  label: {
    ...typography.label,
    textTransform: 'uppercase',
  },
  field: {
    alignItems: 'center',
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    flexDirection: 'row',
    gap: spacing.sm,
    minHeight: 56,
    paddingHorizontal: spacing.md,
  },
  value: {
    ...typography.body,
    flex: 1,
    fontWeight: '600',
  },
  error: { ...typography.caption },
});
