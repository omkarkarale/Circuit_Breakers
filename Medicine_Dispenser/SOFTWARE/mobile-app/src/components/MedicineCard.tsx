import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Switch, Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons } from '../design/icons';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type MedicineCardProps = {
  medicineName: string;
  remainingPills: number;
  dispenserSlot: string;
  enabled: boolean;
  nextDose: string;
  dosage?: string;
  onPress?: () => void;
};

export function MedicineCard({
  medicineName,
  remainingPills,
  dispenserSlot,
  enabled,
  nextDose,
  dosage,
  onPress,
}: MedicineCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.iconTile}>
          <MaterialCommunityIcons name={icons.medication} size={30} color={colors.primary} />
        </View>
        <MaterialCommunityIcons name={icons.more} size={24} color={colors.onSurfaceVariant} />
      </View>

      <View style={styles.titleBlock}>
        <Text style={styles.name}>{medicineName}</Text>
        {dosage ? <Text style={styles.dosage}>{dosage}</Text> : null}
      </View>

      <View style={styles.statsRow}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Remaining</Text>
          <Text style={styles.statValue}>{remainingPills} Pills</Text>
        </View>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Dispenser</Text>
          <Text style={styles.statValue}>{dispenserSlot}</Text>
        </View>
      </View>

      <View style={styles.bottomRow}>
        <View style={styles.nextDose}>
          <MaterialCommunityIcons name={icons.schedule} size={16} color={colors.primary} />
          <Text style={styles.nextDoseText}>Next: {nextDose}</Text>
        </View>
        <Switch value={enabled} color={colors.primary} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.sm,
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: spacing.hairline,
    gap: spacing.stackMd,
    padding: spacing.cardPadding,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.lg,
    height: spacing.iconTile,
    justifyContent: 'center',
    width: spacing.iconTile,
  },
  titleBlock: {
    gap: spacing.xxs,
  },
  name: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  dosage: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  statsRow: {
    borderBottomColor: colors.outlineVariant,
    borderTopColor: colors.outlineVariant,
    borderTopWidth: spacing.hairline,
    borderBottomWidth: spacing.hairline,
    flexDirection: 'row',
    gap: spacing.stackLg,
    paddingVertical: spacing.stackSm,
  },
  stat: {
    flex: 1,
    gap: spacing.xxs,
  },
  statLabel: {
    ...typography.labelSm,
    color: colors.outline,
    textTransform: 'uppercase',
  },
  statValue: {
    ...typography.bodyMd,
    color: colors.onSurface,
    fontWeight: '600',
  },
  bottomRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  nextDose: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.stackSm,
  },
  nextDoseText: {
    ...typography.labelLg,
    color: colors.primary,
  },
});
