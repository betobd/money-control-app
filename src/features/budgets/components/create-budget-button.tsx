import { Button } from '@/components/button';

export function CreateBudgetButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      accessibilityHint="Opens budget creation"
      fullWidth
      icon={{ ios: 'plus', android: 'add', web: 'add' }}
      label="Create budget"
      onPress={onPress}
      size="lg"
      variant="tonal"
    />
  );
}
