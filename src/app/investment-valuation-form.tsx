import { useLocalSearchParams } from 'expo-router';

import { InvestmentValuationForm } from '@/features/investments/components/investment-valuation-form';

export default function InvestmentValuationFormRoute() {
  const { accountId } = useLocalSearchParams<{ accountId: string }>();
  return <InvestmentValuationForm accountId={accountId} />;
}
