import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons, type AppIcon } from '../design/icons';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type QuickActionCardProps = {
  title: string;
  subtitle?: string;
  icon: AppIcon;
  onPress?: () => void;
};

export function QuickActionCard({ title, subtitle, icon, onPress }: QuickActionCardProps) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.card}>
      <View style={styles.iconTile}>
        <MaterialCommunityIcons name={icons[icon]} size={24} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      <MaterialCommunityIcons name={icons.chevronRight} size={24} color={colors.onSurfaceVariant} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
    borderRadius: radius.xl,
    flexDirection: 'row',
    gap: spacing.stackMd,
    minHeight: spacing.touchTargetMin,
    padding: spacing.stackMd,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderRadius: radius.lg,
    height: spacing.compactIconTile,
    justifyContent: 'center',
    width: spacing.compactIconTile,
  },
  copy: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
