import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { ScreenContainer } from '../components/ScreenContainer';

export function SettingsScreen() {
  return (
    <ScreenContainer>
      <Card mode="contained" style={styles.card}>
        <Card.Content style={styles.content}>
          <Text variant="titleMedium" style={styles.title}>
            Settings
          </Text>
          <Text variant="bodyMedium" style={styles.text}>
            Placeholder page
          </Text>
        </Card.Content>
      </Card>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#F1F6FB',
    borderRadius: 16,
  },
  content: {
    gap: 6,
  },
  title: {
    color: '#102033',
    fontWeight: '700',
  },
  text: {
    color: '#5D6B7A',
  },
});
