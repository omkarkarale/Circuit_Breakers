import React from 'react';
import { StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons, type AppIcon } from '../design/icons';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type TimelineItemProps = {
  title: string;
  timestamp: string;
  description?: string;
  icon?: AppIcon;
  isLast?: boolean;
};

export function TimelineItem({
  title,
  timestamp,
  description,
  icon = 'schedule',
  isLast = false,
}: TimelineItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.rail}>
        <View style={styles.marker}>
          <MaterialCommunityIcons name={icons[icon]} size={16} color={colors.primary} />
        </View>
        {!isLast ? <View style={styles.line} /> : null}
      </View>
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.timestamp}>{timestamp}</Text>
        {description ? <Text style={styles.description}>{description}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: spacing.stackMd,
  },
  rail: {
    alignItems: 'center',
  },
  marker: {
    alignItems: 'center',
    backgroundColor: colors.primaryFixed,
    borderRadius: radius.full,
    height: spacing.compactIconTile,
    justifyContent: 'center',
    width: spacing.compactIconTile,
  },
  line: {
    backgroundColor: colors.outlineVariant,
    flex: 1,
    minHeight: spacing.stackLg,
    width: spacing.hairline,
  },
  content: {
    flex: 1,
    gap: spacing.xxs,
    paddingBottom: spacing.stackLg,
  },
  title: {
    ...typography.labelLg,
    color: colors.onSurface,
  },
  timestamp: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  description: {
    ...typography.bodyMd,
    color: colors.onSurfaceVariant,
  },
});
