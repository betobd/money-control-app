import { Button } from '@/components/button';

export function AddAccountButton({ onPress }: { onPress: () => void }) {
  return (
    <Button
      accessibilityHint="Opens the account form"
      fullWidth
      icon={{ ios: 'plus', android: 'add', web: 'add' }}
      label="Add account"
      onPress={onPress}
      size="lg"
      variant="tonal"
    />
  );
}
