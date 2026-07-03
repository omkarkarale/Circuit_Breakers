import React from 'react';
import { StyleSheet } from 'react-native';
import { Button } from 'react-native-paper';

import { ScreenContainer } from '../components/ScreenContainer';
import { mockDiagnosticTests } from '../services/mockData';

export function DiagnosticsScreen() {
  return (
    <ScreenContainer>
      {mockDiagnosticTests.map((testName) => (
        <Button key={testName} mode="contained-tonal" disabled style={styles.button}>
          {testName}
        </Button>
      ))}
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: 16,
  },
});
