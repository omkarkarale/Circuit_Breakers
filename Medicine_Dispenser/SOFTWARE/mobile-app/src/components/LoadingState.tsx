import React from 'react';
import { StyleSheet, View } from 'react-native';
import { ActivityIndicator, Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type LoadingStateProps = {
  label: string;
};

export function LoadingState({ label }: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator animating color={colors.primary} />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    gap: spacing.stackMd,
    padding: spacing.stackLg,
  },
  label: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
});
