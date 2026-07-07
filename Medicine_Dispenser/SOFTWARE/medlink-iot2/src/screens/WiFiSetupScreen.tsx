import React, { useState } from 'react';
import { nativeAlert } from '../utils/dialogs';

interface WiFiSetupViewProps {
  onSaveConfig: (ssid: string, password?: string) => Promise<{ success: boolean; ipAddress: string }>;
  onNavigate: (screen: string) => void;
  currentSSID: string;
}

export default function WiFiSetupView({
  onSaveConfig,
  onNavigate,
  currentSSID
}: WiFiSetupViewProps) {
  const [ssid, setSsid] = useState(currentSSID || 'Home_Network_2.4G');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'Disconnected' | 'Connecting' | 'Connected' | 'Failed'>('Disconnected');
  const [assignedIp, setAssignedIp] = useState('');
  const [activeBars, setActiveBars] = useState(1);

  const handleConnect = async () => {
    if (!ssid.trim()) {
      nativeAlert('Please enter a network SSID name.');
      return;
    }

    setStatus('Connecting');
    setAssignedIp('');
    setActiveBars(0);

    // Sequence animation: light up signal bars
    let currentBar = 1;
    const interval = setInterval(() => {
      setActiveBars(currentBar);
      currentBar++;
      if (currentBar > 4) {
        clearInterval(interval);
      }
    }, 200);

    try {
      const result = await onSaveConfig(ssid, password);
      if (result && result.success) {
        setStatus('Connected');
        setAssignedIp(result.ipAddress);
        setActiveBars(4);
      } else {
        setStatus('Failed');
        setActiveBars(1);
        nativeAlert('WiFi connection attempt timed out or SSID/Password was incorrect.');
      }
    } catch (err: any) {
      setStatus('Failed');
      setActiveBars(1);
      nativeAlert(err.message || 'Connection failed.');
    }
  };

  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Back navigation */}
      <div>
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-accent dark:text-[#7cf994] font-bold cursor-pointer hover:underline"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
      </div>

      {/* Connection Status Banner */}
      <section className="card-glass p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-muted dark:text-slate-400 tracking-wider">Connection Status</span>
            <h2
              className={`text-lg font-bold mt-1.5 flex items-center gap-1.5 transition-all ${
                status === 'Connected' ? 'text-success-custom dark:text-[#7cf994]' : 
                status === 'Connecting' ? 'text-accent dark:text-blue-400' : 'text-error-custom dark:text-red-400'
              }`}
            >
              <span className={`material-symbols-outlined ${status === 'Connecting' ? 'animate-spin' : ''}`}>
                {status === 'Connected' ? 'check_circle' : 
                 status === 'Connecting' ? 'sync' : 'error'}
              </span>
              <span>{status}</span>
            </h2>
          </div>

          {/* Graphical Signal Bars */}
          <div className="flex items-end gap-1 h-8">
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 1 ? (status === 'Connected' ? 'bg-success-custom' : 'bg-accent dark:bg-[#7cf994]') : 'bg-border-custom dark:bg-slate-700'} h-[25%]`}></div>
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 2 ? (status === 'Connected' ? 'bg-success-custom' : 'bg-accent dark:bg-[#7cf994]') : 'bg-border-custom dark:bg-slate-700'} h-[50%]`}></div>
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 3 ? (status === 'Connected' ? 'bg-success-custom' : 'bg-accent dark:bg-[#7cf994]') : 'bg-border-custom dark:bg-slate-700'} h-[75%]`}></div>
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 4 ? (status === 'Connected' ? 'bg-success-custom' : 'bg-accent dark:bg-[#7cf994]') : 'bg-border-custom dark:bg-slate-700'} h-[100%]`}></div>
          </div>
        </div>

        <p className="text-xs text-muted dark:text-slate-300 leading-relaxed">
          {status === 'Connected' 
            ? `Successfully connected to ${ssid}. The dispenser endpoint IP is resolved to ${assignedIp}.`
            : status === 'Connecting'
            ? `Pinging smart hub to link SSID "${ssid}"... please wait up to 10 seconds.`
            : 'Configure your network credentials below to provision the Smart Dispenser Hub.'}
        </p>
      </section>

      {/* Input Form Fields */}
      <section className="space-y-4">
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-muted dark:text-slate-400 mb-1.5 ml-1" htmlFor="ssid">
              Network Name (SSID)
            </label>
            <div className="relative">
              <input
                id="ssid"
                type="text"
                disabled={status === 'Connecting'}
                value={ssid}
                onChange={e => setSsid(e.target.value)}
                placeholder="Network SSID name..."
                className="input-custom"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent dark:hover:text-[#7cf994] cursor-pointer"
                onClick={() => setSsid('Home_Network_2.4G')}
              >
                <span className="material-symbols-outlined text-lg">wifi_find</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-muted dark:text-slate-400 mb-1.5 ml-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                disabled={status === 'Connecting'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password..."
                className="input-custom"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-accent dark:hover:text-[#7cf994] cursor-pointer"
                onClick={() => setShowPassword(!showPassword)}
              >
                <span className="material-symbols-outlined text-lg">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleConnect}
          disabled={status === 'Connecting'}
          className="w-full h-14 bg-accent hover:bg-accent-hover text-white rounded-sm font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6 cursor-pointer"
        >
          {status === 'Connecting' ? (
            <>
              <span>Provisioning Device WiFi...</span>
              <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
            </>
          ) : status === 'Connected' ? (
            <>
              <span>Provisioned Successfully</span>
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </>
          ) : (
            <>
              <span>Link Network Credentials</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </>
          )}
        </button>
      </section>

      {/* Support footer help */}
      <footer className="pt-4 text-center">
        <button
          type="button"
          onClick={() => nativeAlert('Ensure that the hardware module has been powered on and is operating in softAP mode.')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-sm hover:bg-accent-light dark:hover:bg-slate-800 text-accent dark:text-[#7cf994] text-xs font-bold transition-colors cursor-pointer"
        >
          <span className="material-symbols-outlined text-sm">help</span>
          <span>Trouble connecting?</span>
        </button>
      </footer>
    </div>
  );
}
