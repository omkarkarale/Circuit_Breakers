import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import { Button, Text } from 'react-native-paper';

import { InfoCard } from '../components/InfoCard';
import { ScreenContainer } from '../components/ScreenContainer';
import { RootTabParamList } from '../navigation/navigationTypes';
import { mockDashboardSummary } from '../services/mockData';

type DashboardScreenProps = BottomTabScreenProps<RootTabParamList, 'Dashboard'>;

export function DashboardScreen({ navigation }: DashboardScreenProps) {
  const summary = mockDashboardSummary;

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text variant="titleLarge" style={styles.title}>
          Smart Medicine Dispenser
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Device overview
        </Text>
      </View>

      <InfoCard label="Device Status" value={summary.deviceStatus} />
      <InfoCard label="Today's Doses" value={String(summary.todaysDoses)} />
      <InfoCard label="Remaining Medicines" value={String(summary.remainingMedicines)} />
      <InfoCard label="Next Dose" value={summary.nextDose} />

      <View style={styles.actions}>
        <Button mode="contained" icon="pill" onPress={() => navigation.navigate('Medicines')}>
          Medicines
        </Button>
        <Button mode="outlined" icon="stethoscope" onPress={() => navigation.navigate('Diagnostics')}>
          Diagnostics
        </Button>
        <Button mode="outlined" icon="cog-outline" onPress={() => navigation.navigate('Settings')}>
          Settings
        </Button>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    gap: 4,
    marginBottom: 4,
  },
  title: {
    color: '#102033',
    fontWeight: '700',
  },
  subtitle: {
    color: '#5D6B7A',
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
});
