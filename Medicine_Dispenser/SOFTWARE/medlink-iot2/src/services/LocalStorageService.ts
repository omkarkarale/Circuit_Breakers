import { Settings, Medicine, Log, HardwareComponent, DeviceConfig, ApiMode } from '../types';

const SETTINGS_KEY = 'medlink_settings';
const MEDICINES_KEY = 'medlink_medicines';
const LOGS_KEY = 'medlink_logs';
const HARDWARE_KEY = 'medlink_hardware';
const CONFIG_KEY = 'medlink_config';

const DEFAULT_SETTINGS: Settings = {
  esp32Ip: '192.168.4.1',
  apiMode: ApiMode.REAL_DEVICE,
  theme: 'system',
  isDarkMode: false,
  isDeveloperMode: false,
  tempThreshold: 38,
  notifications: {
    upcomingReminders: true,
    dueNow: true,
    missedDoses: true,
    lowInventory: true,
    deviceDisconnected: true,
    wifiDisconnected: true,
    diagnosticsWarnings: true,
    hardwareFaults: true,
  },
  reminderSoundsEnabled: true,
  notificationSound: 'chime',
  speakerVolume: 75
};

export const LocalStorageService = {
  getSettings(): Settings {
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return DEFAULT_SETTINGS;
    try {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_SETTINGS, ...parsed };
    } catch {
      return DEFAULT_SETTINGS;
    }
  },

  saveSettings(settings: Settings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  },

  getCachedMedicines(fallback: Medicine[]): Medicine[] {
    const saved = localStorage.getItem(MEDICINES_KEY);
    if (!saved) return fallback;
    try {
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  },

  saveCachedMedicines(medicines: Medicine[]): void {
    localStorage.setItem(MEDICINES_KEY, JSON.stringify(medicines));
  },

  getCachedLogs(fallback: Log[]): Log[] {
    const saved = localStorage.getItem(LOGS_KEY);
    if (!saved) return fallback;
    try {
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  },

  saveCachedLogs(logs: Log[]): void {
    localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  },

  getCachedHardware(fallback: HardwareComponent[]): HardwareComponent[] {
    const saved = localStorage.getItem(HARDWARE_KEY);
    if (!saved) return fallback;
    try {
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  },

  saveCachedHardware(hardware: HardwareComponent[]): void {
    localStorage.setItem(HARDWARE_KEY, JSON.stringify(hardware));
  },

  getCachedConfig(fallback: DeviceConfig): DeviceConfig {
    const saved = localStorage.getItem(CONFIG_KEY);
    if (!saved) return fallback;
    try {
      return JSON.parse(saved);
    } catch {
      return fallback;
    }
  },

  saveCachedConfig(config: DeviceConfig): void {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  },

  clearAll(): void {
    localStorage.removeItem(SETTINGS_KEY);
    localStorage.removeItem(MEDICINES_KEY);
    localStorage.removeItem(LOGS_KEY);
    localStorage.removeItem(HARDWARE_KEY);
    localStorage.removeItem(CONFIG_KEY);
  }
};
