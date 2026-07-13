import React, { useEffect, useRef, useState } from 'react';
import { getSavedIp, saveIp, clearIp, ApiClient } from '../services/apiClient';
import { DiscoveryManager, DiscoveredDevice, ProgressEvent } from '../services/DiscoveryManager';
import { CapacitorWifi } from '@capgo/capacitor-wifi';
import { Capacitor } from '@capacitor/core';
import { NativeSettings, AndroidSettings } from 'capacitor-native-settings';

interface SetupScreenProps {
  onNavigate: (screen: string) => void;
}

export default function SetupScreen({ onNavigate }: SetupScreenProps) {
  // Wizard steps:
  // 1: Power On Device
  // 2: Connect to MedLink Wi-Fi
  // 3: Return to App
  // 4: Searching/Device Detection (foreground)
  // 5: Device Found
  // 6: Connection Error (Actionable)
  // 7: Wi-Fi Credentials Form
  // 8: Wi-Fi Connection Progress
  // 9: Wi-Fi Connection Failure
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9>(1);
  const [detectionProgress, setDetectionProgress] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [deviceInfo, setDeviceInfo] = useState({ name: 'MedLink Dispenser', firmware: 'Unknown', deviceId: 'Unknown' });
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Background discovery state (shown subtly during steps 1–3)
  const [bgStatus, setBgStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const bgActive = useRef(true);

  // Wi-Fi provisioning state
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [wifiState, setWifiState] = useState<'idle' | 'submitting' | 'waiting_creds' | 'reconnecting' | 'searching' | 'success' | 'failed'>('idle');
  const [progressMsg, setProgressMsg] = useState('');
  const [discoveryError, setDiscoveryError] = useState('');
  const [pollCount, setPollCount] = useState(0);

  // ─── Silent background discovery ──────────────────────────────────────────
  // Pauses during active provisioning; resumes automatically once provisioning
  // ends (success or failure). Uses DiscoveryManager sessions so concurrent
  // runs are impossible.
  useEffect(() => {
    bgActive.current = true;
    setBgStatus('searching');

    const runBgDiscovery = async () => {
      console.log('[SetupScreen] Background discovery started');

      while (bgActive.current) {
        // Yield while provisioning is running
        if (DiscoveryManager.isBackgroundPaused) {
          await new Promise<void>(r => setTimeout(r, 2000));
          continue;
        }

        const bgSession = DiscoveryManager.startSession();

        try {
          const device = await DiscoveryManager.discoverFull(
            bgSession,
            msg => console.log('[BgDiscovery]', msg)
          );

          if (!bgActive.current || bgSession.cancelled) return;

          // Guard: ignore discovery if device was found via AP (192.168.4.1 or
          // medlink.local while phone is still on the MedLink AP network).
          // The user needs to complete the setup wizard before we navigate away.
          const isApAddress = device.ip === '192.168.4.1' || device.ip === 'medlink.local';
          let phoneOnMedLinkAp = false;
          try {
            const { ssid } = await CapacitorWifi.getSsid();
            phoneOnMedLinkAp = !!ssid && ssid.toLowerCase().startsWith('medlink-');
          } catch { /* can't check — err on side of caution */ }

          if (isApAddress || phoneOnMedLinkAp) {
            console.log(`[SetupScreen] Background found device at ${device.ip} but phone is ${phoneOnMedLinkAp ? 'on MedLink AP' : 'seeing AP IP'} — ignoring, retry in 8 s`);
            await new Promise<void>((resolve) => {
              const timer = setTimeout(resolve, 8000);
              bgSession.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
            });
            continue;
          }

          console.log('[SetupScreen] Background found device on LAN:', device.ip);
          setBgStatus('found');

          await new Promise<void>(resolve => setTimeout(resolve, 1200));
          if (!bgActive.current) return;
          onNavigate('search');
          return;

        } catch {
          if (!bgActive.current) return;
          console.log('[SetupScreen] Background discovery attempt failed, retrying in 15 s');
        }

        // Wait 15 s (cancellable)
        await new Promise<void>(resolve => {
          const timer = setTimeout(resolve, 15_000);
          bgSession.signal.addEventListener('abort', () => { clearTimeout(timer); resolve(); }, { once: true });
        });
      }
    };

    runBgDiscovery();

    return () => {
      bgActive.current = false;
      DiscoveryManager.cancelCurrent();
      DiscoveryManager.resumeBackground();
      console.log('[SetupScreen] Cleaned up (unmount)');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if we came from a failed Wi-Fi setup on the search screen
  useEffect(() => {
    if (DiscoveryManager.wifiSetupFailed) {
      setStep(9);
      setWifiState('failed');
      setDiscoveryError('Incorrect Wi-Fi credentials or device could not connect to router. Please check your SSID/Password and try again.');
      // Reset the flag immediately
      DiscoveryManager.setWifiSetupFailed(false);
    }
  }, []);

  // ─── Foreground detection (step 4 — user pressed "I'm Connected") ─────────
  const runDetection = async () => {
    setDetectionProgress(0);

    await new Promise(r => setTimeout(r, 800));
    setDetectionProgress(1); // Connected to MedLink Wi-Fi

    await new Promise(r => setTimeout(r, 1000));

    try {
      const statusRes = await ApiClient.checkStatusAtIp('192.168.4.1');
      if (statusRes?.success) {
        await saveIp('192.168.4.1');
        setDetectionProgress(2); // Device responded

        await new Promise(r => setTimeout(r, 800));

        const infoRes = await ApiClient.getInfo();
        setDeviceInfo({
          name: 'MedLink Dispenser',
          firmware: infoRes.firmwareVersion || '1.0.0',
          deviceId: infoRes.deviceId || 'ML-ESP-8266'
        });

        setDetectionProgress(3); // Firmware verified

        await new Promise(r => setTimeout(r, 700));
        setDetectionProgress(4); // Preparing setup...

        await new Promise(r => setTimeout(r, 900));
        setStep(5);
      } else {
        throw new Error('Device did not respond.');
      }
    } catch (err) {
      console.error('[SetupScreen] Foreground detection failed:', err);
      setErrorDetails(err instanceof Error ? err.message : 'Unknown error');
      setStep(6);
    }
  };

  useEffect(() => {
    if (step === 4) {
      runDetection();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  // ─── Native Wifi Settings Intent ──────────────────────────────────────────
  const handleOpenWifiSettings = async () => {
    if (Capacitor.isNativePlatform()) {
      try {
        await NativeSettings.openAndroid({
          option: AndroidSettings.Wifi,
        });
      } catch (err) {
        console.error('Failed to open Wi-Fi settings via NativeSettings:', err);
        alert("Please open your phone's Wi-Fi Settings panel manually and connect to the 'MedLink-XXXX' network, then return to this app.");
      }
    } else {
      alert("Please open your phone's Wi-Fi Settings panel manually and connect to the 'MedLink-XXXX' network, then return to this app.");
    }
    setStep(3);
  };

  // ─── Wi-Fi Auto-SSID Scan ──────────────────────────────────────────────────
  const handleLoadScannedSsid = async () => {
    try {
      if (Capacitor.isNativePlatform()) {
        await CapacitorWifi.requestPermissions();
      }
      const info = await CapacitorWifi.getSsid();
      if (info?.ssid) setWifiSsid(info.ssid);
    } catch (err) {
      console.warn('[SetupScreen] Could not scan SSID:', err);
    }
  };

  // ─── Progress callback → UI state mapping ─────────────────────────────────
  const handleProgress = (event: ProgressEvent) => {
    setProgressMsg(event.message);

    switch (event.stage) {
      case 'INIT':
      case 'SAVING':
        setWifiState('waiting_creds');
        break;
      case 'PHONE_WAIT':
        setWifiState('reconnecting');
        break;
      case 'SAVED_IP':
      case 'AP_IP':
      case 'MDNS':
      case 'SUBNET':
      case 'STATUS_POLL':
      case 'VERIFY':
        setWifiState('searching');
        setPollCount(prev => prev + 1);
        break;
      case 'SUCCESS':
        setWifiState('success');
        break;
      case 'FAILED':
        setWifiState('failed');
        break;
    }
  };

  // ─── Wi-Fi Credentials Submission ─────────────────────────────────────────
  const handleWifiSubmit = async () => {
    if (!wifiSsid.trim()) return;

    setStep(8);
    setWifiState('submitting');
    setProgressMsg('Sending Wi-Fi credentials...');
    setDiscoveryError('');
    setPollCount(0);

    try {
      await ApiClient.connectWifi(wifiSsid.trim(), wifiPassword);
    } catch (err) {
      // Ignore network errors/timeouts because ESP closes AP connection immediately
      console.warn('[SetupScreen] connectWifi request completed or dropped:', err);
    }

    console.log('[SetupScreen] Wi-Fi credentials sent. Clearing stale AP IP and routing to DeviceSearchScreen...');

    // Clear stale 192.168.4.1 so discovery doesn't waste time on it
    await clearIp();

    // Pause background discovery so it doesn't run during search
    DiscoveryManager.pauseBackground();

    // Navigate to the DeviceSearchScreen immediately.
    // The Search page will automatically start discovery and handle the phone reconnecting to Wi-Fi.
    onNavigate('search');
  };

  // ─── Retry provisioning ────────────────────────────────────────────────────
  const handleRetryProvisioning = () => {
    clearIp().then(() => {
      DiscoveryManager.pauseBackground();
      onNavigate('search');
    });
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 font-sans select-none animate-fade-in relative">
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm shrink-0">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => {
              onNavigate('search');
            }}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 active:scale-95 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Back"
          >
            <span className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Device Setup</h1>
          </div>
        </div>  
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full overflow-y-auto flex flex-col p-6 gap-4 pb-48">

        {/* Step 1 – Power On Device */}
        {step === 1 && (
          <div className="w-full flex flex-col space-y-4">
            <h2 className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Step 1 – Power On Device</h2>
            <div className="space-y-3.5 text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-sm mt-0.5">power</span>
                <span>Plug in the MedLink dispenser.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-sm mt-0.5">hourglass_empty</span>
                <span>Wait until the status LED indicates the device is ready.</span>
              </p>
              <p className="flex items-start gap-2">
                <span className="material-symbols-outlined text-teal-600 dark:text-teal-400 text-sm mt-0.5">wifi_tethering</span>
                <span>The device will create a temporary Wi-Fi network.</span>
              </p>
            </div>
          </div>
        )}

        {/* Step 2 – Connect to MedLink Wi-Fi */}
        {step === 2 && (
          <div className="w-full flex flex-col space-y-4">
            <h2 className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Step 2 – Connect to MedLink Wi-Fi</h2>
            <div className="space-y-3 text-xs text-slate-655 dark:text-slate-350 leading-relaxed">
              <p>1. Tap "Open Wi-Fi Settings" below.</p>
              <p>2. Connect to the Wi-Fi network named:</p>
              <div className="bg-slate-100 dark:bg-slate-900 p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 font-mono text-center text-sm font-bold text-slate-800 dark:text-white">
                MedLink-XXXX
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-500">
                * Internet may be temporarily unavailable while connected to this network.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/10 p-3 rounded-xl text-[10px] text-amber-600 dark:text-amber-455 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  <span>Captive Portal Note:</span>
                </p>
                <p>If a browser page automatically opens asking for Wi-Fi credentials, simply close it and return to the MedLink app. The app will guide you through setup.</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 3 – Return to App */}
        {step === 3 && (
          <div className="w-full flex flex-col space-y-4">
            <h2 className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Step 3 – Return to the App</h2>
            <div className="space-y-4 text-center py-2">
              <span className="material-symbols-outlined text-5xl text-teal-655 dark:text-teal-400 animate-pulse">phonelink_setup</span>
              <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed max-w-[200px] mx-auto">
                Once connected to the <strong>MedLink-XXXX</strong> network, return to this app to initialize the setup.
              </p>
            </div>
          </div>
        )}

        {/* Step 4 – Device Detection (Searching...) */}
        {step === 4 && (
          <div className="w-full flex flex-col space-y-5">
            <h2 className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Step 4 – Device Detection</h2>

            <div className="flex items-center justify-center py-2">
              <span className="material-symbols-outlined text-4xl text-teal-600 dark:text-teal-400 animate-spin">sync</span>
            </div>

            <div className="space-y-3.5 text-xs">
              {[
                { label: 'Searching for your MedLink...', threshold: 1 },
                { label: 'Connected to MedLink Wi-Fi', threshold: 2 },
                { label: 'Device responded', threshold: 3 },
                { label: 'Firmware verified', threshold: 4 },
              ].map(({ label, threshold }, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <span className={`material-symbols-outlined text-sm ${detectionProgress >= threshold ? 'text-emerald-500 font-bold' : 'text-slate-300 dark:text-slate-700'}`}>
                    {detectionProgress >= threshold ? 'check_circle' : 'circle'}
                  </span>
                  <span className={detectionProgress === threshold - 1 ? 'text-slate-800 dark:text-white font-bold animate-pulse' : 'text-slate-400 dark:text-slate-500'}>
                    {label}
                  </span>
                </div>
              ))}
              <div className="pl-6 text-[10px] font-mono text-teal-655 dark:text-teal-400">
                {detectionProgress === 4 && <span className="animate-pulse">Preparing setup...</span>}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 – Device Found */}
        {step === 5 && (
          <div className="w-full flex flex-col space-y-4">
            <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Device Found!</h2>
            <div className="flex items-center gap-2 pb-2">
              <span className="material-symbols-outlined text-3xl text-emerald-500">check_circle</span>
              <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed font-bold">
                Connection verified successfully.
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3 text-left shadow-sm">
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Device Name</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0.5">{deviceInfo.name}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Firmware Version</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-350 mt-0.5">v{deviceInfo.firmware}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Device ID</p>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-350 mt-0.5 truncate">{deviceInfo.deviceId}</p>
              </div>
            </div>
          </div>
        )}

        {/* Step 6 – Actionable Error Screen */}
        {step === 6 && (
          <div className="w-full flex flex-col space-y-4">
            <h2 className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Connection Failed</h2>
            <div className="flex items-center gap-2 pb-1">
              <span className="material-symbols-outlined text-3xl text-rose-500">error</span>
              <p className="text-xs text-slate-800 dark:text-white font-bold">
                We couldn't find your MedLink device.
              </p>
            </div>

            {errorDetails && (
              <p className="text-[9px] text-rose-600 dark:text-rose-400 font-semibold bg-rose-500/5 p-2 rounded-lg border border-rose-500/10 break-words leading-relaxed">
                {errorDetails}
              </p>
            )}

            <div className="space-y-3.5 text-xs text-slate-655 dark:text-slate-350 leading-relaxed border-t border-b border-slate-100 dark:border-slate-850 py-3.5">
              <p className="font-bold text-slate-700 dark:text-slate-300">Please check:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>You're connected to the MedLink Wi-Fi network.</li>
                <li>The device is powered on.</li>
                <li>You're close to the dispenser.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Step 7 – Wi-Fi Credentials Form */}
        {step === 7 && (
          <div className="w-full flex flex-col space-y-4 animate-fade-in">
            <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Step 5 of 5 — Wi-Fi Configuration</h2>
            <div className="flex items-center gap-2 pb-2">
              <span className="material-symbols-outlined text-3xl text-teal-500">wifi</span>
              <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed font-bold">
                Configure your MedLink dispenser to connect to your home Wi-Fi network.
              </p>
            </div>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="wifi-ssid">Network SSID</label>
                <input
                  id="wifi-ssid"
                  type="text"
                  required
                  value={wifiSsid}
                  onChange={e => setWifiSsid(e.target.value)}
                  placeholder="Home Wi-Fi Network Name"
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-teal-500 dark:focus:border-teal-400 text-slate-800 dark:text-white"
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
                  className="w-full h-11 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs outline-none focus:border-teal-500 dark:focus:border-teal-400 text-slate-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 8 – Connecting Progress */}
        {step === 8 && (
          <div className="w-full flex flex-col space-y-5 py-4 items-center text-center animate-fade-in">
            <span className="material-symbols-outlined text-5xl text-teal-600 dark:text-teal-400 animate-spin">sync</span>
            <div className="space-y-2">
              <h2 className="text-sm font-bold text-slate-800 dark:text-white">{progressMsg}</h2>
              <p className="text-[11px] text-slate-450 dark:text-slate-550 leading-relaxed max-w-[240px] mx-auto">
                {wifiState === 'submitting' && 'Transmitting network credentials to MedLink.'}
                {wifiState === 'waiting_creds' && 'MedLink is leaving AP mode and connecting to the router.'}
                {wifiState === 'reconnecting' && 'Waiting for your phone to return to your home network.'}
                {wifiState === 'searching' && `Locating device on your network. Attempt ${pollCount}...`}
              </p>
            </div>
          </div>
        )}

        {/* Step 9 – Wi-Fi Connection Failed */}
        {step === 9 && (
          <div className="w-full flex flex-col space-y-4 animate-fade-in">
            <h2 className="text-[10px] text-rose-500 font-bold uppercase tracking-wider">Wi-Fi Connection Failed</h2>
            <div className="flex items-center gap-2 pb-1">
              <span className="material-symbols-outlined text-3xl text-rose-500">error</span>
              <p className="text-xs text-slate-800 dark:text-white font-bold">
                MedLink could not connect to your Wi-Fi network.
              </p>
            </div>

            {discoveryError && (
              <p className="text-[9px] text-rose-600 dark:text-rose-400 font-mono bg-rose-500/5 border border-rose-500/15 rounded-lg p-2.5 break-words leading-relaxed text-left">
                {discoveryError}
              </p>
            )}

            <div className="space-y-3.5 text-xs text-slate-655 dark:text-slate-350 leading-relaxed border-t border-b border-slate-100 dark:border-slate-850 py-3.5">
              <p className="font-bold text-slate-700 dark:text-slate-300">Please verify:</p>
              <ul className="list-disc pl-4 space-y-1.5">
                <li>You entered the correct Wi-Fi SSID and Password.</li>
                <li>Your home router is powered on and within range of MedLink.</li>
                <li>Your phone and MedLink are trying to connect to the same 2.4GHz network.</li>
              </ul>
            </div>
          </div>
        )}

      </main>

      {/* Footer / Fixed Action Area */}
      <footer className="absolute bottom-0 left-0 right-0 p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_15px_-3px_rgba(0,0,0,0.05)] z-50 flex flex-col gap-3">
        {step === 1 && (
          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Next Step</span>
            <span className="material-symbols-outlined text-sm">arrow_forward</span>
          </button>
        )}

        {step === 2 && (
          <button
            type="button"
            onClick={handleOpenWifiSettings}
            className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">settings_ethernet</span>
            <span>Open Wi-Fi Settings</span>
          </button>
        )}

        {step === 3 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(4)}
              className="h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
            >
              I'm Connected
            </button>
          </div>
        )}

        {step === 5 && (
          <button
            type="button"
            onClick={() => {
              setStep(7);
              handleLoadScannedSsid();
            }}
            className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-655 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <span>Continue to Wi-Fi Setup</span>
            <span className="material-symbols-outlined text-sm">wifi</span>
          </button>
        )}

        {step === 6 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => setStep(4)}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
            >
              Retry
            </button>

            <button
              type="button"
              onClick={handleOpenWifiSettings}
              className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98]"
            >
              Open Wi-Fi Settings
            </button>
          </div>
        )}

        {step === 7 && (
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setStep(5)}
              className="h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98]"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleWifiSubmit}
              disabled={!wifiSsid.trim()}
              className="h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Connect
            </button>
          </div>
        )}

        {step === 9 && (
          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleRetryProvisioning}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
            >
              Retry Connection
            </button>
            <button
              type="button"
              onClick={() => setStep(7)}
              className="w-full h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98]"
            >
              Change Wi-Fi Settings
            </button>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full h-11 text-slate-450 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 font-bold text-xs rounded-xl"
            >
              Restart Setup
            </button>
          </div>
        )}
      </footer>
    </div>
  );
}
