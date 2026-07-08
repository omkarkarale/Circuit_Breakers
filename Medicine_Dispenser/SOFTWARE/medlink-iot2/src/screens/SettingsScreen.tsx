import React, { useState } from 'react';
import { DeviceConfig, Settings, ApiMode } from '../types';
import { nativeAlert } from '../utils/dialogs';

interface SettingsViewProps {
  config: DeviceConfig;
  settings: Settings;
  onNavigate: (screen: string) => void;
  onRestartDevice: () => void;
  onUpdateSettings: (settings: Partial<Settings>) => void;
}

// Browser fallback synthesized chimes
function playLocalPreview(soundType: 'chime' | 'ping' | 'alarm', volume: number) {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime((volume / 100) * 0.08, ctx.currentTime);
    gainNode.connect(ctx.destination);

    if (soundType === 'ping') {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.connect(gainNode);
      osc.start();
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.stop(ctx.currentTime + 0.3);
    } else if (soundType === 'chime') {
      const osc1 = ctx.createOscillator();
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      osc1.connect(gainNode);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.15);

      const osc2 = ctx.createOscillator();
      osc2.frequency.setValueAtTime(659.25, ctx.currentTime + 0.15); // E5
      osc2.connect(gainNode);
      osc2.start(ctx.currentTime + 0.15);
      gainNode.gain.setValueAtTime((volume / 100) * 0.08, ctx.currentTime + 0.15);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
      osc2.stop(ctx.currentTime + 0.45);
    } else if (soundType === 'alarm') {
      const beeps = [0, 0.2, 0.4];
      beeps.forEach(delay => {
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(600, ctx.currentTime + delay);
        osc.connect(gainNode);
        osc.start(ctx.currentTime + delay);
        gainNode.gain.setValueAtTime((volume / 100) * 0.1, ctx.currentTime + delay);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + 0.15);
        osc.stop(ctx.currentTime + delay + 0.15);
      });
    }
  } catch (e) {
    console.error('Local synthesized chime failed to play', e);
  }
}

