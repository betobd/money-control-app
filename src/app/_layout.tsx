import { useFonts } from 'expo-font';
import type { ErrorBoundaryProps } from 'expo-router';
import { Stack } from 'expo-router/stack';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, useColorScheme, View } from 'react-native';

import { colors } from '@/constants/theme';
import { toUserMessage } from '@/errors/user-error';
import { AppLockProvider } from '@/features/security/app-lock-provider';
import { AppLockBoundary } from '@/features/security/components/app-lock-gate';
import { NotificationRuntime } from '@/features/notifications/notification-runtime';

const appFonts = {
  Manrope_400Regular: require('../../assets/fonts/Manrope_400Regular.ttf'),
  Manrope_500Medium: require('../../assets/fonts/Manrope_500Medium.ttf'),
  Manrope_600SemiBold: require('../../assets/fonts/Manrope_600SemiBold.ttf'),
  Manrope_700Bold: require('../../assets/fonts/Manrope_700Bold.ttf'),
  Manrope_800ExtraBold: require('../../assets/fonts/Manrope_800ExtraBold.ttf'),
  JetBrainsMono_400Regular: require('../../assets/fonts/JetBrainsMono_400Regular.ttf'),
  JetBrainsMono_500Medium: require('../../assets/fonts/JetBrainsMono_500Medium.ttf'),
  JetBrainsMono_600SemiBold: require('../../assets/fonts/JetBrainsMono_600SemiBold.ttf'),
  JetBrainsMono_700Bold: require('../../assets/fonts/JetBrainsMono_700Bold.ttf'),
};

/**
 * Root error boundary. Expo Router renders this when any screen throws during
 * render (including a failed database initialization surfaced by DatabaseGate),
 * replacing the default developer overlay in production with a recoverable,
 * theme-aware screen. No technical detail is exposed to the user.
 */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === 'dark' ? colors.dark : colors.light;
  return (
    <View style={[styles.errorScreen, { backgroundColor: theme.appBackground }]}>
      <Text style={[styles.errorTitle, { color: theme.primaryText }]}>Something went wrong</Text>
      <Text style={[styles.errorBody, { color: theme.secondaryText }]}>
        {toUserMessage(error, 'Money Control ran into an unexpected problem. Your data is safe on this device.')}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => void retry()}
        style={[styles.errorButton, { backgroundColor: theme.primaryAction }]}>
        <Text style={[styles.errorButtonLabel, { color: theme.onPrimaryAction }]}>Try again</Text>
      </Pressable>
    </View>
  );
}

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
  const [fontsLoaded, fontError] = useFonts(appFonts);

  if (!fontsLoaded && !fontError) {
    return (
      <View
        accessibilityLabel="Loading Money Control"
        style={[styles.loading, { backgroundColor: theme.appBackground }]}>
        <ActivityIndicator color={theme.primaryAction} size="large" />
      </View>
    );
  }

  const navigationTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.appBackground } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.appBackground } };

  return (
    <ThemeProvider value={navigationTheme}>
      <AppLockProvider>
        <AppLockBoundary>
          <DatabaseGate backgroundColor={theme.appBackground} accentColor={theme.primaryAction}>
            <NotificationRuntime>
              <Stack screenOptions={{ contentStyle: { backgroundColor: theme.appBackground }, headerShown: false }}>
                <Stack.Screen name="(tabs)" />
                <Stack.Screen name="add-transaction" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="transactions/[id]" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="refund-form" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="account-form" options={{ presentation: 'modal' }} />
                <Stack.Screen name="accounts/[id]" />
                <Stack.Screen name="investments" />
                <Stack.Screen name="investments/[id]" />
                <Stack.Screen name="investment-form" options={{ presentation: 'modal' }} />
                <Stack.Screen name="investment-valuation-form" options={{ presentation: 'modal' }} />
                <Stack.Screen name="pay-credit-card" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="update-credit-card-statement" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="categories" options={{ presentation: 'modal' }} />
                <Stack.Screen name="category-form" options={{ presentation: 'modal' }} />
                <Stack.Screen name="more" options={{ presentation: 'modal' }} />
                <Stack.Screen name="security" />
                <Stack.Screen name="notifications-settings" />
                <Stack.Screen name="backup" />
                <Stack.Screen name="data-export" />
                <Stack.Screen name="reports" />
                <Stack.Screen name="currency-rates" />
                <Stack.Screen name="budget-form" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="monthly-ceiling-form" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="recurring" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="recurring-form" options={{ presentation: 'fullScreenModal' }} />
                <Stack.Screen name="recurring-occurrence" options={{ presentation: 'fullScreenModal' }} />
              </Stack>
            </NotificationRuntime>
          </DatabaseGate>
        </AppLockBoundary>
        <StatusBar style="auto" />
      </AppLockProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', flex: 1, justifyContent: 'center' },
  errorScreen: { alignItems: 'center', flex: 1, gap: 16, justifyContent: 'center', padding: 24 },
  errorTitle: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  errorBody: { fontSize: 15, lineHeight: 21, textAlign: 'center' },
  errorButton: { borderRadius: 999, minHeight: 44, justifyContent: 'center', paddingHorizontal: 24 },
  errorButtonLabel: { fontSize: 15, fontWeight: '600' },
});
