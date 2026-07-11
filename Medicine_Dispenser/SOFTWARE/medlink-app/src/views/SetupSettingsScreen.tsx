import React, { useEffect, useRef, useState } from 'react';
import { getSavedIp, saveIp, clearIp, ApiClient } from '../services/apiClient';
import { DeviceDiscovery } from '../services/DeviceDiscovery';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { Capacitor } from '@capacitor/core';

interface SetupSettingsScreenProps {
  onNavigate: (screen: string) => void;
}

export default function SetupSettingsScreen({ onNavigate }: SetupSettingsScreenProps) {
  const [ip, setIp] = useState('');
  const [currentSsid, setCurrentSsid] = useState('Loading...');
  const [deviceInfo, setDeviceInfo] = useState({ firmware: 'Offline', deviceId: 'Offline' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Wi-Fi Change Flow State
  const [showWifiModal, setShowWifiModal] = useState(false);
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');

  type WifiState = 'idle' | 'submitting' | 'waiting_creds' | 'reconnecting' | 'searching' | 'success' | 'failed';
  const [wifiState, setWifiState] = useState<WifiState>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [discoveryError, setDiscoveryError] = useState('');
  const [pollCount, setPollCount] = useState(0);

  // Ref to cancel the provisioning loop on modal close
  const provisioningActive = useRef(false);

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
        } else {
          setCurrentSsid('Device Not Configured');
        }
      } catch (err) {
        console.error('Failed to load setup settings:', err);
      } finally {
        setIsLoading(false);
      }
    }
    loadSettings();
  }, []);

  // ─── RECONNECT FLOW ────────────────────────────────────────────────────────
  const handleReconnect = async () => {
    if (!ip) return;
    setIsSaving(true);
    setCurrentSsid('Reconnecting...');
    try {
      let connected = false;
      for (let i = 0; i < 5; i++) {
        try {
          const status = await ApiClient.checkStatusAtIp(ip);
          if (status?.connected) {
            setCurrentSsid(status.ssid || 'Connected');
            connected = true;
            break;
          }
        } catch { /* ignore */ }
        await new Promise(r => setTimeout(r, 2000));
      }
      if (!connected) {
        setCurrentSsid('Offline');
        alert('Could not establish connection. Please verify Wi-Fi settings.');
      }
    } catch (err) {
      console.error(err);
      setCurrentSsid('Offline');
    } finally {
      setIsSaving(false);
    }
  };

  // ─── OPEN WI-FI MODAL ─────────────────────────────────────────────────────
  const handleOpenWifiModal = async () => {
    setShowWifiModal(true);
    setWifiState('idle');
    setWifiPassword('');
    setDiscoveryError('');

    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorWifi.requestPermissions();
      }
      const info = await CapacitorWifi.getSsid();
      if (info?.ssid) setWifiSsid(info.ssid);
    } catch (err) {
      console.warn('[SetupSettings] Could not scan SSID:', err);
    }
  };

  const handleCloseWifiModal = () => {
    provisioningActive.current = false;
    setShowWifiModal(false);
    setWifiState('idle');
  };

  // ─── SUBMIT WI-FI CREDENTIALS ─────────────────────────────────────────────
  const handleWifiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wifiSsid.trim()) return;

    setWifiState('submitting');
    setProgressMsg('Sending Wi-Fi credentials...');
    setDiscoveryError('');

    try {
      await ApiClient.connectWifi(wifiSsid.trim(), wifiPassword);
      console.log('[SetupSettings] credentials accepted by device, starting provisioning loop');
      provisioningActive.current = true;
      runProvisioningLoop(wifiSsid.trim());
    } catch (err) {
      console.error('[SetupSettings] connectWifi failed:', err);
      setDiscoveryError(err instanceof Error ? err.message : String(err));
      setWifiState('failed');
    }
  };

  // ─── STAGED PROVISIONING LOOP ─────────────────────────────────────────────
  const runProvisioningLoop = async (targetSsid: string) => {
    let elapsed = 0;

    // ── Stage 2: grace period (3 s, no polling) ─────────────────────────────
    setWifiState('waiting_creds');
    setProgressMsg('Connecting MedLink...');
    console.log('[SetupSettings] Stage 2: grace period 3 s');
    await new Promise(r => setTimeout(r, 3000));
    elapsed += 3;
    if (!provisioningActive.current) return;

    // ── Stage 3: wait for phone to leave MedLink AP ──────────────────────────
    setWifiState('reconnecting');
    setProgressMsg('Waiting for your phone to reconnect...');
    console.log('[SetupSettings] Stage 3: waiting for phone to rejoin home Wi-Fi');

    let phoneReady = false;
    while (elapsed < 90) {
      if (!provisioningActive.current) return;
      try {
        const { ssid } = await CapacitorWifi.getSsid();
        const { ipAddress } = await CapacitorWifi.getIpAddress();
        console.log(`[SetupSettings] SSID='${ssid}', IP='${ipAddress}'`);

        const onMedLinkAp = ssid && ssid.toLowerCase().startsWith('medlink-');
        const validIp = ipAddress &&
          ipAddress !== '0.0.0.0' &&
          ipAddress !== '127.0.0.1' &&
          !ipAddress.startsWith('192.168.4.');

        if (ssid && !onMedLinkAp && validIp) {
          console.log(`[SetupSettings] Phone reconnected → SSID=${ssid}, IP=${ipAddress}. Waiting 2s for DHCP stabilisation`);
          // Condition D: 2-second DHCP stabilisation wait
          await new Promise(r => setTimeout(r, 2000));
          elapsed += 2;
          phoneReady = true;
          break;
        }
      } catch (e) {
        console.warn('[SetupSettings] SSID/IP poll error:', e);
      }
      await new Promise(r => setTimeout(r, 1000));
      elapsed += 1;
    }

    if (!provisioningActive.current) return;

    if (!phoneReady) {
      console.error('[SetupSettings] Phone never rejoined home Wi-Fi');
      setDiscoveryError('Your phone did not rejoin your home Wi-Fi network in time. Please check Wi-Fi settings.');
      setWifiState('failed');
      return;
    }

    // ── Stage 4: device discovery loop (60 s, 5 s between cycles) ────────────
    setWifiState('searching');
    let attempt = 0;

    while (elapsed < 60 + 90) { // account for reconnect wait already consumed
      if (!provisioningActive.current) return;

      attempt++;
      setPollCount(attempt);
      setProgressMsg('Searching for MedLink...');

      try {
        const { ssid: curSsid } = await CapacitorWifi.getSsid();
        const { ipAddress: curIp } = await CapacitorWifi.getIpAddress();
        console.log(`[SetupSettings] Discovery attempt ${attempt} — SSID=${curSsid}, IP=${curIp}`);
      } catch { /* non-fatal */ }

      try {
        // During provisioning there is no saved LAN IP yet, so we use discover()
        // (mDNS → subnet). discoverFull() would try an AP IP first which would fail.
        const device = await DeviceDiscovery.discover();
        if (!provisioningActive.current) return;

        setProgressMsg('Verifying device...');
        await new Promise(r => setTimeout(r, 800));
        if (!provisioningActive.current) return;

        console.log(`[SetupSettings] Device found: ${device.ip} (${device.deviceId})`);
        await saveIp(device.ip);
        setIp(device.ip);

        const savedIp = await getSavedIp();
        console.log(`[SetupSettings] Saved IP: ${savedIp}. Navigating to home.`);

        setProgressMsg('Connected.');
        setWifiState('success');

        setTimeout(() => {
          provisioningActive.current = false;
          setShowWifiModal(false);
          setWifiState('idle');
          onNavigate('home');
        }, 2000);
        return;
      } catch (err) {
        console.error(`[SetupSettings] Discovery attempt ${attempt} failed:`, err);
        setDiscoveryError(err instanceof Error ? err.message : String(err));
      }

      // Wait 5 s before next discovery cycle
      for (let w = 0; w < 5; w++) {
        if (!provisioningActive.current) return;
        await new Promise(r => setTimeout(r, 1000));
      }
      elapsed += 5;
    }

    console.error('[SetupSettings] Discovery timed out after all attempts');
    setWifiState('failed');
  };

  // ─── FORGET DEVICE ────────────────────────────────────────────────────────
  const handleForgetDevice = () => {
    const confirmForget = window.confirm(
      'Are you sure you want to forget this dispenser? This will disconnect settings, erase credentials from local app memory, and return you to Setup.'
    );
    if (confirmForget) {
      setIsSaving(true);
      ApiClient.forgetWifi().catch(err => {
        console.warn('Forget request failed:', err);
      }).finally(async () => {
        await clearIp();
        setIsSaving(false);
        onNavigate('setup');
      });
    }
  };

  // ─── Retry helpers ────────────────────────────────────────────────────────
  const handleRetryDiscovery = () => {
    setDiscoveryError('');
    setWifiState('searching');
    setPollCount(0);
    provisioningActive.current = true;
    // Re-enter from stage 4 (phone already on home Wi-Fi)
    (async () => {
      let attempt = 0;
      let elapsed = 0;
      while (elapsed < 60) {
        if (!provisioningActive.current) return;
        attempt++;
        setPollCount(attempt);
        setProgressMsg('Searching for MedLink...');
        try {
          const device = await DeviceDiscovery.discover();
          if (!provisioningActive.current) return;
          setProgressMsg('Verifying device...');
          await new Promise(r => setTimeout(r, 800));
          if (!provisioningActive.current) return;
          await saveIp(device.ip);
          setProgressMsg('Connected.');
          setWifiState('success');
          setTimeout(() => {
            provisioningActive.current = false;
            setShowWifiModal(false);
            setWifiState('idle');
            onNavigate('home');
          }, 2000);
          return;
        } catch (err) {
          setDiscoveryError(err instanceof Error ? err.message : String(err));
        }
        for (let w = 0; w < 5; w++) {
          if (!provisioningActive.current) return;
          await new Promise(r => setTimeout(r, 1000));
        }
        elapsed += 5;
      }
      setWifiState('failed');
    })();
  };

  // ─────────────────────────────────────────────────────────────────────────
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

  // ─── Modal body helper ────────────────────────────────────────────────────
  const isSpinning = wifiState === 'submitting' || wifiState === 'waiting_creds' || wifiState === 'reconnecting' || wifiState === 'searching';

  return (
    <div className="min-h-full flex flex-col p-6 bg-slate-50 dark:bg-slate-950 font-sans select-none animate-fade-in pb-16">

      {/* Header */}
      <header className="flex items-center gap-3 py-4 border-b border-slate-200 dark:border-slate-800">
        <button
          type="button"
          onClick={() => onNavigate('setup')}
          className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-350 active:scale-95 transition-all cursor-pointer"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">Setup Settings</h1>
          <p className="text-[10px] text-slate-450 dark:text-slate-500 uppercase tracking-widest font-bold">Network & About</p>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 py-6 space-y-6 max-w-sm mx-auto w-full">

        {/* Wi-Fi Configuration Section */}
        <section className="p-5 rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
          <h2 className="text-[10px] text-teal-650 dark:text-teal-400 font-bold uppercase tracking-wider">Wi-Fi Connection</h2>

          <div className="flex justify-between items-center bg-slate-50 dark:bg-slate-950 p-3.5 rounded-xl border border-slate-100 dark:border-slate-900">
            <div>
              <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Current Network</p>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200 mt-0.5">{currentSsid}</p>
            </div>
            <span className={`w-2 h-2 rounded-full ${
              currentSsid !== 'Offline' && currentSsid !== 'Disconnected' && currentSsid !== 'Device Not Configured'
                ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
            }`}></span>
          </div>

          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={handleReconnect}
                disabled={isSaving}
                className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
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

        {/* About Device Section */}
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
      </main>

      {/* ── WI-FI MODAL OVERLAY ─────────────────────────────────────────────── */}
      {showWifiModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">wifi</span>
              <span>Configure Device Wi-Fi</span>
            </h3>

            {/* Form */}
            {wifiState === 'idle' && (
              <form onSubmit={handleWifiSubmit} className="space-y-3.5">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="wifi-ssid">Network SSID</label>
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
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="wifi-pass">Password</label>
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
                    onClick={handleCloseWifiModal}
                    className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
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

            {/* Spinner states */}
            {isSpinning && (
              <div className="flex flex-col items-center py-6 text-center space-y-4 animate-fade-in">
                <span className="material-symbols-outlined text-4xl text-teal-600 dark:text-teal-400 animate-spin">sync</span>
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{progressMsg}</p>
                  <p className="text-[10px] text-slate-450 dark:text-slate-500 leading-relaxed max-w-[200px] mx-auto">
                    {wifiState === 'submitting' && 'Transmitting network credentials to MedLink.'}
                    {wifiState === 'waiting_creds' && 'MedLink is leaving AP mode and connecting to the router.'}
                    {wifiState === 'reconnecting' && 'Waiting for your phone to return to your home network.'}
                    {wifiState === 'searching' && `Locating device on your network. Attempt ${pollCount}...`}
                  </p>
                </div>
              </div>
            )}

            {/* Success */}
            {wifiState === 'success' && (
              <div className="flex flex-col items-center py-6 text-center space-y-3 animate-fade-in">
                <span className="material-symbols-outlined text-4xl text-emerald-500 animate-bounce">task_alt</span>
                <div>
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Connected.</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">Redirecting to home dashboard...</p>
                </div>
              </div>
            )}

            {/* Failure */}
            {wifiState === 'failed' && (
              <div className="flex flex-col items-center py-4 text-center space-y-4 animate-fade-in">
                <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
                <div className="space-y-2 w-full">
                  <p className="text-xs font-bold text-slate-800 dark:text-white">Unable to find your MedLink device.</p>

                  {discoveryError && (
                    <p className="text-[9px] text-rose-600 dark:text-rose-400 font-mono bg-rose-500/5 border border-rose-500/15 rounded-lg p-2 break-words leading-relaxed text-left">
                      {discoveryError}
                    </p>
                  )}

                  <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    Please ensure:
                  </p>
                  <ul className="text-[10px] text-slate-500 dark:text-slate-400 leading-relaxed text-left list-disc pl-4 space-y-1">
                    <li>Phone is connected to the same Wi-Fi as MedLink</li>
                    <li>MedLink finished connecting to the router</li>
                    <li>Router allows local device communication</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-2 w-full pt-1">
                  <button
                    type="button"
                    onClick={handleRetryDiscovery}
                    className="w-full h-10 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 text-white font-bold text-xs rounded-xl active:scale-[0.98]"
                  >
                    Retry Discovery
                  </button>
                  <button
                    type="button"
                    onClick={() => setWifiState('idle')}
                    className="w-full h-9 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98]"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={() => { handleCloseWifiModal(); onNavigate('setup'); }}
                    className="w-full h-9 text-slate-400 dark:text-slate-500 font-bold text-xs rounded-xl"
                  >
                    Restart Setup
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
