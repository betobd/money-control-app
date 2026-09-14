import { Redirect, Tabs } from 'expo-router';

import { PrimaryTabBar } from '@/components/primary-tab-bar';
import { useOnboardingCompleted } from '@/features/settings/use-onboarding-completed';
import { useMessages } from '@/i18n/use-messages';

export default function TabLayout() {
  // A fresh install chooses its base currency before anything can lock it. The
  // tabs are where every create flow starts, so guarding them guards the app.
  const onboardingCompleted = useOnboardingCompleted();
  const t = useMessages();
  if (!onboardingCompleted) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation }) => (
        <PrimaryTabBar onHomePress={() => navigation.navigate('index')} />
      )}>
      <Tabs.Screen name="index" options={{ title: t.common.tabs.home }} />
      <Tabs.Screen name="transactions" options={{ title: t.common.tabs.transactions }} />
      <Tabs.Screen name="accounts" options={{ title: t.common.tabs.accounts }} />
      <Tabs.Screen name="budgets" options={{ title: t.common.tabs.budgets }} />
    </Tabs>
  );
}
