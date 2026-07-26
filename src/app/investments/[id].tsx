import { useLocalSearchParams } from 'expo-router';

import { InvestmentDetailsScreen } from '@/features/investments/components/investment-details-screen';

export default function InvestmentDetailsRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <InvestmentDetailsScreen accountId={id} />;
}
