import React, { useState } from 'react';
import { nativeAlert } from '../utils/dialogs';

interface WiFiSetupViewProps {
  onSaveConfig: (ssid: string) => void;
  onNavigate: (screen: string) => void;
  currentSSID: string;
}

export default function WiFiSetupView({
  onSaveConfig,
  onNavigate,
  currentSSID
}: WiFiSetupViewProps) {
  const [ssid, setSsid] = useState(currentSSID || 'Home_Network_5G');
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState<'Disconnected' | 'Connecting' | 'Connected'>('Disconnected');
  const [activeBars, setActiveBars] = useState(1);

  const handleConnect = () => {
    if (!ssid.trim()) {
      nativeAlert('Please enter a network SSID name.');
      return;
    }

    setStatus('Connecting');
    setActiveBars(0);

    // Sequence animation: light up signal bars
    let currentBar = 1;
    const interval = setInterval(() => {
      setActiveBars(currentBar);
      currentBar++;
      if (currentBar > 4) {
        clearInterval(interval);
        setTimeout(() => {
          setStatus('Connected');
          onSaveConfig(ssid);
        }, 800);
      }
    }, 400);
  };

  return (
    <div className="space-y-6 pt-2">
      {/* Back navigation */}
      <div>
        <button
          onClick={() => onNavigate('settings')}
          className="flex items-center gap-1.5 text-xs text-[#004ac6] font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Settings</span>
        </button>
      </div>

      {/* Connection Status Banner matching exact spec */}
      <section className="bg-white/80 backdrop-blur-md border border-[#c3c6d7]/30 p-5 rounded-xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase font-bold text-[#737686] tracking-wider">Connection Status</span>
            <h2
              className={`text-lg font-bold mt-1.5 flex items-center gap-1.5 transition-all ${
                status === 'Connected' ? 'text-[#006e2d]' : 
                status === 'Connecting' ? 'text-[#004ac6]' : 'text-[#ba1a1a]'
              }`}
            >
              <span className="material-symbols-outlined animate-spin-slow">
                {status === 'Connected' ? 'check_circle' : 
                 status === 'Connecting' ? 'sync' : 'error'}
              </span>
              <span>{status}</span>
            </h2>
          </div>

          {/* Graphical Signal Bars */}
          <div className="flex items-end gap-1 h-8">
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 1 ? (status === 'Connected' ? 'bg-[#006e2d]' : 'bg-[#004ac6]') : 'bg-[#c3c6d7]'} h-[25%]`}></div>
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 2 ? (status === 'Connected' ? 'bg-[#006e2d]' : 'bg-[#004ac6]') : 'bg-[#c3c6d7]'} h-[50%]`}></div>
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 3 ? (status === 'Connected' ? 'bg-[#006e2d]' : 'bg-[#004ac6]') : 'bg-[#c3c6d7]'} h-[75%]`}></div>
            <div className={`w-1.5 rounded-full transition-all ${activeBars >= 4 ? (status === 'Connected' ? 'bg-[#006e2d]' : 'bg-[#004ac6]') : 'bg-[#c3c6d7]'} h-[100%]`}></div>
          </div>
        </div>

        <p className="text-xs text-[#434655] leading-relaxed">
          {status === 'Connected' 
            ? `Successfully connected to ${ssid}. The smart pill dispenser is synchronized with our healthcare network.`
            : 'Please configure your WiFi settings to sync your IoT smart pill dispenser with our healthcare network.'}
        </p>
      </section>

      {/* Circular illustration */}
      <section className="flex justify-center py-3">
        <div className="relative w-40 h-40 rounded-full bg-[#dee8ff] border border-[#c3c6d7]/40 flex items-center justify-center shadow-inner overflow-hidden">
          <span className="material-symbols-outlined text-[#004ac6] text-6xl animate-pulse">router</span>
        </div>
      </section>

      {/* Input Form Fields */}
      <section className="space-y-4">
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-xs font-bold text-[#737686] mb-1.5 ml-1" htmlFor="ssid">
              Network Name (SSID)
            </label>
            <div className="relative">
              <input
                id="ssid"
                type="text"
                disabled={status === 'Connecting'}
                value={ssid}
                onChange={e => setSsid(e.target.value)}
                placeholder="Search for networks..."
                className="w-full h-12 px-4 rounded-xl bg-white border border-[#737686]/40 focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 outline-none transition-all text-sm font-semibold text-[#111c2d]"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737686] hover:text-[#004ac6]"
                onClick={() => setSsid('Home_Network_5G')}
              >
                <span className="material-symbols-outlined text-lg">wifi_find</span>
              </button>
            </div>
          </div>

          <div className="relative">
            <label className="block text-xs font-bold text-[#737686] mb-1.5 ml-1" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                disabled={status === 'Connecting'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-white border border-[#737686]/40 focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 outline-none transition-all text-sm font-semibold text-[#111c2d]"
              />
              <button
                type="button"
                className="absolute right-4 top-1/2 -translate-y-1/2 text-[#737686] hover:text-[#004ac6]"
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
          className="w-full h-14 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-full font-bold text-sm shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all disabled:opacity-70 disabled:cursor-not-allowed mt-6"
        >
          {status === 'Connecting' ? (
            <>
              <span>Connecting Router...</span>
              <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
            </>
          ) : status === 'Connected' ? (
            <>
              <span>Device Ready</span>
              <span className="material-symbols-outlined text-lg">check_circle</span>
            </>
          ) : (
            <>
              <span>Connect Device</span>
              <span className="material-symbols-outlined text-lg">arrow_forward</span>
            </>
          )}
        </button>
      </section>

      {/* Support footer help */}
      <footer className="pt-4 text-center">
        <button
          type="button"
          onClick={() => nativeAlert('Verify that your router has 2.4GHz enabled. The ESP32 does not support 5GHz bands.')}
          className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-full hover:bg-[#dee8ff] text-[#004ac6] text-xs font-bold transition-colors"
        >
          <span className="material-symbols-outlined text-sm">help</span>
          <span>Trouble connecting?</span>
        </button>
      </footer>
    </div>
  );
}
