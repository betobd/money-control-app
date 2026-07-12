import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { useAppTheme } from '@/hooks/use-app-theme';

type TransferAccountFieldsProps = {
  source: string;
  destination: string;
  sourceError?: string;
  destinationError?: string;
  helperText?: string;
  onSelectSource: () => void;
  onSelectDestination: () => void;
};

export function TransferAccountFields({
  source,
  destination,
  sourceError,
  destinationError,
  helperText,
  onSelectSource,
  onSelectDestination,
}: TransferAccountFieldsProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.description, { color: theme.transfer }]}>
        Move money between two different accounts
      </Text>
      <FormFieldButton
        error={sourceError}
        icon={{ ios: 'arrow.up.circle.fill', android: 'arrow_circle_up', web: 'arrow_circle_up' }}
        label="From account"
        onPress={onSelectSource}
        value={source}
      />
      <FormFieldButton
        error={destinationError}
        icon={{ ios: 'arrow.down.circle.fill', android: 'arrow_circle_down', web: 'arrow_circle_down' }}
        label="To account"
        onPress={onSelectDestination}
        value={destination}
      />
      {helperText ? <Text style={[styles.helper, { color: theme.secondaryText }]}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  description: { ...typography.caption, fontWeight: '700' },
  helper: { ...typography.caption },
});
