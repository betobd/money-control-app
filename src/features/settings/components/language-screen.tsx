import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ScreenHeader } from '@/components/screen-header';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { useMessages } from '@/i18n/use-messages';
import { LanguageOptions } from './language-options';

/** More → Language. */
export function LanguageScreen() {
  const theme = useAppTheme();
  const insets = useSafeAreaInsets();
  const t = useMessages();
  const [error, setError] = useState<string>();

  return (
    <View style={[styles.screen, { backgroundColor: theme.appBackground, paddingTop: insets.top }]}>
      <ScreenHeader leading="back" title={t.more.language.title} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Text style={[styles.intro, { color: theme.secondaryText }]}>{t.more.language.intro}</Text>
        {error ? (
          <Text accessibilityLiveRegion="assertive" style={[styles.intro, { color: theme.destructive }]}>{error}</Text>
        ) : null}
        <LanguageOptions onError={setError} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { gap: spacing.md, padding: spacing.md },
  intro: { ...typography.body },
});
