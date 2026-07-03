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
import { PrimaryButton } from './PrimaryButton';
import { SecondaryButton } from './SecondaryButton';
import { StatusBadge, type StatusBadgeStatus } from './StatusBadge';

export type DiagnosticCardProps = {
  title: string;
  status: StatusBadgeStatus;
  buttonLabel: string;
  onTest?: () => void;
  subtitle?: string;
  icon?: AppIcon;
};

export function DiagnosticCard({
  title,
  status,
  buttonLabel,
  onTest,
  subtitle,
  icon = 'diagnostics',
}: DiagnosticCardProps) {
  const isCritical = status === 'Offline' || status === 'Disconnected';

  return (
    <View style={[styles.card, isCritical ? styles.criticalCard : null]}>
      <View style={styles.topRow}>
        <View style={[styles.iconTile, isCritical ? styles.criticalIconTile : null]}>
          <MaterialCommunityIcons
            name={icons[isCritical ? 'warning' : icon]}
            size={24}
            color={isCritical ? colors.onErrorContainer : colors.onSecondaryContainer}
          />
        </View>
        <StatusBadge status={status} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={[styles.subtitle, isCritical ? styles.criticalSubtitle : null]}>{subtitle}</Text> : null}
      </View>
      {isCritical ? (
        <PrimaryButton onPress={onTest}>{buttonLabel}</PrimaryButton>
      ) : (
        <SecondaryButton onPress={onTest}>{buttonLabel}</SecondaryButton>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    ...shadows.sm,
    backgroundColor: colors.cardGlass,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: spacing.hairline,
    gap: spacing.stackMd,
    minHeight: spacing.diagnosticCardMinHeight,
    padding: spacing.stackMd,
  },
  criticalCard: {
    backgroundColor: colors.errorContainer,
    borderColor: colors.error,
  },
  topRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.secondaryContainer,
    borderRadius: radius.lg,
    height: spacing.compactIconTile,
    justifyContent: 'center',
    width: spacing.compactIconTile,
  },
  criticalIconTile: {
    backgroundColor: colors.errorContainer,
  },
  copy: {
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
  criticalSubtitle: {
    color: colors.error,
  },
});
