import { Tabs } from 'expo-router';

import { PrimaryTabBar } from '@/components/primary-tab-bar';

export default function TabLayout() {
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{ headerShown: false }}
      tabBar={({ navigation }) => (
        <PrimaryTabBar onHomePress={() => navigation.navigate('index')} />
      )}>
      <Tabs.Screen name="index" options={{ title: 'Home' }} />
      <Tabs.Screen name="transactions" options={{ title: 'Transactions' }} />
      <Tabs.Screen name="accounts" options={{ title: 'Accounts' }} />
      <Tabs.Screen name="budgets" options={{ title: 'Budgets' }} />
    </Tabs>
  );
}
