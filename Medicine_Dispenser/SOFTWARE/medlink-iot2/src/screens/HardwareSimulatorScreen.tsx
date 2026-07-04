import React from 'react';
import { useApp } from '../hooks/useApp';
import DeviceSimulator from '../components/DeviceSimulator';

interface HardwareSimulatorScreenProps {
  onNavigate: (screen: string) => void;
}

export default function HardwareSimulatorScreen({ onNavigate }: HardwareSimulatorScreenProps) {
  const { dispensingState, takePill, cancelDispense, config } = useApp();

  return (
    <div className="space-y-6 pt-2">
      {/* Navigation Header */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-[#004ac6] dark:text-[#7cf994] font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
      </div>

      {/* Simulator Heading Section */}
      <section className="text-center py-2">
        <h2 className="text-lg font-bold text-[#111c2d] dark:text-white">IoT Hardware Simulator</h2>
        <p className="text-xs text-[#737686] mt-1">
          Simulate the physical ESP32 Smart Box actuators, LED lights, and sensors in real-time.
        </p>
      </section>

      {/* Simulator Component Rendering */}
      <div className="py-2">
        <DeviceSimulator
          dispensingState={dispensingState}
          onTakePill={takePill}
          onCancelDispense={cancelDispense}
          ssid={config.ssid}
        />
      </div>
    </div>
  );
}
