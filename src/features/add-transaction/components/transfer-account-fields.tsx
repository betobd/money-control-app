import { StyleSheet, Text, View } from 'react-native';

import { spacing, typography } from '@/constants/theme';
import { FormFieldButton } from '@/features/add-transaction/components/form-field-button';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';

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
  const t = useMessages();

  return (
    <View style={styles.group}>
      <Text style={[styles.description, { color: theme.transfer }]}>
        {t.addTransaction.transferDescription}
      </Text>
      <FormFieldButton
        error={sourceError}
        icon={{ ios: 'arrow.up.circle.fill', android: 'arrow_circle_up', web: 'arrow_circle_up' }}
        label={t.addTransaction.fromAccount}
        onPress={onSelectSource}
        value={source}
      />
      <FormFieldButton
        error={destinationError}
        icon={{ ios: 'arrow.down.circle.fill', android: 'arrow_circle_down', web: 'arrow_circle_down' }}
        label={t.addTransaction.toAccount}
        onPress={onSelectDestination}
        value={destination}
      />
      {helperText ? <Text style={[styles.helper, { color: theme.secondaryText }]}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: { gap: spacing.md },
  description: { ...typography.captionStrong },
  helper: { ...typography.caption },
});
