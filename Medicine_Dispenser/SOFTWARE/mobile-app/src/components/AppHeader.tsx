import React from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Text } from 'react-native-paper';

import { colors } from '../design/colors';
import { icons, type AppIcon } from '../design/icons';
import { radius } from '../design/radius';
import { spacing } from '../design/spacing';
import { typography } from '../design/typography';

export type AppHeaderProps = {
  title: string;
  subtitle?: string;
  avatarUri?: string;
  actionIcon?: AppIcon;
  onActionPress?: () => void;
};

export function AppHeader({
  title,
  subtitle,
  avatarUri,
  actionIcon = 'notifications',
  onActionPress,
}: AppHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.identity}>
        <View style={styles.avatar}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
          ) : (
            <MaterialCommunityIcons name={icons.profile} size={28} color={colors.primary} />
          )}
        </View>
        <View>
          <Text style={styles.title}>{title}</Text>
          {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
        </View>
      </View>
      <Pressable accessibilityRole="button" onPress={onActionPress} style={styles.action}>
        <MaterialCommunityIcons name={icons[actionIcon]} size={24} color={colors.primary} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.gutter,
    paddingVertical: spacing.stackMd,
  },
  identity: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.inlineMd,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: colors.surfaceVariant,
    borderRadius: radius.full,
    height: spacing.iconButton,
    justifyContent: 'center',
    overflow: 'hidden',
    width: spacing.iconButton,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  title: {
    ...typography.headlineMd,
    color: colors.primary,
  },
  subtitle: {
    ...typography.labelSm,
    color: colors.onSurfaceVariant,
  },
  action: {
    alignItems: 'center',
    borderRadius: radius.full,
    height: spacing.iconButton,
    justifyContent: 'center',
    width: spacing.iconButton,
  },
});
