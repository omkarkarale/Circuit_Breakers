import React, { useEffect, useState, useRef } from 'react';
import { DeviceConfig } from './types';
import SetupScreen from './views/SetupScreen';
import SettingsScreen from './views/SettingsScreen';
import DashboardView from './views/DashboardScreen';
import MedicinesView from './views/MedicinesScreen';
import DiagnosticsView from './views/DiagnosticsScreen';
import LogsView from './views/LogsScreen';
import DeviceSearchScreen from './views/DeviceSearchScreen';

import AddEditMedicineView from './views/AddEditMedicineScreen';
import { getSavedIp, ApiClient, appendLog } from './services/apiClient';
import { DeviceDiscovery } from './services/DeviceDiscovery';
import { Preferences } from '@capacitor/preferences';
import { applyTheme, registerThemeListener } from './utils/theme';
import { App as CapApp } from '@capacitor/app';
import { Network } from '@capacitor/network';


export default function App() {
  const [screen, setScreen] = useState<string>('search');
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [selectedMedId, setSelectedMedId] = useState<string | null>(null);
  const [config, setConfig] = useState<DeviceConfig>({ connected: false });

  const screenRef = useRef(screen);
  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  // System status clocks
  const [_currentClockTime, setCurrentClockTime] = useState<number>(Date.now());



  // Keep system clock updated
  useEffect(() => {
    const timer = setInterval(() => setCurrentClockTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);



  // Load local theme preferences on startup
  useEffect(() => {
    async function loadPreferences() {
      try {
        // Load and apply theme
        const { value: themeValue } = await Preferences.get({ key: 'theme' });
        applyTheme((themeValue as any) || 'system');

        // Listen to system theme updates
        return registerThemeListener();
      } catch (err) {
        console.error('Failed to load local startup preferences', err);
      }
    }
    
    let cleanup: (() => void) | undefined;
    loadPreferences().then(cb => {
      if (cb) cleanup = cb;
    });

    return () => {
      if (cleanup) cleanup();
    };
  }, []);

  // ─── loadDeviceData ───────────────────────────────────────────────────────
  // Runs on every screen transition.  Uses discoverFull() (saved IP → mDNS →
  // subnet) so a DHCP address change is repaired transparently.
  const loadDeviceData = async () => {
    if (screen === 'search') return;
    try {
      const savedIp = await getSavedIp();
      if (!savedIp) {
        // No device configured at all — stay on setup screen
        return;
      }

      let statusRes;
      try {
        // Fast path: saved IP still works
        statusRes = await ApiClient.getStatus();
        console.log('[App] Loaded device data from saved IP');
        // Sync ESP & Mega clock with phone system clock
        ApiClient.syncTime().catch(err => console.warn('[App] Startup time sync failed:', err));
      } catch {
        console.warn('[App] Saved IP unreachable, running discoverFull() recovery...');
        try {
          // discoverFull() updates the saved IP automatically when it finds
          // the device via mDNS or subnet scan
          const device = await DeviceDiscovery.discoverFull();
          console.log(`[App] Recovery found device at ${device.ip}`);
          statusRes = await ApiClient.getStatus(); // now talks to updated IP
        } catch (discoveryErr) {
          console.error('[App] discoverFull() failed:', discoveryErr);
          setConfig({ connected: false });
          setScreen('setup');
          return;
        }
      }

      const capsRes = await ApiClient.getCapabilities();
      setConfig({
        connected: statusRes.connected,
        strength: statusRes.connected ? 4 : 0,
        batterySupported: false,
        battery: 100,
        tempSupported: false,
        internalTemp: 25.0,
        speakerSupported: capsRes.data?.speaker || false,
        irSupported: capsRes.data?.ir || false,
        rtcSupported: capsRes.data?.rtc || false,
        lcdSupported: capsRes.data?.display || false
      });
    } catch (err) {
      console.error('[App] loadDeviceData error:', err);
    }
  };

  useEffect(() => {
    loadDeviceData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen]);

  // ─── Network change listener ──────────────────────────────────────────────
  // When Android reports a network change (e.g. Wi-Fi switched) try to stay
  // connected by running discoverFull() which heals a stale saved IP.
  useEffect(() => {
    const handleNetworkChange = async () => {
      if (screenRef.current === 'search') {
        console.log('[App] Network status changed — ignoring in search screen');
        return;
      }
      console.log('[App] Network status changed — checking device reachability');
      try {
        const savedIp = await getSavedIp();
        if (!savedIp) {
          setScreen('setup');
          return;
        }

        try {
          // Quick check at the current saved IP
          const res = await ApiClient.checkStatusAtIp(savedIp);
          if (res?.success) {
            console.log('[App] Device still reachable at saved IP after network change');
            loadDeviceData();
            return;
          }
        } catch { /* fall through to full discovery */ }

        console.warn('[App] Saved IP unreachable after network change, running discoverFull()...');
        try {
          const device = await DeviceDiscovery.discoverFull();
          console.log(`[App] Re-discovered device at ${device.ip}`);
          loadDeviceData();
        } catch (err) {
          console.error('[App] discoverFull() after network change failed:', err);
          setScreen('setup');
        }
      } catch (err) {
        console.warn('[App] Network change handler error:', err);
        setScreen('setup');
      }
    };

    const sub = Network.addListener('networkStatusChange', handleNetworkChange);
    return () => {
      sub.then(listener => listener.remove());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle hardware back button behavior across screen/tab views
  useEffect(() => {
    const sub = CapApp.addListener('backButton', () => {
      if (screen === 'home') {
        if (activeTab !== 'dashboard') {
          setActiveTab('dashboard');
        } else {
          CapApp.exitApp();
        }
      } else if (screen === 'setup') {
        CapApp.exitApp();
      } else if (screen === 'search') {
        CapApp.exitApp();
      } else if (screen === 'settings-home') {
        setScreen('home');
      } else if (screen === 'settings-setup') {
        setScreen('setup');
      } else if (screen === 'logs') {
        setScreen('home');
      } else if (screen === 'add-edit') {
        setScreen('home');
        setActiveTab('medicines');
      } else {
        CapApp.exitApp();
      }
    });

    return () => {
      sub.then(listener => listener.remove());
    };
  }, [screen, activeTab]);




  // Custom screen Router
  const renderScreen = () => {
    switch (screen) {
      case 'search':
        return <DeviceSearchScreen onNavigate={setScreen} />;
      case 'setup':
        return <SetupScreen onNavigate={setScreen} />;
      case 'settings-home':
        return <SettingsScreen onNavigate={setScreen} />;
      case 'add-edit':
        return (
          <AddEditMedicineView
            medicineId={selectedMedId}
            onNavigate={(scr, id) => {
              setScreen(scr);
              if (id) setSelectedMedId(id);
            }}
          />
        );
      case 'logs':
        return <LogsView onNavigate={setScreen} />;
      case 'home':
        return (
          <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950">
            {/* Top Bar Navigation */}
            <header className="flex justify-between items-center px-6 py-4 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-1.5 font-sans">
                  <span className="material-symbols-outlined text-teal-700 dark:text-teal-400 fill-icon text-lg">medication</span>
                  <span className="text-2xl font-extrabold tracking-tight text-slate-800 dark:text-white font-sans">MedLink</span>
                </h1>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setScreen('settings-home')}
                  className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 active:scale-95 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
                  aria-label="Settings"
                >
                  <span className="material-symbols-outlined text-lg">settings</span>
                </button>
              </div>
            </header>

            {/* Scrollable Main Content Frame */}
            <main className="flex-1 overflow-y-auto px-6 py-6 pb-24">
              {activeTab === 'dashboard' && (
                <DashboardView onOpenLogs={() => setScreen('logs')} />
              )}
              {activeTab === 'medicines' && (
                <MedicinesView
                  onNavigate={(scr, id) => {
                    setScreen(scr);
                    if (id) setSelectedMedId(id);
                  }}
                />
              )}
              {activeTab === 'diagnostics' && (
                <DiagnosticsView />
              )}

            </main>

            {/* Bottom Tabs Bar */}
            <footer className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-lg flex items-center justify-around z-50 font-sans">
              <button
                type="button"
                onClick={() => setActiveTab('dashboard')}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors cursor-pointer ${
                  activeTab === 'dashboard' ? 'text-teal-650 dark:text-teal-450' : 'text-slate-450 dark:text-slate-500'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${activeTab === 'dashboard' ? 'fill-icon' : ''}`}>home_health</span>
                <span className="text-[9px] font-bold mt-0.5">Home</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('medicines')}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors cursor-pointer ${
                  activeTab === 'medicines' ? 'text-teal-650 dark:text-teal-450' : 'text-slate-450 dark:text-slate-500'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${activeTab === 'medicines' ? 'fill-icon' : ''}`}>medical_services</span>
                <span className="text-[9px] font-bold mt-0.5">Slots</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('diagnostics')}
                className={`flex flex-col items-center justify-center w-16 h-full transition-colors cursor-pointer ${
                  activeTab === 'diagnostics' ? 'text-teal-650 dark:text-teal-450' : 'text-slate-450 dark:text-slate-500'
                }`}
              >
                <span className={`material-symbols-outlined text-xl ${activeTab === 'diagnostics' ? 'fill-icon' : ''}`}>construction</span>
                <span className="text-[9px] font-bold mt-0.5">Diagnostics</span>
              </button>


            </footer>
          </div>
        );
      default:
        return <SetupScreen onNavigate={setScreen} />;
    }
  };

  return <div className="h-full select-none">{renderScreen()}</div>;
}
