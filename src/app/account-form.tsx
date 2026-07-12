import { useLocalSearchParams } from 'expo-router';

import { AccountForm } from '@/features/accounts/components/account-form';

export default function AccountFormRoute() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <AccountForm accountId={id} />;
}
