import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type ProgressRingProps = {
  value: number;
  max: number;
  label: string;
  size?: number;
};

export function ProgressRing({ value, max, label, size = 96 }: ProgressRingProps) {
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  const ringSize = size;
  const ringBorder = spacing.unit;

  return (
    <View
      style={[
        styles.ring,
        {
          borderColor: percentage >= 1 ? colors.secondaryContainer : colors.primary,
          borderWidth: ringBorder,
          height: ringSize,
          width: ringSize,
        },
      ]}
    >
      <Text style={styles.value}>
        {value}/{max}
      </Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.full,
    justifyContent: 'center',
  },
  value: {
    ...typography.headlineSm,
    color: colors.primary,
  },
  label: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
