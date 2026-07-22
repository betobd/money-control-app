import { useLocalSearchParams } from 'expo-router';

import { CreditCardDetailsScreen } from '@/features/credit-cards/components/credit-card-details-screen';

export default function CreditCardDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <CreditCardDetailsScreen accountId={id} />;
}
