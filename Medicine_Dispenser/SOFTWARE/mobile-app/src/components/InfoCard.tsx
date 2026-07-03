import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons, type AppIcon } from '../design/icons';
import { radius } from '../design/radius';
import { shadows } from '../design/shadows';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type InfoCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  icon?: AppIcon;
};

export function InfoCard({ title, value, subtitle, icon }: InfoCardProps) {
  return (
    <View style={styles.card}>
      {icon ? (
        <View style={styles.iconTile}>
          <MaterialCommunityIcons name={icons[icon]} size={24} color={colors.primary} />
        </View>
      ) : null}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.value}>{value}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.sm,
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: spacing.hairline,
    flexDirection: 'row',
    gap: spacing.stackMd,
    padding: spacing.stackMd,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.lg,
    height: spacing.iconTile,
    justifyContent: 'center',
    width: spacing.iconTile,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
  },
  title: {
    ...typography.labelLg,
    color: colors.onSurfaceVariant,
  },
  value: {
    ...typography.headlineSm,
    color: colors.onSurface,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
