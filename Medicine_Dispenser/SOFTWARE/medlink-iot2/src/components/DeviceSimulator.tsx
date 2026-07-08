import React, { useEffect, useState } from 'react';
import { VirtualESP32, SimulatorState } from '../services/VirtualESP32';
import { LocalStorageService } from '../services/LocalStorageService';
import { useApp } from '../hooks/useApp';

export default function DeviceSimulator() {
  const { takePill: onTakePill, cancelDispense: onCancelDispense } = useApp();
  const [simState, setSimState] = useState<SimulatorState>(() => VirtualESP32.getgetState());

  useEffect(() => {
    const unsubscribe = VirtualESP32.subscribe(() => {
      setSimState({ ...VirtualESP32.getgetState() });
    });
    return unsubscribe;
  }, []);

  const formatClockTime = (timestamp: number): string => {
    const d = new Date(timestamp);
    const h = String(d.getHours()).padStart(2, '0');
    const m = String(d.getMinutes()).padStart(2, '0');
    const s = String(d.getSeconds()).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const formatUptime = (secs: number): string => {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    return `${h}h ${m}m ${s}s`;
  };

  // Map high-level state to OLED message
  const getOledText = () => {
    switch (simState.oledState) {
      case 'POWER_OFF':
        return 'OLED: [ OFF ]';
      case 'BOOTING':
        return 'ESP32 BOOTING...';
      case 'CONNECTING_WIFI':
        return 'WIFI CONNECTING...';
      case 'SYNCING':
        return 'SYNCING NTP CLOCK';
      case 'DISPENSING':
        return simState.dispensingState 
          ? `DISPENSE Slot #${simState.dispensingState.slot}`
          : 'DISPENSING...';
      case 'ERROR':
        if (simState.wifiLoss) return 'ERROR: NO WI-FI';
        if (simState.motorState === 'JAMMED') return 'ERROR: MOTOR JAM';
        if (simState.rtcFailure) return 'ERROR: RTC FAIL';
        if (simState.irBlockage) return 'ERROR: IR BLOCK';
        return 'ERROR STATE!';
      case 'READY':
      default:
        return 'MEDLINK HUB ONLINE';
    }
  };

  return (
    <div className="space-y-6 max-w-md mx-auto">
      {/* 1. Main Hardware Device Mockup */}
      <div className="bg-[#263143] text-white p-5 rounded-3xl border border-[#434655]/50 shadow-xl space-y-4 relative overflow-hidden">
        {/* ESP32 hardware decal branding */}
        <div className="absolute top-2.5 right-4 font-mono text-[8px] text-white/30 tracking-widest uppercase">
          ESP32-S3 CORE IoT v2.5
        </div>

        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full shrink-0 ${simState.connected && !simState.wifiLoss ? 'bg-[#7cf994] animate-ping' : 'bg-red-500'}`} />
          <h3 className="text-xs font-mono uppercase tracking-widest text-[#7cf994] font-bold">
            Physical Hardware Simulation
          </h3>
        </div>

        {/* Main Dispenser Chassis Frame Mock */}
        <div className="bg-[#111c2d] border border-[#737686]/20 rounded-2xl p-4 space-y-4 shadow-inner relative">
          
          {/* Status Indicators Panel */}
          <div className="flex justify-between items-center bg-[#263143]/40 px-3 py-2 rounded-xl border border-white/5">
            <div className="flex items-center gap-3">
              {/* LED Status Indicator Lights */}
              <div className="flex flex-col items-center">
                <div className={`w-3.5 h-3.5 rounded-full shadow-md transition-all ${
                  simState.oledState === 'ERROR' || simState.motorState === 'JAMMED' ? 'bg-red-500 shadow-red-500/50' :
                  simState.oledState === 'DISPENSING' ? 'bg-blue-400 animate-pulse shadow-blue-400/50' :
                  simState.oledState === 'POWER_OFF' ? 'bg-gray-700' : 'bg-[#7cf994] shadow-[#7cf994]/50'
                }`} />
                <span className="text-[7px] font-mono text-white/50 uppercase mt-1">SYS LED</span>
              </div>

              <div className="flex flex-col items-center">
                <div className={`w-3.5 h-3.5 rounded-full shadow-md transition-all ${
                  simState.motorState === 'ROTATING' ? 'bg-[#fbbf24] shadow-amber-400/50 animate-bounce' :
                  simState.motorState === 'JAMMED' ? 'bg-red-600 shadow-red-500/50' : 'bg-[#dee8ff]/10'
                }`} />
                <span className="text-[7px] font-mono text-white/50 uppercase mt-1">MOTOR</span>
              </div>
            </div>

            {/* Wi-Fi RSSI label */}
            <div className="text-right">
              <p className="text-[8px] font-mono text-[#7cf994] leading-none">
                RSSI: {simState.wifiLoss ? '0dBm (OFF)' : '-42dBm'}
              </p>
              <p className="text-[7px] font-mono text-white/40 uppercase mt-0.5">Antenna Active</p>
            </div>
          </div>

          {/* Simulated OLED micro-controller screen display */}
          <div className="bg-black border-2 border-[#737686]/30 rounded-lg p-3 h-16 font-mono flex flex-col justify-center shadow-inner relative overflow-hidden">
            <div className="absolute inset-0 bg-blue-500/5 pointer-events-none" />
            <div className="flex justify-between items-center text-[8px] text-blue-400 uppercase tracking-widest leading-none">
              <span>OLED SSD1306</span>
              <span>Clock: {formatClockTime(simState.clockTime)}</span>
            </div>
            <p className={`text-xs font-bold tracking-tight mt-1 animate-pulse select-none ${
              simState.oledState === 'ERROR' ? 'text-red-500' : 'text-blue-300'
            }`}>
              {getOledText()}
            </p>
            {simState.dispensingState && (
              <span className="text-[8px] text-blue-300">
                Pills: {simState.dispensingState.pillCount} Slot: A{simState.dispensingState.slot}
              </span>
            )}
          </div>

          {/* Mechanical Actuator Section: Stepper Motor */}
          <div className="flex justify-around items-center py-2 bg-[#263143]/20 rounded-xl border border-white/5">
            {[1, 2, 3].map(slotNum => {
              const isActive = simState.dispensingState?.slot === slotNum;
              const isJammed = simState.motorState === 'JAMMED' && isActive;
              return (
                <div key={slotNum} className="text-center space-y-1">
                  <span className="text-[8px] font-mono text-white/40 uppercase block">Actuator A{slotNum}</span>
                  <div 
                    className={`w-9 h-9 rounded-full border-4 border-dashed flex items-center justify-center transition-all duration-1000 ${
                      isJammed ? 'border-red-500' :
                      isActive ? 'border-[#fbbf24] animate-spin' : 'border-[#dee8ff]/10'
                    }`}
                  >
                    <div className={`w-2.5 h-2.5 rounded-full ${isActive ? 'bg-[#fbbf24]' : 'bg-white/20'}`} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Chute drop area representation */}
          <div className="bg-black/40 border border-[#737686]/10 rounded-xl h-24 relative overflow-hidden flex flex-col justify-end items-center pb-2">
            <span className="absolute top-1.5 text-[8px] font-mono text-white/30 uppercase tracking-wider">
              Dispensing Cup (Chute)
            </span>

            {/* Dropping pills animations */}
            <div className="absolute inset-x-0 top-0 flex justify-center">
              {simState.pillsInChute.map(pill => (
                <div
                  key={pill.id}
                  className="w-5 h-5 rounded-full shadow-lg border-2 border-white/20 flex items-center justify-center text-white/80 font-bold text-[8px] transition-all duration-700 ease-bounce"
                  style={{
                    backgroundColor: pill.color,
                    transform: pill.dropped ? 'translateY(56px) scale(1.1)' : 'translateY(0) scale(0.5)',
                  }}
                >
                  P
                </div>
              ))}
            </div>

            {simState.pillsInChute.length > 0 ? (
              <div className="z-10 flex gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    VirtualESP32.clearPillsInChute();
                    onTakePill();
                  }}
                  className="bg-[#7cf994] hover:bg-[#62df7d] text-[#002109] text-[9px] font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow active:scale-95 transition-all"
                >
                  Take Pill
                </button>
              </div>
            ) : (
              <p className="text-[9px] font-mono text-white/20 select-none italic pb-1">
                Dispense cup is currently empty
              </p>
            )}
          </div>
        </div>

        {/* Control Actions */}
        {simState.dispensingState && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancelDispense}
              className="w-full py-2 bg-[#434655] hover:bg-gray-700 text-white rounded-xl text-[10px] uppercase tracking-wider font-bold transition-all"
            >
              Cancel Dispense
            </button>
          </div>
        )}
      </div>

      {/* 2. Developer Tools Console Section */}
      <div className="bg-white dark:bg-slate-800 border border-[#cbd5e1]/40 dark:border-slate-700/60 shadow-md rounded-3xl p-5 space-y-5 text-[#111c2d] dark:text-white">
        
        {/* Header */}
        <div className="border-b border-[#cbd5e1]/20 pb-3">
          <h3 className="text-sm font-bold flex items-center gap-1.5 uppercase tracking-wider text-[#004ac6] dark:text-[#7cf994]">
            <span className="material-symbols-outlined text-lg">admin_panel_settings</span>
            <span>Developer Twin Console</span>
          </h3>
          <p className="text-[10px] text-[#737686] mt-0.5">Control simulated hardware constraints and clocks</p>
        </div>

        {/* Section A: Simulation & Clocks */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Clock Settings</div>
          
          <div className="bg-[#f0f3ff] dark:bg-slate-700/30 p-3.5 rounded-xl border border-[#cbd5e1]/10 space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-[9px] text-[#737686]">Simulated Local Time</p>
                <p className="text-lg font-mono font-bold">{formatClockTime(simState.clockTime)}</p>
              </div>
              <button
                onClick={() => {
                  VirtualESP32.getgetState().isPaused = !simState.isPaused;
                  VirtualESP32.saveState();
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                  simState.isPaused 
                    ? 'bg-[#7cf994] text-[#007230]' 
                    : 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300'
                }`}
              >
                {simState.isPaused ? 'Resume Clock' : 'Pause Clock'}
              </button>
            </div>

            {/* Time Warp Buttons */}
            <div className="grid grid-cols-5 gap-1 pt-1.5">
              {[
                { label: '+1m', val: 60 * 1000 },
                { label: '+5m', val: 5 * 60 * 1000 },
                { label: '+30m', val: 30 * 60 * 1000 },
                { label: '+1h', val: 60 * 60 * 1000 },
                { label: '+1d', val: 24 * 60 * 60 * 1000 }
              ].map(warp => (
                <button
                  key={warp.label}
                  onClick={() => VirtualESP32.advanceTime(warp.val)}
                  className="py-1 bg-white dark:bg-slate-700 hover:bg-[#cbd5e1]/30 dark:hover:bg-slate-600 border border-[#cbd5e1]/20 dark:border-slate-600 rounded text-[9px] font-mono font-bold active:scale-90"
                >
                  {warp.label}
                </button>
              ))}
            </div>

            {/* Speed Multiplier */}
            <div className="flex justify-between items-center pt-2 border-t border-[#cbd5e1]/10">
              <span className="text-[10px] font-bold text-[#737686]">Ticking Speed</span>
              <div className="flex gap-1">
                {[1, 5, 10, 60, 3600].map(speed => {
                  const label = 
                    speed === 1 ? '1x' :
                    speed === 5 ? '5x' :
                    speed === 10 ? '10x' :
                    speed === 60 ? '1m/s' : '1h/s';
                  return (
                    <button
                      key={speed}
                      onClick={() => {
                        VirtualESP32.getgetState().simulationSpeed = speed;
                        VirtualESP32.saveState();
                      }}
                      className={`px-2 py-0.5 rounded text-[9px] font-bold transition-all ${
                        simState.simulationSpeed === speed
                          ? 'bg-[#004ac6] text-white'
                          : 'bg-white dark:bg-slate-700 text-[#434655] dark:text-white border border-[#cbd5e1]/20'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* Section B: Hardware Failures */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Hardware Fault Injections</div>
          
          <div className="grid grid-cols-2 gap-2.5">
            {/* WiFi Loss */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[#cbd5e1]/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#737686]">wifi_off</span>
                <span className="text-xs font-bold">WiFi Loss</span>
              </div>
              <input
                type="checkbox"
                checked={simState.wifiLoss}
                onChange={(e) => VirtualESP32.setWifiLoss(e.target.checked)}
                className="w-4 h-4 accent-[#004ac6] border-slate-300 rounded"
              />
            </label>

            {/* Motor Jam */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[#cbd5e1]/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#737686]">construction</span>
                <span className="text-xs font-bold">Motor Jam</span>
              </div>
              <input
                type="checkbox"
                checked={simState.motorJam}
                onChange={(e) => VirtualESP32.setMotorJam(e.target.checked)}
                className="w-4 h-4 accent-[#004ac6] border-slate-300 rounded"
              />
            </label>

            {/* Low Battery */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[#cbd5e1]/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#737686]">battery_alert</span>
                <span className="text-xs font-bold">Low Battery (5%)</span>
              </div>
              <input
                type="checkbox"
                checked={simState.lowBattery}
                onChange={(e) => VirtualESP32.setLowBattery(e.target.checked)}
                className="w-4 h-4 accent-[#004ac6] border-slate-300 rounded"
              />
            </label>

            {/* RTC Failure */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[#cbd5e1]/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#737686]">wrong_location</span>
                <span className="text-xs font-bold">RTC Clock Fail</span>
              </div>
              <input
                type="checkbox"
                checked={simState.rtcFailure}
                onChange={(e) => VirtualESP32.setRtcFailure(e.target.checked)}
                className="w-4 h-4 accent-[#004ac6] border-slate-300 rounded"
              />
            </label>

            {/* IR Blockage */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[#cbd5e1]/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#737686]">sensor_door</span>
                <span className="text-xs font-bold">IR Blockage</span>
              </div>
              <input
                type="checkbox"
                checked={simState.irBlockage}
                onChange={(e) => VirtualESP32.setIrBlockage(e.target.checked)}
                className="w-4 h-4 accent-[#004ac6] border-slate-300 rounded"
              />
            </label>

            {/* Storage Full */}
            <label className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-[#cbd5e1]/10 cursor-pointer">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-base text-[#737686]">storage</span>
                <span className="text-xs font-bold">Storage Full</span>
              </div>
              <input
                type="checkbox"
                checked={simState.storageFull}
                onChange={(e) => VirtualESP32.setStorageFull(e.target.checked)}
                className="w-4 h-4 accent-[#004ac6] border-slate-300 rounded"
              />
            </label>
          </div>
        </div>

        {/* Section C: Device Action Buttons */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Device Operations</div>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => VirtualESP32.triggerReboot()}
              className="py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700/50 dark:hover:bg-slate-700 text-xs font-bold rounded-lg transition-colors active:scale-95"
            >
              Restart
            </button>
            <button
              onClick={() => {
                if (confirm('Factory Reset: Clear all inventories, settings, and logs?')) {
                  LocalStorageService.clearAll();
                  VirtualESP32.resetToDefaults();
                  window.location.reload();
                }
              }}
              className="py-2.5 bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-950/40 dark:text-red-300 text-xs font-bold rounded-lg transition-colors active:scale-95"
            >
              Factory Reset
            </button>
            <button
              onClick={() => {
                VirtualESP32.resetToDefaults();
              }}
              className="py-2.5 bg-[#e7eeff] hover:bg-[#dee8ff] text-[#004ac6] text-xs font-bold rounded-lg transition-colors active:scale-95"
            >
              Reset Sim
            </button>
          </div>
        </div>

        {/* Section D: Status & Telemetry Monitor */}
        <div className="space-y-3">
          <div className="text-[10px] font-bold text-[#737686] uppercase tracking-wider">Onboard Metadata Monitor</div>
          
          <div className="grid grid-cols-3 gap-3.5 bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-[#cbd5e1]/10 text-xs font-mono">
            <div>
              <p className="text-[9px] text-[#737686] uppercase">Board Type</p>
              <p className="font-bold truncate mt-0.5 text-[#111c2d] dark:text-blue-300">ESP32-S3</p>
            </div>
            <div>
              <p className="text-[9px] text-[#737686] uppercase">Firmware</p>
              <p className="font-bold truncate mt-0.5 text-[#111c2d] dark:text-blue-300">{simState.firmware}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#737686] uppercase">Free Heap</p>
              <p className="font-bold truncate mt-0.5 text-[#111c2d] dark:text-blue-300">{simState.heap} B</p>
            </div>
            <div>
              <p className="text-[9px] text-[#737686] uppercase">Uptime</p>
              <p className="font-bold truncate mt-0.5 text-[#111c2d] dark:text-blue-300">{formatUptime(simState.uptime)}</p>
            </div>
            <div>
              <p className="text-[9px] text-[#737686] uppercase">CPU Temp</p>
              <p className="font-bold truncate mt-0.5 text-[#111c2d] dark:text-blue-300">{simState.internalTemp} °C</p>
            </div>
            <div>
              <p className="text-[9px] text-[#737686] uppercase">WiFi Signal</p>
              <p className="font-bold truncate mt-0.5 text-[#111c2d] dark:text-blue-300">
                {simState.wifiLoss ? 'Disconnected' : '-42 dBm'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
