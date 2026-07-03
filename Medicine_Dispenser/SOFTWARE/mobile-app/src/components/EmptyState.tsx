import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons, type AppIcon } from '../design/icons';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';
import { SecondaryButton } from './SecondaryButton';

export type EmptyStateProps = {
  title: string;
  message: string;
  icon?: AppIcon;
  actionLabel?: string;
  onActionPress?: () => void;
};

export function EmptyState({
  title,
  message,
  icon = 'empty',
  actionLabel,
  onActionPress,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <View style={styles.iconTile}>
        <MaterialCommunityIcons name={icons[icon]} size={32} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.message}>{message}</Text>
      </View>
      {actionLabel ? <SecondaryButton onPress={onActionPress}>{actionLabel}</SecondaryButton> : null}
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
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.full,
    height: spacing.emptyIconTile,
    justifyContent: 'center',
    width: spacing.emptyIconTile,
  },
  copy: {
    alignItems: 'center',
    gap: spacing.stackSm,
  },
  title: {
    ...typography.headlineSm,
    color: colors.onSurface,
    textAlign: 'center',
  },
  message: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});