export default function SettingsView({
  config,
  settings,
  onNavigate,
  onRestartDevice,
  onUpdateSettings
}: SettingsViewProps) {
  const [ipInput, setIpInput] = useState(settings.esp32Ip);
  const [expandNotifications, setExpandNotifications] = useState(false);

  const notificationTypes = [
    { key: 'upcomingReminders', label: 'Upcoming medicine reminders' },
    { key: 'dueNow', label: 'Medicine due now' },
    { key: 'missedDoses', label: 'Missed doses' },
    { key: 'lowInventory', label: 'Low medicine inventory (<10 pills)' },
    { key: 'deviceDisconnected', label: 'Device disconnected' },
    { key: 'wifiDisconnected', label: 'Wi-Fi disconnected' },
    { key: 'diagnosticsWarnings', label: 'Diagnostics warnings' },
    { key: 'hardwareFaults', label: 'Hardware faults' }
  ] as const;

  const handleNotificationChange = (key: typeof notificationTypes[number]['key'], checked: boolean) => {
    const updatedNotifications = {
      ...settings.notifications,
      [key]: checked
    };
    onUpdateSettings({ notifications: updatedNotifications });
  };

  // Test the physical hardware buzzer
  const handleTestHardwareSpeaker = async () => {
    try {
      const ip = settings.esp32Ip.startsWith('http') ? settings.esp32Ip : 'http://' + settings.esp32Ip;
      // Send REST API call to Esp32
      await fetch(`${ip}/api/v1/test/audio`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume: settings.speakerVolume })
      }).catch(() => {});
      
      nativeAlert('Buzzer test trigger sent! The physical dispenser speaker will beep now.');
    } catch (_) {}
  };

  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Settings Groups: Bento Layout Inspired */}
      <div className="grid grid-cols-1 gap-6">
        {/* Device Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-muted dark:text-slate-400">
            <span className="material-symbols-outlined text-base font-bold">devices</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Device Hardware</h3>
          </div>

          <div className="space-y-2.5">
            {/* WiFi Config */}
            <button
              onClick={() => onNavigate('wifi-setup')}
              className="w-full flex items-center justify-between p-4 card-glass transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-sm bg-accent text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">wifi</span>
                </div>
                <div>
                  <div className="text-xs font-bold">WiFi Configuration</div>
                  <div className="text-[10px] text-muted dark:text-slate-400 mt-0.5">{config.ssid || 'Not Configured'}</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
            </button>

            {/* Firmware Version */}
            <div className="w-full flex items-center justify-between p-4 card-glass">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center border border-accent/10">
                  <span className="material-symbols-outlined text-lg">system_update</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Firmware Version</div>
                  <div className="text-[10px] text-muted dark:text-slate-400 mt-0.5">{config.firmware}</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-success-bg/60 text-success-custom dark:bg-[#7cf994]/20 dark:text-[#7cf994] rounded-sm text-[9px] font-bold uppercase tracking-wider border border-success-custom/10">
                Latest
              </span>
            </div>

            {/* Restart Device */}
            <button
              onClick={onRestartDevice}
              className="w-full flex items-center justify-between p-4 card-glass hover:bg-error-bg/30 dark:hover:bg-red-950/20 transition-colors text-left group cursor-pointer"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-sm bg-error-bg dark:bg-red-950/30 text-error-custom flex items-center justify-center border border-error-custom/15">
                  <span className="material-symbols-outlined text-lg">restart_alt</span>
                </div>
                <div>
                  <div className="text-xs font-bold group-hover:text-error-custom transition-colors">
                    Restart Dispenser
                  </div>
                  <div className="text-[10px] text-muted dark:text-slate-400 mt-0.5">Reboot physical hardware hub</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-muted text-sm">chevron_right</span>
            </button>
          </div>
        </section>

        {/* Audio Speaker & Chimes Configuration */}
        {config.speakerSupported && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-muted dark:text-slate-400">
              <span className="material-symbols-outlined text-base font-bold">volume_up</span>
              <h3 className="text-[10px] font-bold uppercase tracking-wider">Audio &amp; Sounds</h3>
            </div>

            <div className="card-glass p-5 space-y-4">
              {/* Reminder sounds enabled toggle */}
              <div className="flex justify-between items-center py-1">
                <div>
                  <h4 className="text-xs font-bold">Dispenser Alarms</h4>
                  <p className="text-[10px] text-muted mt-0.5">Enable speaker sounds on dose reminders</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.reminderSoundsEnabled}
                    onChange={(e) => onUpdateSettings({ reminderSoundsEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5.5 bg-slate-350 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-accent dark:peer-checked:bg-[#7cf994]"></div>
                </label>
              </div>

              {/* Notification sound selector */}
              <div className="flex flex-col gap-1.5 pt-1">
                <label className="text-[10px] font-bold text-muted dark:text-slate-400">Chime Alert Style</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['chime', 'ping', 'alarm'] as const).map(soundOpt => {
                    const isActive = settings.notificationSound === soundOpt;
                    return (
                      <button
                        key={soundOpt}
                        type="button"
                        onClick={() => {
                          onUpdateSettings({ notificationSound: soundOpt });
                          playLocalPreview(soundOpt, settings.speakerVolume);
                        }}
                        className={`py-2 text-[10px] font-bold rounded-sm border uppercase transition-all cursor-pointer ${
                          isActive
                            ? 'bg-accent border-accent text-white shadow-sm dark:bg-[#7cf994] dark:border-[#7cf994] dark:text-slate-950'
                            : 'bg-primary/20 border-border-custom dark:border-slate-800 text-muted dark:text-slate-300 hover:bg-accent-light/40 dark:hover:bg-slate-800'
                        }`}
                      >
                        {soundOpt}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Sound Volume Slider */}
              <div className="flex flex-col gap-1.5 pt-1">
                <div className="flex justify-between text-[10px] font-bold text-muted dark:text-slate-400">
                  <span>Alarm Speaker Volume</span>
                  <span className="font-mono">{settings.speakerVolume}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={settings.speakerVolume}
                  onChange={(e) => onUpdateSettings({ speakerVolume: parseInt(e.target.value) })}
                  className="w-full h-1 bg-slate-300/40 rounded-sm appearance-none cursor-pointer accent-accent dark:accent-[#7cf994]"
                />
              </div>

              {/* Audio action controls */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-border-custom dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => playLocalPreview(settings.notificationSound, settings.speakerVolume)}
                  className="py-2.5 border border-border-custom text-muted hover:bg-accent-light/40 dark:border-slate-800 dark:hover:bg-slate-800 rounded-sm text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-bold">volume_up</span>
                  <span>Preview Tone</span>
                </button>
                <button
                  type="button"
                  onClick={handleTestHardwareSpeaker}
                  className="py-2.5 bg-accent-light hover:bg-accent/15 text-accent dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-[#7cf994] rounded-sm text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span className="material-symbols-outlined text-sm font-bold">sensors</span>
                  <span>Test Speaker</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* App Settings */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-muted dark:text-slate-400">
            <span className="material-symbols-outlined text-base font-bold">settings</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Application Settings</h3>
          </div>

          <div className="space-y-2.5">
            {/* Appearance Theme */}
            <div className="p-4 card-glass space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center border border-accent/10">
                  <span className="material-symbols-outlined text-lg">dark_mode</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Appearance Theme</div>
                  <p className="text-[9px] text-muted dark:text-slate-400 mt-0.5">Adjust visual theme styling</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-1">
                {(['system', 'light', 'dark'] as const).map(themeOpt => {
                  const label = 
                    themeOpt === 'system' ? 'System Default' :
                    themeOpt === 'light' ? 'Light' : 'Dark';
                  return (
                    <button
                      key={themeOpt}
                      onClick={() => onUpdateSettings({ theme: themeOpt })}
                      className={`py-2 text-[10px] font-bold rounded-sm border text-center transition-all cursor-pointer ${
                        settings.theme === themeOpt
                          ? 'bg-accent border-accent text-white shadow-sm dark:bg-[#7cf994] dark:border-[#7cf994] dark:text-slate-950'
                          : 'bg-primary/30 dark:bg-slate-800 border-border-custom dark:border-slate-700 text-muted dark:text-white hover:bg-accent-light/50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expandable Notifications Alerts Checkboxes */}
            <div className="card-glass overflow-hidden transition-all">
              <button
                onClick={() => setExpandNotifications(!expandNotifications)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-accent-light/30 dark:hover:bg-slate-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center border border-accent/10">
                    <span className="material-symbols-outlined text-lg">notifications_active</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold">Notifications &amp; Alerts</div>
                    <div className="text-[10px] text-muted dark:text-slate-400 mt-0.5">Customize push configurations</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-muted transition-transform duration-300" style={{ transform: expandNotifications ? 'rotate(90deg)' : 'none' }}>
                  chevron_right
                </span>
              </button>

              {expandNotifications && (
                <div className="px-5 pb-4 space-y-3 pt-1 border-t border-border-custom dark:border-slate-800">
                  {notificationTypes.map(nt => (
                    <label key={nt.key} className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-accent-light/30 dark:hover:bg-slate-850 px-2 rounded-sm transition-colors">
                      <span className="text-xs text-muted dark:text-slate-300 font-medium">{nt.label}</span>
                      <input
                        type="checkbox"
                        checked={!!settings.notifications?.[nt.key]}
                        onChange={e => handleNotificationChange(nt.key, e.target.checked)}
                        className="w-4 h-4 accent-accent cursor-pointer"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* System Info Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-muted dark:text-slate-400">
            <span className="material-symbols-outlined text-base font-bold">info</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider">System Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* About Nav */}
            <button
              onClick={() => onNavigate('about')}
              className="flex items-center justify-between p-4 card-glass transition-colors text-left cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center shrink-0 border border-accent/10">
                  <span className="material-symbols-outlined text-base">help</span>
                </div>
                <div>
                  <div className="text-xs font-bold">About Project</div>
                  <div className="text-[9px] text-muted dark:text-slate-400 mt-0.5">Developed Team</div>
                </div>
              </div>
            </button>

            {/* Developer Mode Display */}
            <div className="flex items-center justify-between p-4 card-glass">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center shrink-0 border border-accent/10">
                  <span className="material-symbols-outlined text-base">code</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Developer Mode</div>
                  <div className={`text-[9px] font-bold mt-0.5 ${settings.isDeveloperMode ? 'text-success-custom' : 'text-error-custom dark:text-red-400'}`}>
                    {settings.isDeveloperMode ? 'Enabled' : 'Disabled'}
                  </div>
                </div>
              </div>
              {settings.isDeveloperMode && (
                <button 
                  onClick={() => {
                    onUpdateSettings({ isDeveloperMode: false });
                    nativeAlert('Developer Tools disabled successfully.');
                  }}
                  className="text-[9px] bg-error-bg text-error-custom px-2 py-0.5 rounded-sm font-bold cursor-pointer hover:bg-error-custom hover:text-white dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
                >
                  Mute
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Developer Tools Section */}
        {settings.isDeveloperMode && (
          <section className="space-y-3">
            <div className="flex items-center gap-2 px-1 text-muted dark:text-slate-400">
              <span className="material-symbols-outlined text-base font-bold">build</span>
              <h3 className="text-[10px] font-bold uppercase tracking-wider">Developer Tools</h3>
            </div>

            <div className="space-y-2.5">
              {/* API Mode selection */}
              <div className="p-4 card-glass space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center border border-accent/10">
                    <span className="material-symbols-outlined text-lg">api</span>
                  </div>
                  <div className="flex-grow">
                    <div className="text-xs font-bold">API Communication Mode</div>
                    <p className="text-[9px] text-muted dark:text-slate-400 mt-0.5">Determine API request destination</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['MOCK', 'SIMULATOR', 'REAL_DEVICE'] as ApiMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => onUpdateSettings({ apiMode: mode })}
                      className={`py-2 text-[10px] font-bold rounded-sm border text-center transition-all cursor-pointer ${
                        settings.apiMode === mode
                          ? 'bg-accent border-accent text-white shadow-sm dark:bg-[#7cf994] dark:border-[#7cf994] dark:text-slate-950'
                          : 'bg-primary/30 dark:bg-slate-800 border-border-custom dark:border-slate-700 text-muted dark:text-white hover:bg-accent-light/50 dark:hover:bg-slate-700'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* ESP32 IP Configuration */}
              <div className="p-4 card-glass space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-sm bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center border border-accent/10">
                      <span className="material-symbols-outlined text-lg">dns</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold">ESP32 Hub IP Address</div>
                      <div className="text-[10px] text-muted dark:text-slate-400 mt-0.5">Endpoint for REAL_DEVICE requests</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    placeholder="e.g. 192.168.4.1"
                    className="input-custom flex-grow"
                  />
                  <button
                    onClick={() => {
                      onUpdateSettings({ esp32Ip: ipInput });
                    }}
                    className="px-4 bg-accent-light dark:bg-slate-800 hover:bg-accent hover:text-white text-accent dark:text-[#7cf994] border border-accent/15 rounded-sm text-xs font-bold transition-all active:scale-95 cursor-pointer"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Hardware Simulator navigation button */}
              <button
                onClick={() => onNavigate('hardware-simulator')}
                className="w-full flex items-center justify-between p-4 bg-[#263143]/90 dark:bg-[#1e293b]/90 text-white rounded-sm border border-slate-700/50 hover:bg-[#324057]/90 transition-colors text-left group cursor-pointer"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-sm bg-[#fbbf24] text-[#111c2d] flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">construction</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">Hardware Simulator</div>
                    <div className="text-[10px] text-white/70 mt-0.5">Test motors, OLED displays &amp; sensor beams</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-white/50 group-hover:text-white text-sm">chevron_right</span>
              </button>
            </div>
          </section>
        )}
      </div>

      {/* Settings Footer Logo */}
      <footer className="mt-8 flex flex-col items-center justify-center opacity-40">
        <span className="material-symbols-outlined text-2xl text-accent dark:text-white">medical_services</span>
        <p className="text-[10px] font-semibold mt-1">MedLink IoT • Patient Safety First</p>
      </footer>
    </div>
  );
}
