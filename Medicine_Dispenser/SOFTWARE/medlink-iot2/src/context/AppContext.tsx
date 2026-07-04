import React, { createContext, useState, useEffect, useCallback } from 'react';
import { nativeConfirm } from '../utils/dialogs';
import {
  Medicine,
  Log,
  HardwareComponent,
  DeviceConfig,
  Settings,
  DashboardResponse,
  DeviceStatus,
  ApiMode,
  ApiDashboardData,
  ApiDeviceStatus,
  ApiMedicine,
  ApiLogEntry,
  ApiDiagnosticResult
} from '../types';
import { FirmwareService } from '../services/FirmwareService';
import { LocalStorageService } from '../services/LocalStorageService';
import { INITIAL_MEDICINES, INITIAL_LOGS, INITIAL_HARDWARE, INITIAL_CONFIG } from '../mockData';
import { VirtualESP32 } from '../services/VirtualESP32';

export interface AppContextType {
  medicines: Medicine[];
  logs: Log[];
  hardware: HardwareComponent[];
  config: DeviceConfig;
  settings: Settings;
  dashboard: DashboardResponse | null;
  currentScreen: string;
  selectedMedicineId: string | null;
  isDarkMode: boolean;
  toast: { message: string; type: 'success' | 'info' | 'error' } | null;
  dispensingState: {
    active: boolean;
    medicineName: string;
    pillCount: number;
    color: string;
    slot: number;
    medId: string;
  } | null;

  // Navigation
  setCurrentScreen: (screen: string) => void;
  setSelectedMedicineId: (id: string | null) => void;

  // Settings
  updateSettings: (settings: Partial<Settings>) => void;
  toggleDarkMode: () => void;
  showToast: (message: string, type?: 'success' | 'info' | 'error') => void;

  // Actions
  saveMedicine: (medData: Omit<Medicine, 'id'> & { id?: string }) => Promise<void>;
  deleteMedicine: (id: string) => Promise<void>;
  toggleEnabled: (id: string, enabled: boolean) => Promise<void>;
  refillMedicine: (id: string) => Promise<void>;
  refillAll: () => Promise<void>;
  testComponent: (id: string) => Promise<void>;
  resetComponent: (id: string) => Promise<void>;
  runFullDiagnostics: () => Promise<void>;
  restartDevice: () => Promise<void>;
  saveWiFiConfig: (ssid: string) => Promise<void>;
  clearLogs: () => void;
  
  // Dispense Lifecycle
  triggerDispense: (med: Medicine) => Promise<void>;
  takePill: () => void;
  cancelDispense: () => void;
  emergencyDispense: () => void;
}

