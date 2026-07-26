import { Pressable, StyleSheet, useColorScheme, View } from 'react-native';

import { Overline } from '@/components/overline';
import { borderRadii, budgetColorKeys, budgetSwatches, spacing, type BudgetColorKey } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

type BudgetColorPickerProps = {
  value: BudgetColorKey;
  onChange: (color: BudgetColorKey) => void;
};

const SWATCH_LABELS: Record<BudgetColorKey, string> = {
  blue: 'Blue',
  teal: 'Teal',
  green: 'Green',
  amber: 'Amber',
  coral: 'Coral',
  pink: 'Pink',
  purple: 'Purple',
  indigo: 'Indigo',
};

export function BudgetColorPicker({ value, onChange }: BudgetColorPickerProps) {
  const theme = useAppTheme();
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';

  return (
    <View style={styles.field}>
      <Overline color={theme.mutedText}>Budget color</Overline>
      <View accessibilityRole="radiogroup" style={styles.swatches}>
        {budgetColorKeys.map((key) => {
          const selected = key === value;
          const color = budgetSwatches[key][scheme];
          return (
            <Pressable
              accessibilityLabel={SWATCH_LABELS[key]}
              accessibilityRole="radio"
              accessibilityState={{ selected }}
              hitSlop={6}
              key={key}
              onPress={() => onChange(key)}
              style={[
                styles.swatch,
                { borderColor: selected ? theme.primaryText : 'transparent' },
              ]}>
              <View style={[styles.fill, { backgroundColor: color }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const SWATCH_SIZE = 40;

const styles = StyleSheet.create({
  field: { gap: spacing.sm },
  swatches: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm + spacing.xs },
  swatch: {
    alignItems: 'center',
    borderRadius: borderRadii.full,
    borderWidth: 2,
    height: SWATCH_SIZE,
    justifyContent: 'center',
    padding: 3,
    width: SWATCH_SIZE,
  },
  fill: {
    borderRadius: borderRadii.full,
    flex: 1,
    width: '100%',
  },
});
