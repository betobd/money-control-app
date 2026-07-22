import { useLocalSearchParams } from 'expo-router';

import { PayCreditCardScreen } from '@/features/credit-cards/components/pay-credit-card-screen';

export default function PayCreditCardRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <PayCreditCardScreen accountId={id} />;
}
