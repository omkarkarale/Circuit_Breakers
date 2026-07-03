import React from 'react';
import { StyleSheet } from 'react-native';
import { Card, Text } from 'react-native-paper';

import { ScreenContainer } from '../components/ScreenContainer';
import { mockMedicines } from '../services/mockData';

export function MedicinesScreen() {
  return (
    <ScreenContainer>
      {mockMedicines.map((medicine) => (
        <Card key={medicine.id} mode="contained" style={styles.card}>
          <Card.Content style={styles.content}>
            <Text variant="titleMedium" style={styles.name}>
              {medicine.name}
            </Text>
            <Text variant="bodyLarge" style={styles.remaining}>
              {medicine.remainingPills} pills remaining
            </Text>
          </Card.Content>
        </Card>
      ))}
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
  name: {
    color: '#102033',
    fontWeight: '700',
  },
  remaining: {
    color: '#5D6B7A',
  },
});
