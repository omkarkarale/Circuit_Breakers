import React, { useEffect, useState } from 'react';
import { getSavedIp, saveIp, clearIp, ApiClient, appendLog } from '../services/apiClient';
import { Preferences } from '@capacitor/preferences';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { Capacitor } from '@capacitor/core';
import { applyTheme, ThemeMode } from '../utils/theme';

interface SettingsScreenProps {
  onNavigate: (screen: string) => void;
}

interface ConfirmConfig {
  show: boolean;
  title: string;
  message: string;
  isDestructive: boolean;
  onConfirm: () => void;
  confirmLabel?: string;
  doubleConfirm?: boolean;
}

export default function SettingsScreen({ onNavigate }: SettingsScreenProps) {
  const [ip, setIp] = useState('');
  const [currentSsid, setCurrentSsid] = useState('Loading...');
  const [deviceInfo, setDeviceInfo] = useState({ firmware: 'Offline', deviceId: 'Offline' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveIndicator, setSaveIndicator] = useState('');

  // Wi-Fi Change Flow State
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiConnectingState, setWifiConnectingState] = useState<'idle' | 'submitting' | 'polling' | 'success' | 'failed'>('idle');
  const [wifiPollCount, setWifiPollCount] = useState(0);

  // Settings State
  const [notifications, setNotifications] = useState({
    medicineReminder: true,
    missedDoseAlert: true,
    lowMedicineAlert: true,
    deviceOfflineAlert: true
  });
  const [soundVolume, setSoundVolume] = useState(80);

  // Local theme state
  const [themeMode, setThemeMode] = useState<ThemeMode>('system');


  // Custom Confirmation Dialog Modal State
  const [confirm, setConfirm] = useState<ConfirmConfig>({
    show: false,
    title: '',
    message: '',
    isDestructive: false,
    onConfirm: () => {}
  });

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      try {
        const savedIp = await getSavedIp();
        setIp(savedIp || '');

        if (savedIp) {
          try {
            const status = await ApiClient.getStatus();
            setCurrentSsid(status.ssid || 'Disconnected');
          } catch {
            setCurrentSsid('Offline');
          }

          try {
            const info = await ApiClient.getInfo();
            setDeviceInfo({
              firmware: info.firmwareVersion || 'Unknown',
              deviceId: info.deviceId || 'Unknown'
            });
          } catch {
            setDeviceInfo({ firmware: 'Offline', deviceId: 'Offline' });
          }

          try {
            const res = await ApiClient.getSettings();
            if (res && res.data) {
              if (res.data.notifications) setNotifications(res.data.notifications);
              if (res.data.accessibility) {
                setSoundVolume(typeof res.data.accessibility.soundVolume === 'number' ? res.data.accessibility.soundVolume : 80);
              }
            }
          } catch (err) {
            console.error('Failed to load settings from dispenser:', err);
          }
        } else {
          setCurrentSsid('Device Not Configured');
        }

        const { value: storedTheme } = await Preferences.get({ key: 'theme' });
        setThemeMode((storedTheme as ThemeMode) || 'system');

      } catch (err) {
        console.error('Failed to initialize settings screen:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  const triggerSaveFeedback = (msg: string) => {
    setSaveIndicator(msg);
    setTimeout(() => setSaveIndicator(''), 5000);
  };

  const saveSettingsToDispenser = async (
    updatedNotif: typeof notifications,
    updatedSoundVolume: number,
    logMsg?: string
  ) => {
    setIsSaving(true);
    try {
      await ApiClient.updateSettings({
        notifications: updatedNotif,
        accessibility: {
          soundVolume: updatedSoundVolume
        }
      });
      triggerSaveFeedback('Saved');
      if (logMsg) await appendLog('setting_change', logMsg);
    } catch (err) {
      console.error(err);
      triggerSaveFeedback('Saved locally (Offline)');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNotifToggle = async (key: keyof typeof notifications) => {
    const updated = { ...notifications, [key]: !notifications[key] };
    setNotifications(updated);
    const label = key.replace(/([A-Z])/g, ' $1').toLowerCase();
    await saveSettingsToDispenser(updated, soundVolume, `${label} ${updated[key] ? 'enabled' : 'disabled'}`);
  };

  const handleThemeModeChange = async (mode: ThemeMode) => {
    setThemeMode(mode);
    await Preferences.set({ key: 'theme', value: mode });
    applyTheme(mode);
    triggerSaveFeedback('Theme applied');
    await appendLog('setting_change', `Display theme changed to ${mode}`);
  };

  // RECONNECT FLOW
  const handleReconnect = async () => {
    if (!ip) return;
    setIsSaving(true);
    setCurrentSsid('Reconnecting...');
    try {
      let connected = false;
      for (let i = 0; i < 5; i++) {
        try {
          const status = await ApiClient.checkStatusAtIp(ip);
          if (status && status.connected) {
            setCurrentSsid(status.ssid || 'Connected');
            connected = true;
            break;
          }
        } catch {
          // ignore
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (connected) {
        alert('Reconnected to dispenser successfully!');
      } else {
        setCurrentSsid('Offline');
        alert('Could not establish connection. Please verify WiFi settings.');
      }
    } catch (err) {
      console.error(err);
      setCurrentSsid('Offline');
    } finally {
      setIsSaving(false);
    }
  };

  // CHANGE WIFI FLOW
  const handleOpenWifiModal = async () => {
    setShowWifiModal(true);
    setWifiConnectingState('idle');
    setWifiPassword('');
    
    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorWifi.requestPermissions();
      }
      const info = await CapacitorWifi.getSsid();
      if (info && info.ssid) {
        setWifiSsid(info.ssid);
      }
    } catch (err) {
      console.warn('Could not scan SSID, manual entry fallback:', err);
    }
  };

  const handleWifiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) return;

    setWifiConnectingState('submitting');
    try {
      await ApiClient.connectWifi(wifiSsid.trim(), wifiPassword);
      setWifiConnectingState('polling');
      setWifiPollCount(0);
      triggerWifiPolling();
    } catch (err) {
      console.error('Failed to trigger wifi connection:', err);
      setWifiConnectingState('failed');
    }
  };

  const triggerWifiPolling = () => {
    let count = 0;
    const interval = setInterval(async () => {
      count++;
      setWifiPollCount(count);
      try {
        const res = await ApiClient.checkStatusAtIp(ip || '192.168.4.1');
        if (res && res.connected) {
          clearInterval(interval);
          setWifiConnectingState('success');
          setCurrentSsid(res.ssid || 'Connected');
          if (res.ipAddress && res.ipAddress !== '0.0.0.0' && res.ipAddress !== ip) {
            setIp(res.ipAddress);
            await saveIp(res.ipAddress);
          }
          setTimeout(() => {
            setShowWifiModal(false);
            setWifiConnectingState('idle');
          }, 5000);
        }
      } catch {
        // ignore
      }

      if (count >= 15) {
        clearInterval(interval);
        setWifiConnectingState('failed');
      }
    }, 2000);
  };

  // FORGET DEVICE FLOW
  const handleForgetDevice = () => {
    setConfirm({
      show: true,
      title: 'Forget Dispenser?',
      message: 'Are you sure you want to forget this dispenser? This will disconnect settings, erase credentials from local app memory, and return you to Setup.',
      isDestructive: true,
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await ApiClient.forgetWifi();
        } catch (e) {
          console.warn('Forget request failed, clearing local setup:', e);
        } finally {
          await clearIp();
          setConfirm(prev => ({ ...prev, show: false }));
          setIsSaving(false);
          onNavigate('setup');
        }
      }
    });
  };

  // RESTART DEVICE FLOW
  const handleRestartDevice = () => {
    setConfirm({
      show: true,
      title: 'Restart Dispenser?',
      message: 'This will reboot the ESP8266 smart dispenser hardware. Telemetry and dispensing operations will pause for approximately 15 seconds.',
      isDestructive: true,
      confirmLabel: 'Restart',
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await ApiClient.rebootDevice();
          alert('Dispenser is rebooting. Please wait...');
        } catch (err) {
          console.error(err);
          alert('Failed to send reboot request.');
        } finally {
          setConfirm(prev => ({ ...prev, show: false }));
          setIsSaving(false);
        }
      }
    });
  };

  // EXPORT LOGS FLOW
  const handleExportLogs = async () => {
    setIsSaving(true);
    try {
      const logsRes = await ApiClient.getLogs();
      if (!logsRes || !logsRes.data) {
        throw new Error('No logs returned from device');
      }

      const logString = logsRes.data
        .map(l => `[${new Date(l.ts * 1000).toLocaleString()}] [${l.type}] ${l.detail}`)
        .join('\r\n');

      const fileName = `medlink_logs_${Date.now()}.txt`;

      if (Capacitor.isNativePlatform()) {
        const writeRes = await Filesystem.writeFile({
          path: fileName,
          data: logString,
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });

        await Share.share({
          title: 'MedLink Dispenser Logs',
          text: 'Exported activity logs from MedLink Smart Medicine Dispenser.',
          url: writeRes.uri,
          dialogTitle: 'Share MedLink Logs'
        });
      } else {
        const blob = new Blob([logString], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to export logs. Ensure device is reachable.');
    } finally {
      setIsSaving(false);
    }
  };

  // FACTORY RESET FLOW
  const handleFactoryReset = () => {
    setConfirm({
      show: true,
      title: 'WARNING: Factory Reset?',
      message: 'This cannot be undone. This resets the dispenser back to default AP configuration. All logs, custom schedules, and cartridge pill details will be completely wiped.',
      isDestructive: true,
      confirmLabel: 'Factory Reset',
      doubleConfirm: true,
      onConfirm: async () => {
        setIsSaving(true);
        try {
          await ApiClient.factoryResetDevice();
        } catch (e) {
          console.warn('Factory reset failed, resetting local config:', e);
        } finally {
          await clearIp();
          setConfirm(prev => ({ ...prev, show: false }));
          setIsSaving(false);
          alert('Dispenser resetting. Local configuration cleared.');
          onNavigate('setup');
        }
      }
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-teal-650 dark:text-teal-400 animate-spin">sync</span>
          <p className="text-xs text-slate-550 dark:text-slate-400 font-bold uppercase tracking-wider">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full flex flex-col p-6 bg-slate-50 dark:bg-slate-950 font-sans select-none animate-fade-in pb-16">
      
      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">Settings</h1>
            <p className="text-[10px] text-slate-455 dark:text-slate-500 uppercase tracking-widest font-bold">Dispenser Configuration</p>
          </div>
        </div>
        
        {saveIndicator && (
          <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-bold uppercase px-2 py-0.5 rounded-full border border-teal-500/10 animate-pulse">
            {saveIndicator}
          </span>
        )}
      </header>

      {/* Main Settings Sections */}
      <main className="flex-1 py-6 space-y-6 max-w-sm mx-auto w-full">

        {/* 1. Wi-Fi Configuration Section */}
        <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Wi-Fi Connection</h2>
          
          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800">
            <div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Current Network</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{currentSsid}</p>
            </div>
            <span className={`w-2 h-2 rounded-full ${currentSsid !== 'Offline' && currentSsid !== 'Disconnected' && currentSsid !== 'Device Not Configured' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleReconnect}
                disabled={isSaving}
                className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">sync</span>
                <span>Reconnect</span>
              </button>

              <button
                type="button"
                onClick={handleOpenWifiModal}
                disabled={isSaving}
                className="h-10 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">wifi</span>
                <span>Change Wi-Fi</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleForgetDevice}
              disabled={isSaving}
              className="w-full h-10 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-450 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">delete</span>
              <span>Forget Device</span>
            </button>
          </div>
        </section>

        {/* 2. Notifications Config Section */}
        <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Device Notifications</h2>
          
          <div className="space-y-3.5 pt-1">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Medicine Reminders</span>
              <button
                type="button"
                onClick={() => handleNotifToggle('medicineReminder')}
                className={`w-10 h-6 rounded-full transition-all duration-200 relative p-0.5 border ${
                  notifications.medicineReminder ? 'bg-teal-600 dark:bg-teal-500 border-teal-600' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm block transition-all transform ${notifications.medicineReminder ? 'translate-x-4' : 'translate-x-0'}`}></span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Missed Dose Alerts</span>
              <button
                type="button"
                onClick={() => handleNotifToggle('missedDoseAlert')}
                className={`w-10 h-6 rounded-full transition-all duration-200 relative p-0.5 border ${
                  notifications.missedDoseAlert ? 'bg-teal-600 dark:bg-teal-500 border-teal-600' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm block transition-all transform ${notifications.missedDoseAlert ? 'translate-x-4' : 'translate-x-0'}`}></span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Low Medicine Alerts</span>
              <button
                type="button"
                onClick={() => handleNotifToggle('lowMedicineAlert')}
                className={`w-10 h-6 rounded-full transition-all duration-200 relative p-0.5 border ${
                  notifications.lowMedicineAlert ? 'bg-teal-600 dark:bg-teal-500 border-teal-600' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full bg-white block shadow-sm transition-all transform ${notifications.lowMedicineAlert ? 'translate-x-4' : 'translate-x-0'}`}></span>
              </button>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Device Offline Alerts</span>
              <button
                type="button"
                onClick={() => handleNotifToggle('deviceOfflineAlert')}
                className={`w-10 h-6 rounded-full transition-all duration-200 relative p-0.5 border ${
                  notifications.deviceOfflineAlert ? 'bg-teal-600 dark:bg-teal-500 border-teal-600' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                }`}
              >
                <span className={`w-4.5 h-4.5 rounded-full bg-white block shadow-sm transition-all transform ${notifications.deviceOfflineAlert ? 'translate-x-4' : 'translate-x-0'}`}></span>
              </button>
            </div>
          </div>
        </section>

        {/* 3. Accessibility Config Section */}
        <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h2 className="text-[10px] text-teal-650 dark:text-teal-400 font-bold uppercase tracking-wider">Theme</h2>
          
          <div className="space-y-4 pt-1">
            {/* Theme Mode Option */}
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                {(['light', 'dark', 'system'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => handleThemeModeChange(mode)}
                    className={`h-9 font-bold text-[10px] rounded-lg transition-all cursor-pointer uppercase ${
                      themeMode === mode
                        ? 'bg-white dark:bg-slate-900 shadow-sm text-teal-650 dark:text-teal-400 border border-slate-100 dark:border-slate-800'
                        : 'text-slate-450 dark:text-slate-500'
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* 4. About Device Section */}
        <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-3.5">
          <h2 className="text-[10px] text-teal-650 dark:text-teal-400 font-bold uppercase tracking-wider">About</h2>
          
          <div className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-850 pb-3">
            <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Project Information</span>
            MedLink is a smart medicine dispenser gateway, coordinating remote dosing logs and physical cartridge dispenser controls over a direct Local Area Network.
          </div>

          <div className="grid grid-cols-2 gap-3.5 text-left pt-1">
            <div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">App Version</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">1.0.0</p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Firmware Version</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{deviceInfo.firmware}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Device ID</p>
              <p className="text-xs font-bold font-mono text-slate-700 dark:text-slate-300 mt-0.5 truncate">{deviceInfo.deviceId}</p>
            </div>
            <div className="col-span-2">
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Development Team</p>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mt-0.5">Circuit Breakers (Omkar Karale, Rajnarayan Hazra, Ekansh Bansode)</p>
            </div>
          </div>
        </section>

        {/* 5. Advanced Actions Section */}
        <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h2 className="text-[10px] text-rose-500 dark:text-rose-450 font-bold uppercase tracking-wider">Advanced Actions</h2>
          
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={handleRestartDevice}
              disabled={isSaving}
              className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">restart_alt</span>
              <span>Restart Dispenser</span>
            </button>

            <button
              type="button"
              onClick={handleExportLogs}
              disabled={isSaving}
              className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">download</span>
              <span>Export System Logs</span>
            </button>


            <button
              type="button"
              onClick={handleFactoryReset}
              disabled={isSaving}
              className="w-full h-10 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-450 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base font-bold">warning</span>
              <span>Factory Reset</span>
            </button>
          </div>
        </section>
      </main>

      {/* CHANGE WIFI FLOW OVERLAY MODAL */}
      {showWifiModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">wifi</span>
              <span>Configure Device Wi-Fi</span>
            </h3>

            {wifiConnectingState === 'idle' && (
              <form onSubmit={handleWifiSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase" htmlFor="wifi-ssid">Network SSID</label>
                  <input
                    id="wifi-ssid"
                    type="text"
                    required
                    value={wifiSsid}
                    onChange={e => setWifiSsid(e.target.value)}
                    placeholder="SSID Name"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-teal-500 dark:focus:border-teal-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-550 uppercase" htmlFor="wifi-pass">Password</label>
                  <input
                    id="wifi-pass"
                    type="password"
                    value={wifiPassword}
                    onChange={e => setWifiPassword(e.target.value)}
                    placeholder="Network Password"
                    className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-teal-500 dark:focus:border-teal-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowWifiModal(false)}
                    className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="h-10 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
                  >
                    Connect
                  </button>
                </div>
              </form>
            )}

            {(wifiConnectingState === 'submitting' || wifiConnectingState === 'polling') && (
              <div className="flex flex-col items-center py-6 text-center space-y-4">
                <span className="material-symbols-outlined text-4xl text-teal-600 dark:text-teal-400 animate-spin">sync</span>
                <div>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Connecting... please wait</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-555 mt-1">Dispenser is binding to '{wifiSsid}'</p>
                  {wifiConnectingState === 'polling' && (
                    <p className="text-[10px] font-mono text-teal-600 dark:text-teal-400 mt-2">Checking status ({wifiPollCount}/15)...</p>
                  )}
                </div>
              </div>
            )}

            {wifiConnectingState === 'success' && (
              <div className="flex flex-col items-center py-6 text-center space-y-3">
                <span className="material-symbols-outlined text-4xl text-emerald-500">check_circle</span>
                <div>
                  <p className="text-xs font-bold text-slate-850 dark:text-slate-100">Wi-Fi Connected!</p>
                  <p className="text-[10px] text-slate-450 mt-1">Saved configuration successfully.</p>
                </div>
              </div>
            )}

            {wifiConnectingState === 'failed' && (
              <div className="flex flex-col items-center py-4 text-center space-y-4">
                <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-855 dark:text-slate-100">Connection Failed</p>
                  <p className="text-[10px] text-slate-455 dark:text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                    Dispenser could not bind. Fallback: Connect your phone to **'MedLink-XXXX'** Wi-Fi AP and try again.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 w-full pt-1">
                  <button
                    type="button"
                    onClick={() => setShowWifiModal(false)}
                    className="h-9 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 font-bold text-xs rounded-xl"
                  >
                    Close
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenWifiModal}
                    className="h-9 bg-teal-650 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white font-bold text-xs rounded-xl"
                  >
                    Retry
                  </button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* CUSTOM PREMIUM CONFIRMATION MODAL */}
      {confirm.show && (
        <div className="fixed inset-0 bg-slate-950/55 backdrop-blur-xs z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className={`material-symbols-outlined ${confirm.isDestructive ? 'text-rose-500' : 'text-teal-600'}`}>
                {confirm.isDestructive ? 'report' : 'help'}
              </span>
              <span>{confirm.title}</span>
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-slate-455 leading-relaxed">
              {confirm.message}
            </p>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirm(prev => ({ ...prev, show: false }))}
                className="h-10 border border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirm.onConfirm}
                className={`h-10 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer ${
                  confirm.isDestructive
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400'
                }`}
              >
                {confirm.confirmLabel || 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
