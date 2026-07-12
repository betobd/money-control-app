import { SymbolView } from 'expo-symbols';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';

export function MoreScreen() {
  const router = useRouter(); const insets = useSafeAreaInsets(); const theme = useAppTheme();
  return <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
    <View style={styles.header}><Pressable accessibilityLabel="Close More" accessibilityRole="button" onPress={() => router.back()} style={styles.headerButton}><SymbolView name={{ ios: 'xmark', android: 'close', web: 'close' }} size={24} tintColor={theme.primaryText} /></Pressable><Text accessibilityRole="header" style={[styles.title, { color: theme.primaryText }]}>More</Text><View style={styles.headerButton} /></View>
    <View style={styles.content}><Pressable accessibilityLabel="Manage categories" accessibilityHint="Create, edit, archive, and restore categories" accessibilityRole="button" onPress={() => router.push('/categories')} style={[styles.row, { backgroundColor: theme.surface, borderColor: theme.border }]}><View style={[styles.icon, { backgroundColor: theme.elevatedSurface }]}><SymbolView name={{ ios: 'square.grid.2x2.fill', android: 'category', web: 'category' }} size={24} tintColor={theme.primaryAction} /></View><View style={styles.text}><Text style={[styles.label, { color: theme.primaryText }]}>Categories</Text><Text style={[styles.description, { color: theme.secondaryText }]}>Manage expense and income categories</Text></View><SymbolView name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }} size={22} tintColor={theme.mutedText} /></Pressable></View>
  </View>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, header: { alignItems: 'center', flexDirection: 'row', minHeight: 64, paddingHorizontal: spacing.sm }, headerButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, title: { ...typography.title, flex: 1, fontSize: 26, textAlign: 'center' }, content: { padding: spacing.md }, row: { alignItems: 'center', borderRadius: borderRadii.md, borderWidth: borderWidths.thin, flexDirection: 'row', gap: spacing.md, minHeight: 76, padding: spacing.md }, icon: { alignItems: 'center', borderRadius: borderRadii.md, height: 44, justifyContent: 'center', width: 44 }, text: { flex: 1 }, label: { ...typography.body, fontWeight: '700' }, description: { ...typography.caption } });
