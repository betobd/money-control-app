import { useLocalSearchParams } from 'expo-router';

import { InvestmentForm } from '@/features/investments/components/investment-form';

export default function InvestmentFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <InvestmentForm accountId={id} />;
}
