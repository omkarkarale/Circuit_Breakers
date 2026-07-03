import React from 'react';
import { StyleSheet } from 'react-native';
import { Button, type ButtonProps } from 'react-native-paper';

import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type SecondaryButtonProps = Pick<ButtonProps, 'children' | 'icon' | 'disabled' | 'loading' | 'onPress'>;

export function SecondaryButton({ children, icon, disabled, loading, onPress }: SecondaryButtonProps) {
  return (
    <Button
      mode="contained-tonal"
      icon={icon}
      disabled={disabled}
      loading={loading}
      onPress={onPress}
      buttonColor={colors.secondaryContainer}
      textColor={colors.onSecondaryContainer}
      contentStyle={styles.content}
      labelStyle={styles.label}
      style={styles.button}
    >
      {children}
    </Button>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.xl,
  },
  content: {
    minHeight: spacing.touchTargetMin,
  },
  label: {
    ...typography.labelLg,
  },
});
