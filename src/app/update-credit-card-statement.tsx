import { useLocalSearchParams } from 'expo-router';

import { UpdateStatementScreen } from '@/features/credit-cards/components/update-statement-screen';

export default function UpdateCreditCardStatementRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <UpdateStatementScreen accountId={id} />;
}
