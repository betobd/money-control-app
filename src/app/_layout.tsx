import { Stack } from 'expo-router/stack';
import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router/react-navigation';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';

import { colors } from '@/constants/theme';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme = isDark ? colors.dark : colors.light;
  const navigationTheme = isDark
    ? { ...DarkTheme, colors: { ...DarkTheme.colors, background: theme.background } }
    : { ...DefaultTheme, colors: { ...DefaultTheme.colors, background: theme.background } };

  return (
    <ThemeProvider value={navigationTheme}>
      <Stack screenOptions={{ contentStyle: { backgroundColor: theme.background }, headerShown: false }}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="add-transaction" options={{ presentation: 'fullScreenModal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
