import { SymbolView } from 'expo-symbols';
import { Fragment, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/card';
import { PressableScale } from '@/components/pressable-scale';
import { spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { deviceLanguage, readLanguagePreference, type LanguagePreference } from '@/i18n/language-preference';
import { languageNativeNames, supportedLanguages } from '@/i18n/languages';
import { useMessages } from '@/i18n/use-messages';
import { changeLanguage } from '../change-language';

/**
 * The language choices: follow the device, or one of the supported languages,
 * each named in its own language. Used by More → Language and the welcome screen.
 */
export function LanguageOptions({ onError }: { onError: (message: string) => void }) {
  const theme = useAppTheme();
  const t = useMessages();
  const [preference, setPreference] = useState<LanguagePreference>(readLanguagePreference);
  const [busy, setBusy] = useState(false);

  const options: { value: LanguagePreference; label: string; detail?: string }[] = [
    { value: 'system', label: t.more.language.deviceOption, detail: t.more.language.deviceDetail(languageNativeNames[deviceLanguage()]) },
    ...supportedLanguages.map((language) => ({ value: language, label: languageNativeNames[language] })),
  ];

  async function select(value: LanguagePreference) {
    if (busy || value === preference) return;
    setBusy(true);
    setPreference(value);
    try {
      // On success the navigation tree remounts in the new language, so this
      // component is gone before there is anything to reset.
      await changeLanguage(value);
    } catch {
      setPreference(readLanguagePreference());
      onError(t.more.language.changeFailed);
      setBusy(false);
    }
  }

  return (
    <Card padding={0}>
      {options.map((option, index) => {
        const selected = option.value === preference;
        return (
          <Fragment key={option.value}>
            {index > 0 ? <View style={[styles.separator, { backgroundColor: theme.hairline }]} /> : null}
            <PressableScale
              accessibilityHint={selected ? t.more.language.selectedHint : undefined}
              accessibilityLabel={option.detail ? `${option.label}, ${option.detail}` : option.label}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected, disabled: busy }}
              disabled={busy}
              onPress={() => void select(option.value)}
              style={styles.row}>
              <View style={styles.text}>
                <Text style={[styles.label, { color: theme.primaryText }]}>{option.label}</Text>
                {option.detail ? (
                  <Text style={[styles.detail, { color: theme.secondaryText }]}>{option.detail}</Text>
                ) : null}
              </View>
              {selected ? (
                <SymbolView
                  name={{ ios: 'checkmark', android: 'check', web: 'check' }}
                  size={20}
                  tintColor={theme.primaryAction}
                />
              ) : null}
            </PressableScale>
          </Fragment>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: { alignItems: 'center', flexDirection: 'row', gap: spacing.md, minHeight: 56, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: spacing.md },
  text: { flex: 1 },
  label: { ...typography.body },
  detail: { ...typography.caption },
});
