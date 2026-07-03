import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type StatusBadgeStatus = 'Connected' | 'Disconnected' | 'Warning' | 'Healthy' | 'Offline' | 'Working';

export type StatusBadgeProps = {
  status: StatusBadgeStatus;
};

const statusColors: Record<StatusBadgeStatus, { backgroundColor: string; color: string }> = {
  Connected: { backgroundColor: colors.secondaryContainer, color: colors.onSecondaryContainer },
  Healthy: { backgroundColor: colors.secondaryContainer, color: colors.onSecondaryContainer },
  Working: { backgroundColor: colors.secondaryContainer, color: colors.onSecondaryContainer },
  Warning: { backgroundColor: colors.tertiaryContainer, color: colors.onTertiaryContainer },
  Disconnected: { backgroundColor: colors.errorContainer, color: colors.onErrorContainer },
  Offline: { backgroundColor: colors.errorContainer, color: colors.onErrorContainer },
};

export function StatusBadge({ status }: StatusBadgeProps) {
  const palette = statusColors[status];

  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor }]}>
      <Text style={[styles.label, { color: palette.color }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: 'flex-start',
    borderRadius: radius.full,
    paddingHorizontal: spacing.stackSm,
    paddingVertical: spacing.xs,
  },
  label: {
    ...typography.diagnosticBadge,
    textTransform: 'uppercase',
  },
});
