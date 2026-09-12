import { Button } from '@/components/button';
import { FixedFooter } from '@/components/fixed-footer';
import { getTypeTone } from '@/features/add-transaction/components/transaction-type-selector';
import type { TransactionFormType } from '@/features/add-transaction/transaction-form.types';
import { useAppTheme } from '@/hooks/use-app-theme';

type FixedSaveBarProps = {
  bottomInset: number;
  onPress: () => void;
  type: TransactionFormType;
  disabled?: boolean;
  saving?: boolean;
};

export function FixedSaveBar({ bottomInset, onPress, type, disabled = false, saving = false }: FixedSaveBarProps) {
  const theme = useAppTheme();
  const inactive = disabled || saving;
  // The save action carries the transaction type's colour (income/expense/
  // transfer), so it overrides the primary variant's fill while it is actionable.
  const tone = getTypeTone(type, theme);
  const typeLabel = type[0].toUpperCase() + type.slice(1);

  return (
    <FixedFooter bottomInset={bottomInset}>
      <Button
        accessibilityLabel={`Save ${typeLabel}`}
        busy={saving}
        disabled={disabled}
        fullWidth
        icon={{ ios: 'checkmark', android: 'check', web: 'check' }}
        label={saving ? 'Saving…' : `Save ${typeLabel}`}
        onPress={onPress}
        size="lg"
        style={inactive ? undefined : { backgroundColor: tone }}
        variant="primary"
      />
    </FixedFooter>
  );
}

