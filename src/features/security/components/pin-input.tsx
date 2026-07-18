import { forwardRef, useImperativeHandle, useRef } from 'react';
import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { borderRadii, borderWidths, spacing, typography } from '@/constants/theme';
import { useAppTheme } from '@/hooks/use-app-theme';
import { PIN_LENGTH } from '../app-lock.types';

export type PinInputHandle = {
  focus: () => void;
};

type PinInputProps = Pick<TextInputProps, 'editable' | 'onSubmitEditing'> & {
  accessibilityLabel: string;
  value: string;
  onChange: (value: string) => void;
  onInvalidInput?: () => void;
};

export const PinInput = forwardRef<PinInputHandle, PinInputProps>(function PinInput(
  { accessibilityLabel, editable = true, onChange, onInvalidInput, onSubmitEditing, value },
  forwardedRef,
) {
  const inputRef = useRef<TextInput>(null);
  const theme = useAppTheme();
  useImperativeHandle(forwardedRef, () => ({ focus: () => inputRef.current?.focus() }));

  return (
    <TextInput
      ref={inputRef}
      accessibilityLabel={accessibilityLabel}
      autoCapitalize="none"
      autoComplete="off"
      contextMenuHidden
      editable={editable}
      importantForAutofill="noExcludeDescendants"
      keyboardType="number-pad"
      maxLength={PIN_LENGTH}
      onChangeText={(next) => {
        if (next !== '' && !/^\d+$/u.test(next)) {
          onInvalidInput?.();
          return;
        }
        onChange(next);
      }}
      onSubmitEditing={onSubmitEditing}
      placeholder="••••••"
      placeholderTextColor={theme.mutedText}
      returnKeyType="done"
      secureTextEntry
      selectTextOnFocus={false}
      style={[
        styles.input,
        {
          backgroundColor: theme.elevatedSurface,
          borderColor: theme.border,
          color: theme.primaryText,
        },
      ]}
      textContentType="none"
      value={value}
    />
  );
});

const styles = StyleSheet.create({
  input: {
    ...typography.title,
    borderRadius: borderRadii.md,
    borderWidth: borderWidths.thin,
    fontVariant: ['tabular-nums'],
    letterSpacing: spacing.md,
    minHeight: 58,
    paddingHorizontal: spacing.md,
    textAlign: 'center',
  },
});

