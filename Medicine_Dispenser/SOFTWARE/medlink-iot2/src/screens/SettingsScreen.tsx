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

  return (
    <div className="space-y-6 pt-2 text-[#111c2d] dark:text-white">
      {/* Hero Section / Dispenser Hub Status */}
      <section className="bg-white dark:bg-slate-800 border border-[#c3c6d7]/30 dark:border-slate-700/50 shadow-sm rounded-2xl p-5 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold">Dispenser Status</h2>
          <p className={`text-xs font-semibold flex items-center gap-1 mt-1 ${config.connected ? 'text-[#006e2d] dark:text-[#7cf994]' : 'text-[#ba1a1a] dark:text-red-400'}`}>
            <span className="material-symbols-outlined text-[15px] fill-icon">
              {config.connected ? 'check_circle' : 'error'}
            </span>
            <span>{config.connected ? 'Connected & Active' : 'Offline'}</span>
          </p>
        </div>

        {/* Battery widget - show only when supported */}
        {config.batterySupported && (
          <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15.915" fill="none" stroke="#e7eeff" strokeWidth="3" className="dark:stroke-slate-700" />
              <circle
                cx="18"
                cy="18"
                r="15.915"
                fill="none"
                stroke="#2563eb"
                strokeWidth="3"
                strokeDasharray={`${config.battery} 100`}
                strokeLinecap="round"
                className="dark:stroke-[#7cf994]"
              />
            </svg>
            <span className="absolute text-[10px] font-mono font-bold text-[#2563eb] dark:text-[#7cf994]">{config.battery}%</span>
          </div>
        )}
      </section>

      {/* Settings Groups: Bento Layout Inspired */}
      <div className="grid grid-cols-1 gap-6">
        {/* Device Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-[#737686] dark:text-slate-400">
            <span className="material-symbols-outlined text-base">devices</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Device Hardware</h3>
          </div>

          <div className="space-y-2.5">
            {/* WiFi Config */}
            <button
              onClick={() => onNavigate('wifi-setup')}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 hover:bg-[#f0f3ff] dark:hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#2563eb] text-white flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">wifi</span>
                </div>
                <div>
                  <div className="text-xs font-bold">WiFi Configuration</div>
                  <div className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">{config.ssid || 'Not Configured'}</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#737686] text-sm">chevron_right</span>
            </button>

            {/* Firmware Version */}
            <div className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-350 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">system_update</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Firmware Version</div>
                  <div className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">{config.firmware}</div>
                </div>
              </div>
              <span className="px-2.5 py-0.5 bg-[#7cf994] text-[#007230] rounded-full text-[9px] font-bold uppercase tracking-wider">
                Latest
              </span>
            </div>

            {/* Restart Device */}
            <button
              onClick={onRestartDevice}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 hover:bg-[#ffdad6]/20 transition-colors text-left group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#ffdad6]/40 text-[#ba1a1a] flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">restart_alt</span>
                </div>
                <div>
                  <div className="text-xs font-bold group-hover:text-[#ba1a1a] transition-colors">
                    Restart Dispenser
                  </div>
                  <div className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">Reboot physical hardware hub</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#737686] text-sm">chevron_right</span>
            </button>
          </div>
        </section>

        {/* App Settings */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-[#737686] dark:text-slate-400">
            <span className="material-symbols-outlined text-base">settings</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider">Application Settings</h3>
          </div>

          <div className="space-y-2.5">
            {/* Visual Theme Selection */}
            <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 space-y-3">
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-350 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">dark_mode</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Appearance Theme</div>
                  <p className="text-[9px] text-[#737686] dark:text-slate-400 mt-0.5">Adjust visual theme styling</p>
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
                      className={`py-2 text-[10px] font-bold rounded-lg border text-center transition-all ${
                        settings.theme === themeOpt
                          ? 'bg-[#004ac6] border-[#004ac6] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-700 border-[#cbd5e1] dark:border-slate-600 text-[#434655] dark:text-white hover:bg-[#f0f3ff] dark:hover:bg-slate-600'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Expandable Notifications Alerts Checkboxes */}
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 overflow-hidden transition-all">
              <button
                onClick={() => setExpandNotifications(!expandNotifications)}
                className="w-full flex items-center justify-between p-4 text-left hover:bg-[#f0f3ff] dark:hover:bg-slate-700 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-350 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">notifications_active</span>
                  </div>
                  <div>
                    <div className="text-xs font-bold">Notifications &amp; Alerts</div>
                    <div className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">Customize push configurations</div>
                  </div>
                </div>
                <span className="material-symbols-outlined text-[#737686] transition-transform duration-300" style={{ transform: expandNotifications ? 'rotate(90deg)' : 'none' }}>
                  chevron_right
                </span>
              </button>

              {expandNotifications && (
                <div className="px-5 pb-4 space-y-3 pt-1 border-t border-[#cbd5e1]/10">
                  {notificationTypes.map(nt => (
                    <label key={nt.key} className="flex items-center justify-between py-1.5 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-750 px-2 rounded-lg transition-colors">
                      <span className="text-xs text-[#434655] dark:text-slate-300 font-medium">{nt.label}</span>
                      <input
                        type="checkbox"
                        checked={!!settings.notifications?.[nt.key]}
                        onChange={e => handleNotificationChange(nt.key, e.target.checked)}
                        className="w-4 h-4 rounded text-[#004ac6] border-slate-300 dark:border-slate-650 focus:ring-[#004ac6]"
                      />
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Sound Test check */}
            <button
              onClick={async () => {
                await fetch(`${settings.esp32Ip.startsWith('http') ? settings.esp32Ip : 'http://' + settings.esp32Ip}/api/v1/test/audio`, { method: 'POST' }).catch(() => {});
                nativeAlert('Dispenser speaker audio buzzer chime test executed.');
              }}
              className="w-full flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 hover:bg-[#f0f3ff] dark:hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-350 flex items-center justify-center">
                  <span className="material-symbols-outlined text-lg">volume_up</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Speaker Alarm Chimes</div>
                  <div className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">Test speaker chime alert command</div>
                </div>
              </div>
              <span className="material-symbols-outlined text-[#737686] text-sm">chevron_right</span>
            </button>
          </div>
        </section>

        {/* System Info Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2 px-1 text-[#737686] dark:text-slate-400">
            <span className="material-symbols-outlined text-base">info</span>
            <h3 className="text-[10px] font-bold uppercase tracking-wider">System Information</h3>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* About Nav */}
            <button
              onClick={() => onNavigate('about')}
              className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 hover:bg-[#f0f3ff] dark:hover:bg-slate-700 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-350 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">help</span>
                </div>
                <div>
                  <div className="text-xs font-bold">About Project</div>
                  <div className="text-[9px] text-[#737686] dark:text-slate-400 mt-0.5">Developed Team</div>
                </div>
              </div>
            </button>

            {/* Developer Mode Display */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-350 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-base">code</span>
                </div>
                <div>
                  <div className="text-xs font-bold">Developer Mode</div>
                  <div className={`text-[9px] font-bold mt-0.5 ${settings.isDeveloperMode ? 'text-[#006e2d] dark:text-[#7cf994]' : 'text-red-650'}`}>
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
                  className="text-[9px] bg-red-100 text-red-700 px-2 py-0.5 rounded font-bold"
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
            <div className="flex items-center gap-2 px-1 text-[#737686] dark:text-slate-400">
              <span className="material-symbols-outlined text-base">build</span>
              <h3 className="text-[10px] font-bold uppercase tracking-wider">Developer Tools</h3>
            </div>

            <div className="space-y-2.5">
              {/* API Mode selection */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 space-y-3">
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-355 flex items-center justify-center">
                    <span className="material-symbols-outlined text-lg">api</span>
                  </div>
                  <div className="flex-grow">
                    <div className="text-xs font-bold">API Communication Mode</div>
                    <p className="text-[9px] text-[#737686] dark:text-slate-400 mt-0.5">Determine API request destination</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 pt-1">
                  {(['MOCK', 'SIMULATOR', 'REAL_DEVICE'] as ApiMode[]).map(mode => (
                    <button
                      key={mode}
                      onClick={() => onUpdateSettings({ apiMode: mode })}
                      className={`py-2 text-[10px] font-bold rounded-lg border text-center transition-all ${
                        settings.apiMode === mode
                          ? 'bg-[#004ac6] border-[#004ac6] text-white shadow-sm'
                          : 'bg-white dark:bg-slate-700 border-[#cbd5e1] dark:border-slate-600 text-[#434655] dark:text-white hover:bg-[#f0f3ff] dark:hover:bg-slate-600'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* ESP32 IP Configuration */}
              <div className="p-4 bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-[#c3c6d7]/20 dark:border-slate-700/30 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#737686] dark:text-slate-355 flex items-center justify-center">
                      <span className="material-symbols-outlined text-lg">dns</span>
                    </div>
                    <div>
                      <div className="text-xs font-bold">ESP32 Hub IP Address</div>
                      <div className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">Endpoint for REAL_DEVICE requests</div>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={ipInput}
                    onChange={(e) => setIpInput(e.target.value)}
                    placeholder="e.g. 192.168.4.1"
                    className="flex-grow h-10 px-3 rounded-lg border border-[#cbd5e1] dark:border-slate-600 bg-white dark:bg-slate-700 text-xs font-mono text-[#111c2d] dark:text-white focus:border-[#004ac6] outline-none"
                  />
                  <button
                    onClick={() => {
                      onUpdateSettings({ esp32Ip: ipInput });
                    }}
                    className="px-4 bg-[#e7eeff] dark:bg-slate-700 hover:bg-[#dee8ff] dark:hover:bg-slate-600 text-[#004ac6] dark:text-[#7cf994] border border-[#004ac6]/10 dark:border-slate-600 rounded-lg text-xs font-bold transition-all active:scale-95"
                  >
                    Save
                  </button>
                </div>
              </div>

              {/* Hardware Simulator navigation button */}
              <button
                onClick={() => onNavigate('hardware-simulator')}
                className="w-full flex items-center justify-between p-4 bg-[#263143] text-white rounded-xl shadow-sm border border-[#434655]/50 hover:bg-[#324057] transition-colors text-left group"
              >
                <div className="flex items-center gap-3.5">
                  <div className="w-10 h-10 rounded-full bg-[#fbbf24] text-[#111c2d] flex items-center justify-center">
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
        <span className="material-symbols-outlined text-2xl text-[#004ac6] dark:text-white">medical_services</span>
        <p className="text-[10px] font-semibold mt-1">MedLink IoT • Patient Safety First</p>
      </footer>
    </div>
  );
}
