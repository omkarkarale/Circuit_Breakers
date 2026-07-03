import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';

export type ProgressBarProps = {
  value: number;
  max: number;
};

export function ProgressBar({ value, max }: ProgressBarProps) {
  const percentage = max > 0 ? Math.min(Math.max(value / max, 0), 1) * 100 : 0;

  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${percentage}%` }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    backgroundColor: colors.surfaceContainer,
    borderRadius: radius.full,
    height: spacing.unit,
    overflow: 'hidden',
  },
  fill: {
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.full,
    height: '100%',
  },
});
