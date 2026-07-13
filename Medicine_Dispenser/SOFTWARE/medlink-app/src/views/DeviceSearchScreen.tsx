import React, { useEffect, useRef, useState } from 'react';
import { DiscoveryManager, DiscoveredDevice } from '../services/DiscoveryManager';

interface DeviceSearchScreenProps {
  onNavigate: (screen: string) => void;
}

export default function DeviceSearchScreen({ onNavigate }: DeviceSearchScreenProps) {
  const [searchStatus, setSearchStatus] = useState<'searching' | 'found' | 'not_found'>('searching');
  const [deviceInfo, setDeviceInfo] = useState<DiscoveredDevice | null>(null);
  const [logMessages, setLogMessages] = useState<string[]>(['Starting device discovery...']);
  const [logsExpanded, setLogsExpanded] = useState<boolean>(false);

  const searchActive = useRef(true);

  /** Append a single log line (called from real DiscoveryManager callbacks). */
  const appendLog = (msg: string) => {
    setLogMessages(prev => [...prev, msg]);
  };

  const startSearch = async () => {
    searchActive.current = true;
    setSearchStatus('searching');
    setDeviceInfo(null);
    setLogMessages(['Starting device discovery...']);

    // Start a new session (cancels any previous one)
    const session = DiscoveryManager.startSession();

    try {
      const device = await DiscoveryManager.discoverFull(
        session,
        // Real log callback — each backend stage appends a message
        (msg: string) => {
          if (searchActive.current && !session.cancelled) {
            appendLog(msg);
          }
        },
        // Progress callback — could wire to a progress bar if added later
        (event) => {
          if (searchActive.current && !session.cancelled) {
            appendLog(event.message);
          }
        }
      );

      if (!searchActive.current || session.cancelled) return;

      appendLog(`Connection successful.`);
      appendLog(`Verified MedLink device at ${device.ip}`);
      setDeviceInfo(device);
      setSearchStatus('found');

    } catch (err) {
      if (!searchActive.current || session.cancelled) return;
      console.warn('[DeviceSearchScreen] Discovery failed:', err);

      setSearchStatus('not_found');
      appendLog('Scanning failed.');
      appendLog('No MedLink device responded. Please check your connection.');

      // Check if phone reconnected to ESP AP (meaning Wi-Fi setup failed and ESP is back in AP mode)
      try {
        const onAp = await DiscoveryManager.isPhoneOnMedLinkAp();
        if (onAp) {
          console.log('[DeviceSearchScreen] Phone is on MedLink AP. Setup likely failed. Navigating back to Setup...');
          DiscoveryManager.setWifiSetupFailed(true);
          onNavigate('setup');
        }
      } catch (apErr) {
        console.warn('[DeviceSearchScreen] Failed to check if on AP:', apErr);
      }
    }
  };

  useEffect(() => {
    startSearch();

    return () => {
      searchActive.current = false;
      DiscoveryManager.cancelCurrent();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans select-none animate-fade-in">
      
      {/* Top-Right Settings Shortcut */}
      <div className="absolute top-6 right-6 z-10">
        <button
          type="button"
          onClick={() => onNavigate('setup')}
          className="w-12 h-12 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-transparent text-slate-650 dark:text-slate-350 active:scale-95 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer shadow-sm"
          title="Device Setup"
          aria-label="Device Setup"
        >
          <span className="material-symbols-outlined text-2xl">tune</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-col items-center justify-center flex-1 max-w-sm w-full py-12">
        
        {/* Top Branding Section */}
        <header className="flex flex-col items-center mb-8 text-center shrink-0">
          <div className="w-24 h-24 rounded-2xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center shadow-md shadow-teal-600/10 dark:shadow-none mb-3">
            <span className="material-symbols-outlined text-white fill-icon" style={{ fontSize: '44px' }}>medication</span>
          </div>  
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-800 dark:text-white font-sans">
            MedLink
          </h1>
        </header>

        {/* Card for Search State */}
        <div
          onClick={searchStatus === 'not_found' ? startSearch : undefined}
          className={`w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-md space-y-5 transition-all duration-200
            ${searchStatus === 'not_found' 
              ? 'cursor-pointer hover:border-rose-500/30 dark:hover:border-rose-500/20 hover:shadow-lg hover:scale-[1.01] active:scale-[0.99]' 
              : ''}`}
        >
          {/* Spinner / Success / Failure States */}
          <div className="flex flex-col items-center justify-center py-4">
            {searchStatus === 'searching' && (
              <div className="relative flex items-center justify-center w-24 h-24">
                <div className="absolute inset-0 rounded-full border-2 border-teal-500/10 dark:border-teal-500/5 animate-ping"></div>
                <div className="absolute inset-3 rounded-full border-2 border-teal-500/20 dark:border-teal-500/10 animate-pulse"></div>
                <svg className="w-14 h-14 animate-spin text-teal-650 dark:text-teal-400" viewBox="0 0 50 50" fill="none">
                  <circle className="opacity-20" cx="25" cy="25" r="20" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-80" fill="currentColor" d="M25 5A20 20 0 0145 25h-4A16 16 0 0025 9V5z" />
                </svg>
              </div>
            )}

            {searchStatus === 'found' && (
              <div className="w-20 h-20 rounded-full bg-emerald-50 dark:bg-emerald-950/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-sm animate-fade-in">
                <span className="material-symbols-outlined text-4xl animate-pulse">check_circle</span>
              </div>
            )}

            {searchStatus === 'not_found' && (
              <div className="w-20 h-20 rounded-full bg-rose-50 dark:bg-rose-950/20 flex items-center justify-center text-rose-500 dark:text-rose-400 border border-rose-500/20 shadow-sm animate-fade-in">
                <span className="material-symbols-outlined text-4xl">error</span>
              </div>
            )}
          </div>

          {/* Status Message */}
          <div className="text-center space-y-2">
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 px-2 leading-snug">
              {searchStatus === 'searching' && 'Searching Device...'}
              {searchStatus === 'found' && 'Device Connected Successfully'}
              {searchStatus === 'not_found' && 'Device not found'}
            </h3>
            
            {searchStatus === 'not_found' && (
              <p className="text-[11px] text-slate-450 dark:text-slate-500 font-medium">
                Click anywhere on this panel to retry search.
              </p>
            )}
          </div>

          {/* Live Progress Logs (Collapsible) */}
          <div className="border-t border-slate-100 dark:border-slate-850 pt-4">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation(); // prevent triggering parent div's onClick (retry)
                setLogsExpanded(!logsExpanded);
              }}
              className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 hover:text-slate-655 dark:hover:text-slate-350 transition-colors"
            >
              <span>Logs</span>
              <span className={`material-symbols-outlined text-base transition-transform duration-200 ${logsExpanded ? 'rotate-180' : ''}`}>
                keyboard_arrow_down
              </span>
            </button>
            
            {logsExpanded && (
              <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-xl border border-slate-100 dark:border-slate-850 font-mono text-[10px] text-slate-500 dark:text-slate-400 space-y-1.5 min-h-[84px] max-h-[120px] overflow-y-auto animate-fade-in">
                {logMessages.map((log, idx) => (
                  <div key={idx} className="flex items-start gap-1.5">
                    <span className="text-teal-655 dark:text-teal-400 font-bold select-none">&rsaquo;</span>
                    <span className="break-all leading-normal text-left">{log}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Prominent Enter Button in Bottom-Right Corner */}
      <div className="absolute bottom-6 right-6 z-10">
        <button
          type="button"
          disabled={searchStatus !== 'found'}
          onClick={() => onNavigate('home')}
          className={`px-6 py-3.5 rounded-2xl font-bold text-sm tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer active:scale-95
            ${searchStatus === 'found'
              ? 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white shadow-lg shadow-teal-600/15 dark:shadow-none'
              : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-50'}`}
        >
          <span>Enter</span>
          <span className="text-base font-semibold font-mono">&rarr;</span>
        </button>
      </div>
    </div>

  );
}
