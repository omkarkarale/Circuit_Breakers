import React, { useState } from 'react';
import { HardwareComponent } from '../types';

interface DiagnosticsViewProps {
  hardware: HardwareComponent[];
  onTestComponent: (id: string) => void;
  onResetComponent: (id: string) => void;
  onRunFullDiagnostics: () => Promise<void>;
  internalTemp: number;
}

export default function DiagnosticsView({
  hardware,
  onTestComponent,
  onResetComponent,
  onRunFullDiagnostics,
  internalTemp
}: DiagnosticsViewProps) {
  const [isRunning, setIsRunning] = useState(false);
  const [currentTestingIndex, setCurrentTestingIndex] = useState<number | null>(null);

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
    <div className="space-y-6 pt-2">
      {/* Header Info */}
      <section className="space-y-1">
        <h2 className="text-xl font-bold text-[#111c2d] tracking-tight">System Diagnostics</h2>
        <p className="text-xs text-[#737686]">Engineering level hardware health monitor</p>
      </section>

      {/* Diagnostics Bento-style Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {hardware.map((hw, idx) => {
          const isTesting = currentTestingIndex === idx;
          let badgeColor = 'bg-[#7cf994] text-[#007230]';
          let borderColor = 'border-[#c3c6d7]/30';
          let iconBg = 'bg-[#7cf994]/20 text-[#007230]';

          if (hw.status === 'Warning') {
            badgeColor = 'bg-[#ffddb8] text-[#996100]';
            borderColor = 'border-[#996100]/40';
            iconBg = 'bg-[#ffddb8]/30 text-[#996100]';
          } else if (hw.status === 'Offline') {
            badgeColor = 'bg-[#ffdad6] text-[#93000a]';
            borderColor = 'border-[#ba1a1a]/30';
            iconBg = 'bg-[#ffdad6]/40 text-[#ba1a1a]';
          }

          if (isTesting) {
            badgeColor = 'bg-[#2563eb] text-white animate-pulse';
            borderColor = 'border-[#004ac6]';
          }

          // Map string icon back to custom materials
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
              className={`bg-white rounded-2xl p-4 flex flex-col justify-between min-h-[150px] shadow-sm border transition-all ${borderColor} ${
                isTesting ? 'ring-2 ring-[#004ac6]/20 bg-[#e7eeff]/10 scale-[1.01]' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center shrink-0`}>
                  <span className="material-symbols-outlined text-xl">{iconSymbol}</span>
                </div>
                <span className={`px-2.5 py-0.5 font-bold text-[9px] rounded-full uppercase tracking-wider ${badgeColor}`}>
                  {isTesting ? 'Testing' : hw.status}
                </span>
              </div>

              <div className="mt-4">
                <h3 className="text-sm font-bold text-[#111c2d] leading-none">{hw.name}</h3>
                <p className="text-[11px] text-[#737686] mt-1.5">{hw.description}</p>
              </div>

              {hw.status === 'Offline' ? (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => onResetComponent(hw.id)}
                  className="mt-3 w-full py-1.5 bg-[#ba1a1a] text-white font-bold text-xs rounded-lg active:scale-95 transition-all shadow-sm hover:bg-red-700 disabled:opacity-50"
                >
                  Reset Controller
                </button>
              ) : (
                <button
                  type="button"
                  disabled={isRunning}
                  onClick={() => onTestComponent(hw.id)}
                  className={`mt-3 w-full py-1.5 border font-semibold text-xs rounded-lg active:scale-95 transition-all hover:bg-[#f0f3ff] disabled:opacity-50 ${
                    hw.status === 'Warning'
                      ? 'border-[#996100] text-[#996100]'
                      : 'border-[#004ac6] text-[#004ac6]'
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
        <div className="h-px bg-[#c3c6d7] flex-grow"></div>
        <span className="text-[10px] text-[#737686] uppercase tracking-widest font-mono">Hardware Revision V2.4</span>
        <div className="h-px bg-[#c3c6d7] flex-grow"></div>
      </div>

      {/* Internal temperature status card */}
      <section className="bg-[#2563eb] text-white rounded-2xl p-5 relative overflow-hidden shadow-md">
        <div className="relative z-10">
          <h4 className="text-xs font-semibold text-white/80 uppercase tracking-wider">Dispenser Internal Core</h4>
          <div className="flex items-baseline gap-1.5 mt-2">
            <span className="text-3xl font-bold font-mono">{internalTemp}°C</span>
            <span className="text-xs bg-[#7cf994] text-[#007230] px-2 py-0.5 rounded-full font-bold">Safe Range</span>
          </div>
          <div className="mt-4 w-full bg-white/25 h-1.5 rounded-full overflow-hidden">
            <div className="bg-[#7cf994] h-full w-[45%] rounded-full shadow-[0_0_8px_rgba(124,249,148,0.8)]"></div>
          </div>
        </div>
        <div className="absolute -right-8 -bottom-8 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none"></div>
      </section>

      {/* Large button: Run Full Diagnostic */}
      <footer className="pt-2">
        <button
          type="button"
          disabled={isRunning}
          onClick={handleRunAll}
          className={`w-full h-14 bg-[#004ac6] hover:bg-[#2563eb] text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95 ${
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
