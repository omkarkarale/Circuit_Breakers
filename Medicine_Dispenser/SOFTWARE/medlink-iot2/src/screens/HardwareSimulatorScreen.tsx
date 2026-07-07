import React from 'react';
import DeviceSimulator from '../components/DeviceSimulator';

interface HardwareSimulatorViewProps {
  onNavigate: (screen: string) => void;
}

export default function HardwareSimulatorView({ onNavigate }: HardwareSimulatorViewProps) {
  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Back navigation */}
      <div className="flex justify-between items-center">
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-accent dark:text-[#7cf994] font-bold cursor-pointer hover:underline"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
      </div>

      <div className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">Hardware Simulator</h2>
        <p className="text-xs text-muted dark:text-slate-400">Simulate the physical ESP32 Smart Dispenser</p>
      </div>

      <DeviceSimulator />
    </div>
  );
}
