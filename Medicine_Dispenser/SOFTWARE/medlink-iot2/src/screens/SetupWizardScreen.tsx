import React, { useState, useEffect } from 'react';
import { DeviceConfig, Settings, ApiMode, ApiDeviceStatus } from '../types';
import { ApiClient } from '../api/ApiClient';
import { mapDeviceStatus } from '../utils/apiMappers';
import { nativeAlert } from '../utils/dialogs';

interface SetupWizardProps {
  settings: Settings;
  onUpdateSettings: (settings: Partial<Settings>) => void;
  onNavigate: (screen: string) => void;
  config: DeviceConfig;
  onRefreshConfig: () => Promise<void>;
}

type SetupStep = 1 | 2 | 3 | 4;

export default function SetupWizardScreen({
  settings,
  onUpdateSettings,
  onNavigate,
  config,
  onRefreshConfig
}: SetupWizardProps) {
  const [step, setStep] = useState<SetupStep>(1);
  
  // IP / Discovery State
  const [ipAddress, setIpAddress] = useState(settings.esp32Ip || '192.168.4.1');
  const [discoveryState, setDiscoveryState] = useState<'idle' | 'searching' | 'connected' | 'failed'>('idle');
  const [discoveredDevice, setDiscoveredDevice] = useState<DeviceConfig | null>(null);
  const [softApInstructions, setSoftApInstructions] = useState(false);

  // WiFi Provisioning State
  const [wifiSsid, setWifiSsid] = useState('');
  const [wifiPassword, setWifiPassword] = useState('');
  const [provisionState, setProvisionState] = useState<'idle' | 'provisioning' | 'verifying' | 'success' | 'failed'>('idle');
  const [provisionMessage, setProvisionMessage] = useState('');
  const [newIpAddress, setNewIpAddress] = useState('');

  // Hardware Verification States
  const [audioVerified, setAudioVerified] = useState<'pending' | 'testing' | 'yes' | 'no'>('pending');
  const [motorVerified, setMotorVerified] = useState<'pending' | 'testing' | 'yes' | 'no'>('pending');
  const [irVerified, setIrVerified] = useState<'pending' | 'testing' | 'yes'>('pending');
  const [rtcVerified, setRtcVerified] = useState<'pending' | 'testing' | 'yes'>('pending');
  const [lcdVerified, setLcdVerified] = useState<'pending' | 'testing' | 'yes' | 'no'>('pending');

  // Discover Device logic
  const handleDiscover = async (targetIp: string) => {
    setDiscoveryState('searching');
    setSoftApInstructions(false);
    
    // Normalize IP prefix
    let cleanIp = targetIp.trim().replace(/\/$/, '');
    if (!cleanIp.startsWith('http://') && !cleanIp.startsWith('https://')) {
      cleanIp = `http://${cleanIp}`;
    }

    try {
      // Direct HTTP fetch to test target IP bypassing standard client caching/timeouts
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);
      
      const response = await fetch(`${cleanIp}/api/v1/status`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.ok) {
        const data: ApiDeviceStatus = await response.json();
        const devConfig = mapDeviceStatus(data);
        
        setDiscoveredDevice(devConfig);
        setDiscoveryState('connected');
        
        // Temporarily write discovered IP to Settings
        onUpdateSettings({ esp32Ip: targetIp.trim() });
      } else {
        throw new Error('Device returned non-200 response');
      }
    } catch (err) {
      console.error('Discovery failed on IP: ', targetIp, err);
      
      if (targetIp !== '192.168.4.1') {
        // Fallback to checking default SoftAP IP
        setIpAddress('192.168.4.1');
        handleDiscover('192.168.4.1');
      } else {
        setDiscoveryState('failed');
        setSoftApInstructions(true);
      }
    }
  };

  // Run initial discover check if saved IP exists
  useEffect(() => {
    if (step === 2 && discoveryState === 'idle') {
      handleDiscover(ipAddress);
    }
  }, [step]);

  // WiFi Provisioning trigger
  const handleProvisionWiFi = async () => {
    if (!wifiSsid) {
      nativeAlert('Please enter a WiFi SSID name.');
      return;
    }
    
    setProvisionState('provisioning');
    setProvisionMessage('Sending WiFi credentials to dispenser...');

    try {
      const payload = { ssid: wifiSsid, password: wifiPassword };
      const res = await ApiClient.post<{ success: boolean; message: string; ipAddress?: string }>('/api/v1/wifi/connect', payload);
      
      if (res.success && res.ipAddress && res.ipAddress !== '0.0.0.0') {
        const targetNewIp = res.ipAddress;
        setNewIpAddress(targetNewIp);
        setProvisionState('verifying');
        setProvisionMessage(`Credentials accepted. Re-connecting to dispenser at new IP: ${targetNewIp}...`);

        // Wait 3 seconds for module to connect and bind to router
        await new Promise(r => setTimeout(r, 4000));

        // Attempt verification at new IP address
        let cleanNewIp = targetNewIp.trim();
        if (!cleanNewIp.startsWith('http://') && !cleanNewIp.startsWith('https://')) {
          cleanNewIp = `http://${cleanNewIp}`;
        }

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const verifyRes = await fetch(`${cleanNewIp}/api/v1/status`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (verifyRes.ok) {
          const verifyData: ApiDeviceStatus = await verifyRes.json();
          const finalConfig = mapDeviceStatus(verifyData);
          
          setDiscoveredDevice(finalConfig);
          setIpAddress(targetNewIp);
          
          // Save verified IP to local settings
          onUpdateSettings({ 
            esp32Ip: targetNewIp,
            apiMode: ApiMode.REAL_DEVICE // Auto switch to Real Device mode!
          });
          
          setProvisionState('success');
          setProvisionMessage(`Successfully linked! Connected to ${finalConfig.ssid || 'Dispenser Hub'}.`);
        } else {
          throw new Error('Connection test to new IP failed');
        }
      } else {
        setProvisionState('failed');
        setProvisionMessage(res.message || 'WiFi Connection timed out. Please check SSID/Password.');
      }
    } catch (err) {
      console.error('Provision failed', err);
      setProvisionState('failed');
      setProvisionMessage('Failed to connect. Make sure you are connected to the dispenser WiFi AP.');
    }
  };

  // Skip Provisioning (e.g. using existing connected IP)
  const handleSkipProvision = () => {
    setProvisionState('success');
    setNewIpAddress(ipAddress);
    onUpdateSettings({ apiMode: ApiMode.REAL_DEVICE });
  };

  // Test Speaker beep
  const handleTestSpeaker = async () => {
    setAudioVerified('testing');
    try {
      await ApiClient.post('/api/v1/test/audio', { volume: 80 });
      // Keep testing state for a moment
      setTimeout(() => {
        setAudioVerified('pending'); // allow selection
      }, 1000);
    } catch (err) {
      setAudioVerified('no');
    }
  };

  // Test Stepper Motor
  const handleTestMotor = async () => {
    setMotorVerified('testing');
    try {
      await ApiClient.post('/api/v1/test/dispenser/1');
      setTimeout(() => {
        setMotorVerified('pending');
      }, 1500);
    } catch (err) {
      setMotorVerified('no');
    }
  };

  // Test IR Sensor Drop
  const handleTestIR = async () => {
    setIrVerified('testing');
    try {
      const res = await ApiClient.post<{ success: boolean }>('/api/v1/test/ir');
      if (res.success) {
        setIrVerified('yes');
      } else {
        setIrVerified('pending');
      }
    } catch (err) {
      setIrVerified('pending');
    }
  };

  // Test RTC clock sync
  const handleTestRTC = async () => {
    setRtcVerified('testing');
    try {
      // Sync RTC via test post first
      await ApiClient.post('/api/v1/test/rtc');
      
      const statusData = await ApiClient.get<ApiDeviceStatus>('/api/v1/status');
      if (statusData.epochTime) {
        const localSeconds = Math.floor(Date.now() / 1000);
        const diff = Math.abs(localSeconds - statusData.epochTime);
        if (diff < 60) {
          setRtcVerified('yes');
        } else {
          setRtcVerified('pending');
        }
      } else {
        setRtcVerified('pending');
      }
    } catch (err) {
      setRtcVerified('pending');
    }
  };

  // Test OLED message
  const handleTestLCD = async () => {
    setLcdVerified('testing');
    try {
      // Trigger a status read
      const statusData = await ApiClient.get<ApiDeviceStatus>('/api/v1/status');
      if (statusData.connected) {
        setLcdVerified('pending');
      } else {
        setLcdVerified('no');
      }
    } catch (err) {
      setLcdVerified('no');
    }
  };

  // Complete onboarding
  const handleFinishSetup = async () => {
    if (!discoveredDevice) {
      nativeAlert('Error finishing setup. Discovered device context is empty.');
      return;
    }

    try {
      // Save setup states to LocalStorage
      localStorage.setItem('deviceConfigured', 'true');
      localStorage.setItem('deviceIP', ipAddress);
      localStorage.setItem('deviceId', discoveredDevice.firmware || 'ESP32_DISP_01');
      localStorage.setItem('lastSuccessfulConnection', String(Date.now()));
      localStorage.setItem('firmwareVersion', discoveredDevice.firmware || 'v1.0.0');

      // Refresh final config in AppContext
      await onRefreshConfig();

      nativeAlert('Setup wizard complete! Dispenser connected successfully.');
      onNavigate('home');
    } catch (err) {
      console.error(err);
      onNavigate('home');
    }
  };

  return (
    <div className="space-y-6 pt-6 text-light dark:text-white max-w-md mx-auto">
      
      {/* Progress Header */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-accent dark:text-[#a78bfa] text-xl font-bold">medical_services</span>
          <h2 className="text-base font-bold uppercase tracking-wider">Setup Wizard</h2>
        </div>
        <div className="flex gap-1.5">
          {([1, 2, 3, 4] as const).map(s => (
            <div 
              key={s} 
              className={`w-5 h-1.5 rounded-full transition-all duration-300 ${
                s === step 
                  ? 'bg-accent dark:bg-[#a78bfa] w-7' 
                  : s < step 
                    ? 'bg-accent/40 dark:bg-[#a78bfa]/40' 
                    : 'bg-slate-350 dark:bg-slate-800'
              }`}
            />
          ))}
        </div>
      </div>

      {/* STEP 1: Welcome Screen */}
      {step === 1 && (
        <section className="card-glass p-6 space-y-5 text-center">
          <div className="w-16 h-16 rounded-full bg-accent-light dark:bg-slate-800 text-accent dark:text-[#a78bfa] flex items-center justify-center mx-auto border border-accent/10">
            <span className="material-symbols-outlined text-4xl">hail</span>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-lg font-bold tracking-tight">Welcome to MedLink IoT</h3>
            <p className="text-xs text-muted dark:text-slate-300 leading-relaxed px-2">
              Let's connect your phone to the Smart Medicine Dispenser. This setup wizard will configure WiFi and test physical sensors.
            </p>
          </div>

          <div className="bg-accent-light/45 dark:bg-slate-900/30 p-4 rounded-sm border border-border-custom dark:border-slate-800 text-left space-y-2 text-[11px] leading-relaxed text-muted dark:text-slate-300">
            <div className="flex gap-2">
              <span className="font-bold text-accent dark:text-[#a78bfa]">1.</span>
              <span>Connect the dispenser power adapter and turn it on.</span>
            </div>
            <div className="flex gap-2">
              <span className="font-bold text-accent dark:text-[#a78bfa]">2.</span>
              <span>Make sure your phone is nearby to configure settings.</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="w-full h-12 bg-accent hover:bg-accent-hover dark:bg-accent text-white font-bold rounded-sm shadow-md transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Begin Setup</span>
            <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
          </button>
        </section>
      )}

      {/* STEP 2: Device Discovery */}
      {step === 2 && (
        <section className="card-glass p-6 space-y-5">
          <div className="space-y-1.5 text-center">
            <h3 className="text-base font-bold tracking-tight">Searching for Dispenser</h3>
            <p className="text-[11px] text-muted">Locating device on the local connection IP</p>
          </div>

          {/* Search Loader states */}
          <div className="border border-border-custom dark:border-slate-800 rounded-sm p-5 bg-primary/20 dark:bg-slate-900/10 space-y-4">
            {discoveryState === 'searching' && (
              <div className="flex flex-col items-center justify-center py-4 space-y-3">
                <span className="material-symbols-outlined animate-spin text-3xl text-accent dark:text-[#a78bfa]">sync</span>
                <p className="text-xs font-bold text-muted animate-pulse">Searching local subnet...</p>
              </div>
            )}

            {discoveryState === 'failed' && (
              <div className="space-y-4 text-center">
                <span className="material-symbols-outlined text-3xl text-error-custom">wifi_off</span>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-error-custom">Dispenser Not Detected</p>
                  <p className="text-[10px] text-muted px-2 leading-relaxed">
                    Could not reach the device. Please make sure your phone is connected to the WiFi AP named <strong>MedLink-XXXX</strong> broadcasted by the dispenser.
                  </p>
                </div>
              </div>
            )}

            {discoveryState === 'connected' && discoveredDevice && (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 text-success-custom font-bold text-xs">
                  <span className="material-symbols-outlined text-lg">check_circle</span>
                  <span>Dispenser Connected!</span>
                </div>
                <div className="text-[11px] text-muted space-y-1 bg-white/40 dark:bg-slate-850 p-3 rounded-sm font-mono border border-border-custom dark:border-slate-800">
                  <div>Name: {discoveredDevice.firmware ? "Smart Dispenser Hub" : "Device Hub"}</div>
                  <div>Firmware: {discoveredDevice.firmware || 'v1.0.0'}</div>
                  <div>IP: {ipAddress}</div>
                </div>
              </div>
            )}

            {/* Manually edit discovery IP address */}
            <div className="space-y-2 pt-2 border-t border-border-custom dark:border-slate-800">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">Dispenser Address / Host IP</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ipAddress}
                  onChange={(e) => setIpAddress(e.target.value)}
                  placeholder="e.g. 192.168.4.1"
                  className="input-custom flex-grow font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={() => handleDiscover(ipAddress)}
                  className="px-4 py-2 bg-accent-light dark:bg-slate-800 text-accent dark:text-[#a78bfa] font-bold text-xs rounded-sm hover:bg-accent/15 cursor-pointer"
                >
                  Discover
                </button>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 border border-border-custom text-muted hover:bg-accent-light/20 rounded-sm text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={discoveryState !== 'connected'}
              onClick={() => setStep(3)}
              className="flex-1 py-3 bg-accent text-white font-bold rounded-sm shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              Next: WiFi Provisioning
            </button>
          </div>
        </section>
      )}

      {/* STEP 3: WiFi Provisioning */}
      {step === 3 && (
        <section className="card-glass p-6 space-y-5">
          <div className="space-y-1.5 text-center">
            <h3 className="text-base font-bold tracking-tight">WiFi Provisioning</h3>
            <p className="text-[11px] text-muted">Configure dispenser credentials to bind with home network</p>
          </div>

          {/* Connection inputs */}
          <div className="space-y-3.5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">WiFi SSID Name</label>
              <input
                type="text"
                value={wifiSsid}
                onChange={(e) => setWifiSsid(e.target.value)}
                placeholder="e.g. Home_Network_5G"
                className="input-custom text-xs"
              />
            </div>
            
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted">WiFi Password</label>
              <input
                type="password"
                value={wifiPassword}
                onChange={(e) => setWifiPassword(e.target.value)}
                placeholder="Enter password key"
                className="input-custom text-xs"
              />
            </div>
          </div>

          {/* Provisioning log messages */}
          {provisionState !== 'idle' && (
            <div className="p-3 border border-border-custom dark:border-slate-800 bg-primary/20 dark:bg-slate-900/10 rounded-sm space-y-2">
              <div className="flex items-center gap-2">
                {(provisionState === 'provisioning' || provisionState === 'verifying') && (
                  <span className="material-symbols-outlined animate-spin text-sm text-accent dark:text-[#a78bfa]">sync</span>
                )}
                {provisionState === 'success' && (
                  <span className="material-symbols-outlined text-sm text-success-custom">check_circle</span>
                )}
                {provisionState === 'failed' && (
                  <span className="material-symbols-outlined text-sm text-error-custom">error</span>
                )}
                <span className="text-[10px] font-bold font-mono uppercase text-muted tracking-wider">
                  {provisionState === 'provisioning' ? 'Provisioning...' : 
                   provisionState === 'verifying' ? 'Verifying...' : 
                   provisionState === 'success' ? 'Connected' : 'Failed'}
                </span>
              </div>
              <p className="text-[10px] text-muted leading-relaxed font-sans">{provisionMessage}</p>
            </div>
          )}

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              disabled={provisionState === 'provisioning' || provisionState === 'verifying'}
              onClick={handleProvisionWiFi}
              className="w-full py-3 bg-accent text-white font-bold rounded-sm shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              Provision WiFi &amp; Connect
            </button>
            <button
              type="button"
              onClick={handleSkipProvision}
              className="w-full py-2.5 border border-border-custom text-muted hover:bg-accent-light/20 rounded-sm text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Skip: Use Current Network (Local IP)
            </button>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex-grow py-3 border border-border-custom text-muted hover:bg-accent-light/20 rounded-sm text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={provisionState !== 'success'}
              onClick={() => setStep(4)}
              className="flex-grow py-3 bg-accent text-white font-bold rounded-sm shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              Next: Test Hardware
            </button>
          </div>
        </section>
      )}

      {/* STEP 4: Interactive Hardware Verification */}
      {step === 4 && (
        <section className="card-glass p-6 space-y-5">
          <div className="space-y-1.5 text-center">
            <h3 className="text-base font-bold tracking-tight">Hardware Verification</h3>
            <p className="text-[11px] text-muted">Confirm physical hardware sensors are operational</p>
          </div>

          {/* Bento list of interactive diagnostics test cards */}
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            
            {/* 1. Speaker chime test */}
            <div className="p-3.5 border border-border-custom dark:border-slate-800 rounded-sm bg-primary/20 dark:bg-slate-900/10 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">volume_up</span>
                    <span>1. Speaker Buzzer</span>
                  </h4>
                  <p className="text-[10px] text-muted">Test speaker tone audio driver</p>
                </div>
                {audioVerified === 'yes' ? (
                  <span className="px-2 py-0.5 bg-success-bg/80 text-success-custom text-[8px] font-bold rounded-full uppercase border border-success-custom/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 text-muted dark:bg-slate-800 text-[8px] font-bold rounded-full uppercase border border-border-custom">Pending</span>
                )}
              </div>
              
              {audioVerified !== 'yes' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestSpeaker}
                    className="px-3.5 py-1.5 bg-accent-light text-accent dark:bg-slate-800 dark:text-[#a78bfa] hover:bg-accent/15 text-[10px] font-bold rounded-sm border border-accent/10 transition-all cursor-pointer"
                  >
                    {audioVerified === 'testing' ? 'Beeping...' : 'Trigger Beep'}
                  </button>
                  <span className="text-[10px] text-muted">Did you hear the beep?</span>
                  <button
                    type="button"
                    onClick={() => setAudioVerified('yes')}
                    className="ml-auto px-3 py-1 bg-success-bg text-success-custom border border-success-custom/20 text-[10px] font-bold rounded-sm hover:bg-success-custom hover:text-white transition-all cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              )}
            </div>

            {/* 2. Stepper motor rotate */}
            <div className="p-3.5 border border-border-custom dark:border-slate-800 rounded-sm bg-primary/20 dark:bg-slate-900/10 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">rotate_right</span>
                    <span>2. Stepper Motors</span>
                  </h4>
                  <p className="text-[10px] text-muted">Test rotation cycle on Slot #1</p>
                </div>
                {motorVerified === 'yes' ? (
                  <span className="px-2 py-0.5 bg-success-bg/80 text-success-custom text-[8px] font-bold rounded-full uppercase border border-success-custom/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 text-muted dark:bg-slate-800 text-[8px] font-bold rounded-full uppercase border border-border-custom">Pending</span>
                )}
              </div>
              
              {motorVerified !== 'yes' && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestMotor}
                    className="px-3.5 py-1.5 bg-accent-light text-accent dark:bg-slate-800 dark:text-[#a78bfa] hover:bg-accent/15 text-[10px] font-bold rounded-sm border border-accent/10 transition-all cursor-pointer"
                  >
                    {motorVerified === 'testing' ? 'Rotating...' : 'Rotate Slot 1'}
                  </button>
                  <span className="text-[10px] text-muted">Did Slot 1 rotate?</span>
                  <button
                    type="button"
                    onClick={() => setMotorVerified('yes')}
                    className="ml-auto px-3 py-1 bg-success-bg text-success-custom border border-success-custom/20 text-[10px] font-bold rounded-sm hover:bg-success-custom hover:text-white transition-all cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              )}
            </div>

            {/* 3. IR beam blockage */}
            <div className="p-3.5 border border-border-custom dark:border-slate-800 rounded-sm bg-primary/20 dark:bg-slate-900/10 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">visibility_off</span>
                    <span>3. IR Sensor</span>
                  </h4>
                  <p className="text-[10px] text-muted">Pill drop detector beam calibration</p>
                </div>
                {irVerified === 'yes' ? (
                  <span className="px-2 py-0.5 bg-success-bg/80 text-success-custom text-[8px] font-bold rounded-full uppercase border border-success-custom/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                    <span>Sensor Detected ✓</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 text-muted dark:bg-slate-800 text-[8px] font-bold rounded-full uppercase border border-border-custom">Pending</span>
                )}
              </div>
              
              {irVerified !== 'yes' && (
                <div className="flex flex-col gap-2 bg-white/30 dark:bg-slate-850 p-2.5 rounded-sm border border-border-custom dark:border-slate-800 text-[10px] leading-relaxed">
                  <span className="font-semibold text-accent dark:text-[#a78bfa] block">Action Required:</span>
                  <span>Block the IR sensor beam with a finger or card, then click Verify Sensor.</span>
                  <button
                    type="button"
                    onClick={handleTestIR}
                    className="mt-1.5 py-1.5 bg-accent text-white hover:bg-accent-hover text-[10px] font-bold rounded-sm transition-all cursor-pointer"
                  >
                    {irVerified === 'testing' ? 'Verifying Sensor Beam...' : 'Verify Sensor'}
                  </button>
                </div>
              )}
            </div>

            {/* 4. RTC clock synchronization */}
            <div className="p-3.5 border border-border-custom dark:border-slate-800 rounded-sm bg-primary/20 dark:bg-slate-900/10 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>4. RTC Clock Sync</span>
                  </h4>
                  <p className="text-[10px] text-muted">Synchronize DS3231 timekeeper chip</p>
                </div>
                {rtcVerified === 'yes' ? (
                  <span className="px-2 py-0.5 bg-success-bg/80 text-success-custom text-[8px] font-bold rounded-full uppercase border border-success-custom/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                    <span>RTC Synchronized ✓</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 text-muted dark:bg-slate-800 text-[8px] font-bold rounded-full uppercase border border-border-custom">Pending</span>
                )}
              </div>
              
              {rtcVerified !== 'yes' && (
                <button
                  type="button"
                  onClick={handleTestRTC}
                  className="w-full py-2 bg-accent-light text-accent dark:bg-slate-800 dark:text-[#a78bfa] hover:bg-accent/15 text-[10px] font-bold rounded-sm border border-accent/10 transition-all cursor-pointer"
                >
                  {rtcVerified === 'testing' ? 'Syncing RTC Clock...' : 'Sync RTC with Device time'}
                </button>
              )}
            </div>

            {/* 5. LCD screen messaging */}
            <div className="p-3.5 border border-border-custom dark:border-slate-800 rounded-sm bg-primary/20 dark:bg-slate-900/10 space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-0.5">
                  <h4 className="text-xs font-bold flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm">monitor</span>
                    <span>5. OLED Display Panel</span>
                  </h4>
                  <p className="text-[10px] text-muted">SSD1306 display panel rendering checks</p>
                </div>
                {lcdVerified === 'yes' ? (
                  <span className="px-2 py-0.5 bg-success-bg/80 text-success-custom text-[8px] font-bold rounded-full uppercase border border-success-custom/10 flex items-center gap-0.5">
                    <span className="material-symbols-outlined text-[10px]">check</span>
                    <span>Verified</span>
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-slate-200 text-muted dark:bg-slate-800 text-[8px] font-bold rounded-full uppercase border border-border-custom">Pending</span>
                )}
              </div>
              
              {lcdVerified !== 'yes' && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-muted">Is OLED showing correct time?</span>
                  <button
                    type="button"
                    onClick={() => setLcdVerified('yes')}
                    className="ml-auto px-3.5 py-1 bg-success-bg text-success-custom border border-success-custom/20 text-[10px] font-bold rounded-sm hover:bg-success-custom hover:text-white transition-all cursor-pointer"
                  >
                    Yes
                  </button>
                </div>
              )}
            </div>

          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setStep(3)}
              className="flex-1 py-3 border border-border-custom text-muted hover:bg-accent-light/20 rounded-sm text-xs font-bold transition-all active:scale-95 cursor-pointer"
            >
              Back
            </button>
            <button
              type="button"
              disabled={
                audioVerified !== 'yes' || 
                motorVerified !== 'yes' || 
                irVerified !== 'yes' || 
                rtcVerified !== 'yes' || 
                lcdVerified !== 'yes'
              }
              onClick={handleFinishSetup}
              className="flex-1 py-3 bg-accent text-white font-bold rounded-sm shadow-md transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
            >
              Finish &amp; Enter
            </button>
          </div>
        </section>
      )}

    </div>
  );
}
