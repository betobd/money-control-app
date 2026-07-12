import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { useAppTheme } from '@/hooks/use-app-theme';

type TransferAccountFieldsProps = {
  source: string;
  destination: string;
};

export function TransferAccountFields({ source, destination }: TransferAccountFieldsProps) {
  const theme = useAppTheme();

  return (
    <View style={styles.group}>
      <Text style={[styles.description, { color: theme.transfer }]}>Move money between two different accounts</Text>
      <FormFieldButton
        icon={{ ios: 'arrow.up.circle.fill', android: 'arrow_circle_up', web: 'arrow_circle_up' }}
        label="Source account"
        onPress={() => undefined}
        value={source}
      />
      <FormFieldButton
        icon={{ ios: 'arrow.down.circle.fill', android: 'arrow_circle_down', web: 'arrow_circle_down' }}
        label="Destination account"
        onPress={() => undefined}
        value={destination}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.md,
  },
  description: {
    ...typography.caption,
    fontWeight: '700',
  },
});