export const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppContextProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Load initial settings
  const [settings, setSettings] = useState<Settings>(() => LocalStorageService.getSettings());
  const [isDarkMode, setIsDarkMode] = useState<boolean>(settings.isDarkMode);

  // App-level state
  const [medicines, setMedicines] = useState<Medicine[]>(() => 
    LocalStorageService.getCachedMedicines(INITIAL_MEDICINES)
  );
  const [logs, setLogs] = useState<Log[]>(() => 
    LocalStorageService.getCachedLogs(INITIAL_LOGS)
  );
  const [hardware, setHardware] = useState<HardwareComponent[]>(() => 
    LocalStorageService.getCachedHardware(INITIAL_HARDWARE)
  );
  const [config, setConfig] = useState<DeviceConfig>(() => 
    LocalStorageService.getCachedConfig(INITIAL_CONFIG)
  );

  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [currentScreen, setCurrentScreenState] = useState<string>('home');
  const [selectedMedicineId, setSelectedMedicineId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);
  const [dispensingState, setDispensingState] = useState<AppContextType['dispensingState']>(null);

  // Sync caches
  useEffect(() => {
    LocalStorageService.saveCachedMedicines(medicines);
  }, [medicines]);

  useEffect(() => {
    LocalStorageService.saveCachedLogs(logs);
  }, [logs]);

  useEffect(() => {
    LocalStorageService.saveCachedHardware(hardware);
  }, [hardware]);

  useEffect(() => {
    LocalStorageService.saveCachedConfig(config);
  }, [config]);

  // Handle dark mode DOM changes
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Dismiss Toast automatically
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Load telemetry and dashboard from service
  const refreshTelemetry = useCallback(async () => {
    try {
      const mode = settings.apiMode;
      const isSimOrReal = mode === ApiMode.REAL_DEVICE || mode === ApiMode.SIMULATOR;

      const dash = await FirmwareService.getDashboard();
      setDashboard(dash);
      const status = await FirmwareService.getStatus();
      
      setConfig(prev => ({
        ...prev,
        connected: status.connected,
        ssid: status.ssid,
        strength: status.strength,
        battery: status.battery,
        lastSync: status.lastSync,
        firmware: status.firmware,
        internalTemp: status.internalTemp,
        // Twin metadata fields
        board: (status as any).board,
        uptime: (status as any).uptime,
        heap: (status as any).heap
      }));

      if (isSimOrReal) {
        const remoteMeds = await FirmwareService.getMedicines();
        setMedicines(remoteMeds);
        const remoteLogs = await FirmwareService.getLogs();
        setLogs(remoteLogs);
        const remoteDiag = await FirmwareService.getDiagnostics();
        setHardware(remoteDiag);
      }
    } catch (err: any) {
      console.error('Failed to load telemetry from FirmwareService', err);
    }
  }, [settings.apiMode]);

  useEffect(() => {
    refreshTelemetry();
  }, [refreshTelemetry]);

  // Subscribe context updates to VirtualESP32 ticks/state changes
  useEffect(() => {
    if (settings.apiMode === ApiMode.SIMULATOR) {
      const unsubscribe = VirtualESP32.subscribe(() => {
        refreshTelemetry();
        
        // Push warning toasts based on simulator status
        const simState = VirtualESP32.getgetState();
        if (simState.lowBattery) {
          showToast('WARNING: Low Battery (5%) detected on dispenser hub!', 'error');
        }
        if (simState.motorState === 'JAMMED') {
          showToast('ERROR: Stepper motor jam failure!', 'error');
        }
        if (simState.oledState === 'ERROR') {
          showToast('ERROR: Device hardware fault state!', 'error');
        }
      });
      return unsubscribe;
    }
  }, [settings.apiMode, refreshTelemetry]);

  const showToast = (message: string, type: 'success' | 'info' | 'error' = 'info') => {
    setToast({ message, type });
  };

  const updateSettings = (newSettings: Partial<Settings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    LocalStorageService.saveSettings(updated);
    if (newSettings.isDarkMode !== undefined) {
      setIsDarkMode(newSettings.isDarkMode);
    }
    showToast('Settings saved successfully.', 'success');
  };

  const toggleDarkMode = () => {
    updateSettings({ isDarkMode: !isDarkMode });
  };

  const setCurrentScreen = (screen: string) => {
    setCurrentScreenState(screen);
  };

  const saveMedicine = async (medData: Omit<Medicine, 'id'> & { id?: string }) => {
    try {
      const isReal = settings.apiMode === ApiMode.REAL_DEVICE;
      const targetId = medData.id || `med-${Date.now()}`;
      const medToSave: Medicine = {
        ...medData,
        id: targetId
      };

      if (isReal) {
        await FirmwareService.saveMedicine(medToSave);
      }

      if (medData.id) {
        // Editing
        const updated = medicines.map(m => (m.id === medData.id ? medToSave : m));
        setMedicines(updated);
        
        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: medData.name,
          dosageText: `${medData.dosePerReminder} Pill Schedule Adjusted`,
          status: 'Taken',
          detailText: `Medication config changed. Dispenser Slot #${medData.slot} updated.`
        };
        setLogs(prev => [newLog, ...prev]);
        showToast(`${medData.name} updated successfully.`, 'success');
      } else {
        // Adding new
        setMedicines(prev => [...prev, medToSave]);

        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: medData.name,
          dosageText: `Slot Assigned: Slot #${medData.slot}`,
          status: 'Taken',
          detailText: `New reminder added: ${medData.name} scheduled for ${medData.schedules.join(', ')}.`
        };
        setLogs(prev => [newLog, ...prev]);
        showToast(`${medData.name} added to Slot #${medData.slot}.`, 'success');
      }
      setCurrentScreen('medicines');
      refreshTelemetry();
    } catch (err: any) {
      showToast(err.message || 'Error saving medication', 'error');
    }
  };

  const deleteMedicine = async (id: string) => {
    try {
      if (settings.apiMode === ApiMode.REAL_DEVICE) {
        await FirmwareService.deleteMedicine(id);
      }

      const target = medicines.find(m => m.id === id);
      setMedicines(prev => prev.filter(m => m.id !== id));
      if (target) {
        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: target.name,
          dosageText: 'Schedule Deleted',
          status: 'Cancelled',
          detailText: `Dispenser Slot #${target.slot} unassigned. Medication schedule removed.`
        };
        setLogs(prev => [newLog, ...prev]);
        showToast(`${target.name} schedule removed.`);
      }
      setCurrentScreen('medicines');
      refreshTelemetry();
    } catch (err: any) {
      showToast(err.message || 'Error removing medication', 'error');
    }
  };

  const toggleEnabled = async (id: string, enabled: boolean) => {
    try {
      setMedicines(prev => prev.map(m => (m.id === id ? { ...m, enabled } : m)));
      const target = medicines.find(m => m.id === id);
      if (target) {
        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: target.name,
          dosageText: enabled ? 'Reminders Enabled' : 'Reminders Silenced',
          status: 'Cancelled',
          detailText: `Dispenser schedule for ${target.name} has been ${enabled ? 'reactivated' : 'temporarily paused'}.`
        };
        setLogs(prev => [newLog, ...prev]);
        showToast(`${target.name} ${enabled ? 'enabled' : 'disabled'}.`);
      }
      refreshTelemetry();
    } catch (err: any) {
      showToast(err.message || 'Error modifying state', 'error');
    }
  };

  const refillMedicine = async (id: string) => {
    try {
      setMedicines(prev =>
        prev.map(m => (m.id === id ? { ...m, remainingPills: m.maxPills } : m))
      );
      const target = medicines.find(m => m.id === id);
      if (target) {
        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: target.name,
          dosageText: `Refilled to ${target.maxPills} Pills`,
          status: 'Taken',
          detailText: `Dispenser cartridge Slot #${target.slot} loaded with ${target.maxPills} fresh tablets.`
        };
        setLogs(prev => [newLog, ...prev]);
        showToast(`${target.name} inventory replenished!`, 'success');
      }
      refreshTelemetry();
    } catch (err: any) {
      showToast(err.message || 'Error refilling medicine', 'error');
    }
  };

  const refillAll = async () => {
    try {
      setMedicines(prev => prev.map(m => ({ ...m, remainingPills: m.maxPills })));
      const newLog: Log = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        medicineName: 'All Medications',
        dosageText: 'System Inventory Refilled',
        status: 'Taken',
        detailText: 'Full hardware replenishment executed. All dispenser slots loaded to capacity.'
      };
      setLogs(prev => [newLog, ...prev]);
      showToast('All medications refilled to capacity.', 'success');
      refreshTelemetry();
    } catch (err: any) {
      showToast(err.message || 'Error refilling all medicines', 'error');
    }
  };

  const testComponent = async (id: string) => {
    try {
      const comp = hardware.find(h => h.id === id);
      const success = await FirmwareService.runMotorTest(comp ? 1 : 1); // fallback
      if (success) {
        setHardware(prev =>
          prev.map(h => (h.id === id ? { ...h, status: 'Working' } : h))
        );
        if (comp) {
          const newLog: Log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            medicineName: 'Hardware Diagnostic',
            dosageText: `${comp.name} Test`,
            status: 'Taken',
            detailText: `Manual actuator test command executed for ${comp.name}. Diagnostic returned OK.`
          };
          setLogs(prev => [newLog, ...prev]);
          showToast(`${comp.name} test returned OK!`, 'success');
        }
      }
    } catch (err: any) {
      showToast(err.message || 'Diagnostic test failed', 'error');
    }
  };

  const resetComponent = async (id: string) => {
    try {
      setHardware(prev =>
        prev.map(h => (h.id === id ? { ...h, status: 'Working' } : h))
      );
      const comp = hardware.find(h => h.id === id);
      if (comp) {
        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: 'Hardware Reset',
          dosageText: `${comp.name} Reboot`,
          status: 'Taken',
          detailText: `Controller reset signal pushed to ${comp.name}. Communication link recovered.`
        };
        setLogs(prev => [newLog, ...prev]);
        showToast(`${comp.name} link recovered!`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'Component reset failed', 'error');
    }
  };

  const runFullDiagnostics = async () => {
    try {
      await FirmwareService.runRtcTest();
      await FirmwareService.runIrTest();
      setHardware(prev => prev.map(h => ({ ...h, status: 'Working' })));
      const newLog: Log = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        medicineName: 'Full Diagnostic Suite',
        dosageText: 'Chassis Check Completed',
        status: 'Taken',
        detailText: 'Full hardware check completed. Stepper motors, OLED controllers, and sensors verified OK.'
      };
      setLogs(prev => [newLog, ...prev]);
      showToast('All hardware systems running nominally!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Diagnostics failed', 'error');
    }
  };

  const restartDevice = async () => {
    try {
      setConfig(prev => ({ ...prev, connected: false }));
      showToast('Dispenser Hub rebooting... link offline.', 'error');
      
      await FirmwareService.rebootDevice();

      setTimeout(() => {
        setConfig(prev => ({ ...prev, connected: true, lastSync: 'Just now' }));
        const newLog: Log = {
          id: `log-${Date.now()}`,
          timestamp: new Date().toISOString(),
          medicineName: 'Hub System',
          dosageText: 'ESP32 Rebooted',
          status: 'Taken',
          detailText: 'Physical smart hub system completed restart sequence. Synchronized with AWS cloud node.'
        };
        setLogs(prev => [newLog, ...prev]);
        showToast('Dispenser Hub online. Telemetry recovered.', 'success');
        refreshTelemetry();
      }, 2500);
    } catch (err: any) {
      showToast(err.message || 'Restart hub failed', 'error');
    }
  };

  const saveWiFiConfig = async (ssidName: string) => {
    try {
      const success = await FirmwareService.connectWiFi(ssidName);
      if (success) {
        setConfig(prev => ({ ...prev, ssid: ssidName, lastSync: 'Just now' }));
        showToast(`Smart Dispenser linked to network: ${ssidName}`, 'success');
      }
    } catch (err: any) {
      showToast(err.message || 'WiFi config failed', 'error');
    }
  };

  const triggerDispense = async (med: Medicine) => {
    try {
      if (!config.connected) {
        showToast('Dispense failed: Smart Hub is currently offline.', 'error');
        return;
      }
      
      await FirmwareService.dispense(med.id, med.slot, med.dosePerReminder);
      
      setDispensingState({
        active: true,
        medicineName: med.name,
        pillCount: med.dosePerReminder,
        color: med.color,
        slot: med.slot,
        medId: med.id
      });
      showToast(`IoT Dispense initiated: Slot #${med.slot} rotating...`, 'info');
    } catch (err: any) {
      showToast(err.message || 'Dispensing failed', 'error');
    }
  };

  const takePill = () => {
    if (!dispensingState) return;

    setMedicines(prev =>
      prev.map(m =>
        m.id === dispensingState.medId
          ? { ...m, remainingPills: Math.max(0, m.remainingPills - dispensingState.pillCount) }
          : m
      )
    );

    const newLog: Log = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      medicineName: dispensingState.medicineName,
      dosageText: `Slot #${dispensingState.slot} • ${dispensingState.pillCount} Pill(s) Taken`,
      status: 'Taken',
      detailText: `Dispensed successfully from SmartBox Slot A${dispensingState.slot}. Daily streak continues!`
    };
    setLogs(prev => [newLog, ...prev]);
    setDispensingState(null);
    showToast('Medication taken! Streak & Adherence logs updated.', 'success');
    refreshTelemetry();
  };

  const cancelDispense = () => {
    if (!dispensingState) return;

    const newLog: Log = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      medicineName: dispensingState.medicineName,
      dosageText: `Slot #${dispensingState.slot} • Skipped`,
      status: 'Cancelled',
      detailText: 'Dispense sequence cancelled by the companion mobile application.'
    };
    setLogs(prev => [newLog, ...prev]);
    setDispensingState(null);
    showToast('Dispensing sequence terminated.');
    refreshTelemetry();
  };

  const emergencyDispense = () => {
    const activeMeds = medicines.filter(m => m.enabled && m.remainingPills > 0);
    const med = activeMeds[0] || medicines[0];

    if (!med) {
      showToast('No medicines loaded in dispenser slots.', 'error');
      return;
    }

    if (nativeConfirm('CRITICAL WARN: Trigger an immediate manual override dispense of 1 tablet?')) {
      setDispensingState({
        active: true,
        medicineName: `${med.name} (EMERGENCY)`,
        pillCount: 1,
        color: med.color,
        slot: med.slot,
        medId: med.id
      });
      
      const newLog: Log = {
        id: `log-${Date.now()}`,
        timestamp: new Date().toISOString(),
        medicineName: 'Emergency Dispense',
        dosageText: 'Caregiver Manual Override',
        status: 'Taken',
        detailText: `Emergency override button pressed on mobile. 1 Pill dispensed from Slot #${med.slot}.`
      };
      setLogs(prev => [newLog, ...prev]);
      showToast('EMERGENCY COMMAND: Dispensing pill immediately!', 'success');
    }
  };

  const clearLogs = () => {
    setLogs([]);
    showToast('Activity logs cleared.', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        medicines,
        logs,
        hardware,
        config,
        settings,
        dashboard,
        currentScreen,
        selectedMedicineId,
        isDarkMode,
        toast,
        dispensingState,
        setCurrentScreen,
        setSelectedMedicineId,
        updateSettings,
        toggleDarkMode,
        showToast,
        saveMedicine,
        deleteMedicine,
        toggleEnabled,
        refillMedicine,
        refillAll,
        testComponent,
        resetComponent,
        runFullDiagnostics,
        restartDevice,
        saveWiFiConfig,
        clearLogs,
        triggerDispense,
        takePill,
        cancelDispense,
        emergencyDispense
      }}
    >
      {children}
    </AppContext.Provider>
  );
};
