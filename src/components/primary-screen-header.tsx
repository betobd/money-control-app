import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function PrimaryScreenHeader() {
  const router = useRouter();
  const theme = useAppTheme();
  return <View style={styles.header}>
    <View style={styles.action} />
    <Text accessibilityRole="header" style={[styles.brand, { color: theme.primaryText }]}>Money Control</Text>
    <Pressable accessibilityLabel="More" accessibilityHint="Open app management options" accessibilityRole="button" onPress={() => router.push('/more')} style={styles.action}>
      <SymbolView name={{ ios: 'ellipsis.circle', android: 'more_horiz', web: 'more_horiz' }} size={26} tintColor={theme.secondaryText} />
    </Pressable>
  </View>;
}

const styles = StyleSheet.create({ header: { alignItems: 'center', flexDirection: 'row', minHeight: 48 }, action: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, brand: { ...typography.sectionTitle, flex: 1, textAlign: 'center' } });
