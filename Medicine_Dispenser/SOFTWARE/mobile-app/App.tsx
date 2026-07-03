import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import {
  MD3LightTheme,
  PaperProvider,
  Text,
} from "react-native-paper";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { PrimaryButton } from "./src/components/PrimaryButton";
import { SecondaryButton } from "./src/components/SecondaryButton";
import { StatusBadge } from "./src/components/StatusBadge";
import { MedicineCard } from "./src/components/MedicineCard";
import { DiagnosticCard } from "./src/components/DiagnosticCard";

const theme = {
  ...MD3LightTheme,
  colors: {
    ...MD3LightTheme.colors,
    primary: "#2563EB",
  },
};

export default function App() {
  return (
    <SafeAreaProvider>
      <PaperProvider theme={theme}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
        >
          <Text variant="headlineMedium" style={styles.title}>
            MedLink IoT
          </Text>

          <Text variant="bodyMedium" style={styles.subtitle}>
            Design System Preview
          </Text>

          <StatusBadge status="Connected" />

          <PrimaryButton onPress={() => {}}>
            Primary Button
          </PrimaryButton>

          <SecondaryButton onPress={() => {}}>
            Secondary Button
          </SecondaryButton>

          <MedicineCard
            medicineName="Metformin 500mg"
            remainingPills={28}
            dispenserSlot="Slot 1"
            enabled={true}
            nextDose="08:00 AM"
            dosage="1 Tablet"
            onPress={() => {}}
          />

          <DiagnosticCard
            title="Stepper Motor 1"
            subtitle="Motor Ready"
            status="Healthy"
            buttonLabel="Test"
            onTest={() => {}}
          />
        </ScrollView>
      </PaperProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  content: {
    padding: 20,
    gap: 20,
  },
  title: {
    textAlign: "center",
    marginTop: 20,
    marginBottom: 8,
    fontWeight: "700",
  },
  subtitle: {
    textAlign: "center",
    marginBottom: 20,
    color: "#64748B",
  },
});