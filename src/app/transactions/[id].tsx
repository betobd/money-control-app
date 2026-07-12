import { useLocalSearchParams } from 'expo-router';

import { TransactionDetailsScreen } from '@/features/transactions/components/transaction-details-screen';

export default function TransactionDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string | string[] }>();
  return <TransactionDetailsScreen transactionId={Array.isArray(id) ? id[0] : id} />;
}
