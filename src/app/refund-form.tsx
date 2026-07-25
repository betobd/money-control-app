import { useLocalSearchParams } from 'expo-router';

import { RefundFormScreen } from '@/features/refunds/components/refund-form-screen';

export default function RefundFormRoute() {
  const { originalTransactionId } = useLocalSearchParams<{
    originalTransactionId: string | string[];
  }>();
  const id = Array.isArray(originalTransactionId)
    ? originalTransactionId[0]
    : originalTransactionId;
  return <RefundFormScreen originalTransactionId={id ?? ''} />;
}
