import React, { useEffect, useRef, useState } from 'react';
import { getSavedIp, saveIp, ApiClient } from '../services/apiClient';
import { DeviceDiscovery } from '../services/DeviceDiscovery';

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
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5 | 6>(1);
  const [detectionProgress, setDetectionProgress] = useState<0 | 1 | 2 | 3 | 4>(0);
  const [deviceInfo, setDeviceInfo] = useState({ name: 'MedLink Dispenser', firmware: 'Unknown', deviceId: 'Unknown' });
  const [errorDetails, setErrorDetails] = useState<string>('');

  // Background discovery state (shown subtly during steps 1–3)
  const [bgStatus, setBgStatus] = useState<'idle' | 'searching' | 'found'>('idle');
  const bgActive = useRef(true); // set to false to cancel the loop

  // ─── Silent background discovery (runs while user reads onboarding) ────────
  useEffect(() => {
    bgActive.current = true;
    setBgStatus('searching');

    const runBgDiscovery = async () => {
      console.log('[SetupScreen] Background discovery started');

      while (bgActive.current) {
        try {
          const device = await DeviceDiscovery.discoverFull();
          if (!bgActive.current) return; // cancelled while awaiting

          console.log('[SetupScreen] Background discovery found device:', device.ip);
          await saveIp(device.ip);
          setBgStatus('found');

          // Brief moment so user sees "Device found" before navigating
          await new Promise(r => setTimeout(r, 1200));

          if (!bgActive.current) return;
          onNavigate('home');
          return;
        } catch {
          // Device not reachable yet — wait 15s then retry
          console.log('[SetupScreen] Background discovery attempt failed, retrying in 15s');
        }

        // Wait 15 seconds or until cancelled
        await new Promise<void>(resolve => {
          const id = setTimeout(resolve, 15000);
          // Poll cancellation every 500 ms to exit early on unmount
          const check = setInterval(() => {
            if (!bgActive.current) { clearTimeout(id); clearInterval(check); resolve(); }
          }, 500);
          // Clean up interval when timeout fires
          setTimeout(() => clearInterval(check), 15100);
        });
      }
    };

    runBgDiscovery();

    return () => {
      bgActive.current = false;
      console.log('[SetupScreen] Background discovery cancelled (unmount or step advance)');
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Foreground detection (step 4 — user pressed "I'm Connected") ─────────
  const runDetection = async () => {
    // Stop background loop so they don't race
    bgActive.current = false;
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

  const handleOpenWifiSettings = () => {
    alert("Please open your phone's Wi-Fi Settings panel manually and connect to the 'MedLink-XXXX' network, then return to this app.");
    setStep(3);
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  /** Subtle background-discovery status bar shown during steps 1–3. */
  const BgStatusBar = () => {
    if (step > 3) return null;
    if (bgStatus === 'idle') return null;
    return (
      <div className={`w-full flex items-center justify-center gap-2 py-2 px-4 rounded-xl text-[10px] font-semibold transition-all
        ${bgStatus === 'found'
          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
          : 'bg-teal-500/8 text-teal-600 dark:text-teal-400 border border-teal-500/10'}`}>
        {bgStatus === 'found' ? (
          <>
            <span className="material-symbols-outlined text-xs">check_circle</span>
            <span>Device found — Connecting...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-xs animate-spin">sync</span>
            <span>Searching for nearby MedLink...</span>
          </>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-full flex flex-col justify-between items-center p-6 bg-slate-50 dark:bg-slate-950 font-sans select-none animate-fade-in pb-12">

      {/* Top Branding Section */}
      <header className="flex flex-col items-center pt-8 text-center shrink-0">
        <div className="w-14 h-14 rounded-2xl bg-teal-600 dark:bg-teal-500 flex items-center justify-center shadow-md shadow-teal-600/10 dark:shadow-none mb-3">
          <span className="material-symbols-outlined text-3xl text-white fill-icon">medication</span>
        </div>
        <h1 className="text-xl font-bold tracking-tight text-slate-800 dark:text-white">
          Welcome to MedLink
        </h1>
        <p className="text-xs text-slate-450 dark:text-slate-555 mt-1 max-w-[260px] leading-relaxed">
          Let's set up your smart medicine dispenser in just a few simple steps.
        </p>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-xs flex flex-col items-center justify-center my-6 gap-3">

        {/* Step 1 – Power On Device */}
        {step === 1 && (
          <div className="w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
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
            <button
              type="button"
              onClick={() => setStep(2)}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Next Step</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        )}

        {/* Step 2 – Connect to MedLink Wi-Fi */}
        {step === 2 && (
          <div className="w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Step 2 – Connect to MedLink Wi-Fi</h2>
            <div className="space-y-3 text-xs text-slate-650 dark:text-slate-350 leading-relaxed">
              <p>1. Open your phone's Wi-Fi settings.</p>
              <p>2. Connect to the Wi-Fi network named:</p>
              <div className="bg-slate-50 dark:bg-slate-950 p-2.5 rounded-xl border border-slate-200 dark:border-slate-850 font-mono text-center text-sm font-bold text-slate-800 dark:text-white">
                MedLink-XXXX
              </div>
              <p className="text-[10px] text-slate-450 dark:text-slate-500">
                * Internet may be temporarily unavailable while connected to this network.
              </p>
              <div className="bg-amber-500/5 border border-amber-500/20 dark:border-amber-500/10 p-3 rounded-xl text-[10px] text-amber-600 dark:text-amber-450 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <span className="material-symbols-outlined text-xs">info</span>
                  <span>Captive Portal Note:</span>
                </p>
                <p>If a browser page automatically opens asking for Wi-Fi credentials, simply close it and return to the MedLink app. The app will guide you through setup.</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleOpenWifiSettings}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">settings_ethernet</span>
              <span>Open Wi-Fi Settings</span>
            </button>
          </div>
        )}

        {/* Step 3 – Return to App */}
        {step === 3 && (
          <div className="w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-[10px] text-teal-600 dark:text-teal-400 font-bold uppercase tracking-wider">Step 3 – Return to the App</h2>
            <div className="space-y-4 text-center py-2">
              <span className="material-symbols-outlined text-5xl text-teal-655 dark:text-teal-400 animate-pulse">phonelink_setup</span>
              <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed max-w-[200px] mx-auto">
                Once connected to the <strong>MedLink-XXXX</strong> network, return to this app to initialize the setup.
              </p>
            </div>
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
          </div>
        )}

        {/* Subtle background-discovery status bar (steps 1–3) */}
        <BgStatusBar />

        {/* Step 4 – Device Detection (Searching...) */}
        {step === 4 && (
          <div className="w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-5">
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
              <div className="pl-6 text-[10px] font-mono text-teal-650 dark:text-teal-400">
                {detectionProgress === 4 && <span className="animate-pulse">Preparing setup...</span>}
              </div>
            </div>
          </div>
        )}

        {/* Step 5 – Device Found */}
        {step === 5 && (
          <div className="w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-855 bg-white dark:bg-slate-900 shadow-sm space-y-4">
            <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Device Found!</h2>
            <div className="flex items-center gap-2 pb-2">
              <span className="material-symbols-outlined text-3xl text-emerald-500">check_circle</span>
              <p className="text-xs text-slate-655 dark:text-slate-350 leading-relaxed font-bold">
                Connection verified successfully.
              </p>
            </div>

            <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-850 space-y-3 text-left">
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Device Name</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">{deviceInfo.name}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Firmware Version</p>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">v{deviceInfo.firmware}</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Device ID</p>
                <p className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 mt-0.5 truncate">{deviceInfo.deviceId}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('settings-setup')}
              className="w-full h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-650 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Continue to Wi-Fi Setup</span>
              <span className="material-symbols-outlined text-sm">wifi</span>
            </button>
          </div>
        )}

        {/* Step 6 – Actionable Error Screen */}
        {step === 6 && (
          <div className="w-full p-6 flex flex-col rounded-3xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 shadow-sm space-y-4">
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

            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStep(4)}
                className="w-full h-10 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 text-white font-bold text-xs rounded-xl active:scale-[0.98] cursor-pointer"
              >
                Retry
              </button>

              <button
                type="button"
                onClick={handleOpenWifiSettings}
                className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98]"
              >
                Open Wi-Fi Settings
              </button>

              <button
                type="button"
                onClick={() => setStep(3)}
                className="w-full h-9 text-slate-450 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-400 font-bold text-xs rounded-xl"
              >
                Back
              </button>
            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="w-full shrink-0 flex flex-col items-center">
        {step <= 3 && (
          <div className="flex gap-1.5 mb-5">
            <span className={`w-1.5 h-1.5 rounded-full ${step === 1 ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-800'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full ${step === 2 ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-800'}`}></span>
            <span className={`w-1.5 h-1.5 rounded-full ${step === 3 ? 'bg-teal-600 dark:bg-teal-400' : 'bg-slate-300 dark:bg-slate-800'}`}></span>
          </div>
        )}
        <div className="text-[10px] text-slate-400 dark:text-slate-550 text-center max-w-[260px] leading-relaxed">
          <p>This setup only needs to be completed once.</p>
          <p className="mt-0.5">After setup, MedLink will automatically reconnect whenever it is powered on.</p>
        </div>
      </footer>
    </div>
  );
}
