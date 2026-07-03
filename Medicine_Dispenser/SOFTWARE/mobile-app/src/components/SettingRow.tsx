import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Switch, Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons, type AppIcon } from '../design/icons';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type SettingRowProps = {
  title: string;
  description?: string;
  icon?: AppIcon;
  value?: boolean;
  onToggle?: (value: boolean) => void;
  onPress?: () => void;
};

export function SettingRow({ title, description, icon = 'settings', value, onToggle, onPress }: SettingRowProps) {
  const hasSwitch = typeof value === 'boolean';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={styles.row}>
      <View style={styles.iconTile}>
        <MaterialCommunityIcons name={icons[icon]} size={22} color={colors.primary} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>{title}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
      {hasSwitch ? (
        <Switch value={value} onValueChange={onToggle} color={colors.primary} />
      ) : (
        <MaterialCommunityIcons name={icons.chevronRight} size={24} color={colors.onSurfaceVariant} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLowest,
    borderColor: colors.outlineVariant,
    borderRadius: radius.xl,
    borderWidth: spacing.hairline,
    flexDirection: 'row',
    gap: spacing.stackMd,
    minHeight: spacing.inputHeight,
    padding: spacing.stackMd,
  },
  iconTile: {
    alignItems: 'center',
    backgroundColor: colors.surfaceContainerLow,
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
  description: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
});
