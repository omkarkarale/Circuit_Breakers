import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';
import { ProgressBar } from './ProgressBar';
import { StatusBadge, type StatusBadgeStatus } from './StatusBadge';

export type InventoryCardProps = {
  title: string;
  remainingPills: number;
  capacity: number;
  status?: StatusBadgeStatus;
};

export function InventoryCard({ title, remainingPills, capacity, status }: InventoryCardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {status ? <StatusBadge status={status} /> : null}
      </View>
      <View style={styles.countRow}>
        <Text style={styles.remaining}>{remainingPills}</Text>
        <Text style={styles.capacity}>/ {capacity} Pills remaining</Text>
      </View>
      <ProgressBar value={remainingPills} max={capacity} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.md,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: spacing.hairline,
    gap: spacing.stackMd,
    padding: spacing.stackLg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
    textTransform: 'uppercase',
  },
  countRow: {
    alignItems: 'baseline',
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  remaining: {
    ...typography.headlineMd,
    color: colors.onSurface,
  },
  capacity: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
