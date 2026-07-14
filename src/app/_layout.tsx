import { Stack } from 'expo-router/stack';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { useColorScheme } from 'react-native';

import { colors } from '@/constants/theme';
import { initializeDatabase } from '@/database/migrate';

export default function RootLayout() {
  const [databaseError, setDatabaseError] = useState<Error>();
  const [databaseReady, setDatabaseReady] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigationTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.appBackground } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.appBackground } };

  useEffect(() => {
    initializeDatabase().then(() => setDatabaseReady(true), setDatabaseError);
  }, []);

  if (databaseError) {
    throw databaseError;
  }

  if (!databaseReady) {
    return null;
  }

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: theme.appBackground }, headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="transactions/[id]" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="account-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
        <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
        <Stack.Screen name="more" options={{ presentation: 'modal' }} />
        <Stack.Screen name="budget-form" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
