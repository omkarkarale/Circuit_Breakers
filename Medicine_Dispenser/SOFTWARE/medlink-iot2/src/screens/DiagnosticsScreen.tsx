import React, { useState } from 'react';
import { HardwareComponent, DeviceConfig, Settings } from '../types';

interface DiagnosticsViewProps {
  hardware: HardwareComponent[];
  onTestComponent: (id: string) => void;
  onResetComponent: (id: string) => void;
  onRunFullDiagnostics: () => Promise<void>;
  internalTemp: number;
  config: DeviceConfig;
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

export default function DiagnosticsView({
  hardware,
  onTestComponent,
  onResetComponent,
  onRunFullDiagnostics,
  internalTemp,
  config,
  settings,
  onUpdateSettings
}: DiagnosticsViewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestingIndex, setCurrentTestingIndex] = useState<number | null>(null);

  const threshold = settings.tempThreshold || 38;
  const isTempExceeded = internalTemp > threshold;

  const handleRunAll = async () => {
    setIsRunning(true);
    for (let i = 0; i < hardware.length; i++) {
      setCurrentTestingIndex(i);
      onTestComponent(hardware[i].id);
      await new Promise(resolve => setTimeout(resolve, 600)); // simulate step test delay
    }
    setCurrentTestingIndex(null);
    await onRunFullDiagnostics();
    setIsRunning(false);
  };

  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Header Info */}
      <section className="space-y-1">
        <h2 className="text-xl font-bold tracking-tight">System Diagnostics</h2>
        <p className="text-xs text-muted dark:text-slate-400">Engineering level hardware health monitor</p>
      </section>

      {/* 1. Internal temperature status card */}
      {config.tempSupported && (
        <section className={`rounded-sm p-5 relative overflow-hidden shadow-md border transition-all ${
          isTempExceeded 
            ? 'bg-error-bg dark:bg-red-950/20 border-error-custom/30 text-error-custom dark:text-red-400' 
            : 'bg-gradient-to-br from-accent/90 to-accent-hover/90 dark:from-accent/70 dark:to-accent-hover/60 text-white border-transparent'
        }`}>
          <div className="relative z-10 space-y-4">
            <div className="flex justify-between items-start">
              <div>
                <h4 className={`text-xs font-semibold uppercase tracking-wider ${isTempExceeded ? 'text-error-custom/80' : 'text-white/80'}`}>
                  Dispenser Internal Core
                </h4>
                <div className="flex items-baseline gap-1.5 mt-2">
                  <span className="text-3xl font-bold font-mono">{internalTemp}°C</span>
                  <span className={`text-xs px-2.5 py-0.5 rounded-sm font-bold uppercase tracking-wider ${
                    isTempExceeded ? 'bg-error-bg text-error-custom border border-error-custom/30 animate-pulse' : 'bg-success-bg/40 text-success-custom dark:bg-[#7cf994]/20 dark:text-[#7cf994]'
                  }`}>
                    {isTempExceeded ? 'High Temp Warning' : 'Safe Range'}
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-3xl">
                {isTempExceeded ? 'thermostat_carbon' : 'device_thermostat'}
              </span>
            </div>

            {/* Configurable Threshold Slider */}
            <div className="pt-2 border-t border-white/10">
              <div className="flex justify-between text-xs font-bold mb-1">
                <span>Configure High Temp Threshold</span>
                <span className="font-mono">{threshold}°C</span>
              </div>
              <input
                type="range"
                min="30"
                max="50"
                value={threshold}
                onChange={e => onUpdateSettings({ tempThreshold: parseInt(e.target.value) })}
                className="w-full h-1 bg-white/20 rounded-sm appearance-none cursor-pointer accent-white dark:accent-[#7cf994]"
              />
              <div className="flex justify-between text-[9px] opacity-75 mt-0.5">
                <span>30°C</span>
                <span>50°C</span>
              </div>
            </div>

            {/* Warning Message */}
            {isTempExceeded && (
              <div className="bg-error-custom text-white p-3 rounded-sm text-xs font-bold flex items-center gap-2 animate-bounce">
                <span className="material-symbols-outlined text-sm">warning</span>
                <span>CRITICAL: High Temp limit exceeded! Check enclosure fan.</span>
              </div>
            )}
          </div>
          <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
        </section>
      )}

      {/* Diagnostics Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {hardware.map((hw, idx) => {
          const isTesting = currentTestingIndex === idx;
          let badgeColor = 'bg-success-bg/50 text-success-custom dark:bg-[#7cf994]/20 dark:text-[#7cf994] border border-success-custom/10';
          let borderColor = 'border-border-custom dark:border-slate-800';
          let iconBg = 'bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] border border-accent/10';

          if (hw.status === 'Warning') {
            badgeColor = 'bg-amber-100 text-amber-850 dark:bg-amber-950/20 dark:text-amber-450 border border-amber-500/20';
            borderColor = 'border-amber-500/40';
            iconBg = 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-500/10';
          } else if (hw.status === 'Offline') {
            badgeColor = 'bg-error-bg text-error-custom dark:bg-red-950/20 dark:text-red-400 border border-error-custom/25';
            borderColor = 'border-error-custom/30';
            iconBg = 'bg-error-bg dark:bg-red-950/30 text-error-custom dark:text-red-400 border border-error-custom/15';
          }

          if (isTesting) {
            badgeColor = 'bg-accent text-white animate-pulse border border-accent/20';
            borderColor = 'border-accent dark:border-[#7cf994]';
          }

          let iconSymbol = 'settings_motion_mode';
          if (hw.name.includes('RTC')) iconSymbol = 'schedule';
          else if (hw.name.includes('IR')) iconSymbol = 'visibility_off';
          else if (hw.name.includes('Speaker')) iconSymbol = 'volume_up';
          else if (hw.name.includes('OLED')) iconSymbol = 'monitor';
          else if (hw.name.includes('WiFi')) iconSymbol = 'wifi';
          else if (hw.name.includes('REST')) iconSymbol = 'api';

          return (
            <div
              key={hw.id}
              className={`card-glass p-4 flex flex-col justify-between min-h-[150px] border transition-all ${borderColor} ${
                isTesting ? 'ring-2 ring-accent/20 bg-accent-light/10 scale-[1.01]' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-sm ${iconBg} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-xl">{iconSymbol}</span>
                </div>
                <span className={`px-2.5 py-0.5 font-bold text-[9px] rounded-sm uppercase tracking-wider ${badgeColor}`}>
                  {isTesting ? 'Testing' : hw.status}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold leading-none">{hw.name}</h3>
                <p className="text-[11px] text-muted dark:text-slate-400 mt-1.5">{hw.description}</p>
              </div>

              {hw.status === 'Offline' ? (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => onResetComponent(hw.id)}
                  className="mt-3 w-full py-1.5 bg-error-custom text-white font-bold text-xs rounded-sm active:scale-95 transition-all shadow-md hover:bg-error-custom/90 disabled:opacity-50 cursor-pointer"
                >
                  Reset Controller
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => onTestComponent(hw.id)}
                  className={`mt-3 w-full py-1.5 border font-semibold text-xs rounded-sm active:scale-95 transition-all disabled:opacity-50 cursor-pointer ${
                    hw.status === 'Warning'
                      ? 'border-amber-500 text-amber-700 hover:bg-amber-50'
                      : 'border-accent text-accent hover:bg-accent-light dark:text-[#7cf994] dark:border-[#7cf994]/50 dark:hover:bg-slate-800'
                  }`}
                >
                  {isTesting ? 'Testing...' : 'Test Module'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Decorative Divider */}
      <div className="flex items-center gap-3.5 my-6">
        <div className="h-px bg-border-custom dark:bg-slate-800 flex-grow"></div>
        <span className="text-[10px] text-muted dark:text-slate-400 uppercase tracking-widest font-mono">Hardware Revision V2.4</span>
        <div className="h-px bg-border-custom dark:bg-slate-800 flex-grow"></div>
      </div>

      {/* Large button: Run Full Diagnostic */}
      <footer className="pt-2">
        <button
          type="button"
          disabled={isRunning}
          onClick={handleRunAll}
          className={`w-full h-14 bg-accent hover:bg-accent-hover text-white font-bold rounded-sm shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer dark:bg-accent dark:hover:bg-accent-hover ${
            isRunning ? 'opacity-70 cursor-not-allowed' : ''
          }`}
        >
          {isRunning ? (
            <>
              <span>Running System Diagnostic...</span>
              <span className="material-symbols-outlined animate-spin text-lg">sync</span>
            </>
          ) : (
            <>
              <span>Run Full Diagnostic</span>
              <span className="material-symbols-outlined text-lg">sync</span>
            </>
          )}
        </button>
      </footer>
    </div>
  );
}
