import { Stack } from 'expo-router/stack';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, useColorScheme, View } from 'react-native';

import { colors } from '@/constants/theme';
import { AppLockProvider } from '@/features/security/app-lock-provider';
import { AppLockBoundary } from '@/features/security/components/app-lock-gate';

function DatabaseGate({ children, backgroundColor, accentColor }: {
  children: React.ReactNode;
  backgroundColor: string;
  accentColor: string;
}) {
  const [databaseError, setDatabaseError] = useState<Error>();
  const [databaseReady, setDatabaseReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void import('@/database/migrate').then(
      ({ initializeDatabase }) => initializeDatabase(),
    ).then(
      () => {
        if (mounted) setDatabaseReady(true);
      },
      (cause: unknown) => {
        if (mounted) setDatabaseError(cause instanceof Error ? cause : new Error('Database initialization failed.'));
      },
    );
    return () => {
      mounted = false;
    };
  }, []);

  if (databaseError) throw databaseError;
  if (!databaseReady) {
    return (
      <View
        accessibilityLabel="Preparing Money Control"
        style={[styles.loading, { backgroundColor }]}>
        <ActivityIndicator color={accentColor} size="large" />
      </View>
    );
  }
  return children;
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigationTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.appBackground } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.appBackground } };

  return (
    <ThemeProvider value={navigationTheme}>
      <AppLockProvider>
        <AppLockBoundary>
          <DatabaseGate backgroundColor={theme.appBackground} accentColor={theme.primaryAction}>
            <Stack screenOptions={{ contentStyle: { backgroundColor: theme.appBackground }, headerShown: false }}>
              <Stack.Screen name="(tabs)" />
              <Stack.Screen name="add-transaction" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="transactions/[id]" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="account-form" options={{ presentation: 'modal' }} />
              <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
              <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
              <Stack.Screen name="more" options={{ presentation: 'modal' }} />
              <Stack.Screen name="security" />
              <Stack.Screen name="backup" />
              <Stack.Screen name="reports" />
              <Stack.Screen name="budget-form" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="recurring" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="recurring-form" options={{ presentation: 'fullScreenModal' }} />
              <Stack.Screen name="recurring-occurrence" options={{ presentation: 'fullScreenModal' }} />
            </Stack>
          </DatabaseGate>
        </AppLockBoundary>
        <StatusBar style="auto" />
      </AppLockProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
});
