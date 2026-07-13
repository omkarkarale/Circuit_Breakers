export interface Medicine {
  id: string;
  slot: 1 | 2 | 3;
  name: string;
  remainingPills: number;
  maxPills: number;
  dosePerReminder: number;
  lowStockThreshold?: number;
  repeatPattern: 'Daily' | string;
  schedules: string[];
  enabled: boolean;
  color: string;
  category?: string;
  instructions?: string;
}

export interface Log {
  id: string;
  timestamp: string | number;
  medicineName: string;
  status: 'Taken' | 'Missed' | 'Cancelled' | 'Failed' | 'Refilled';
  category?: 'All' | 'Dispensed' | 'Missed' | 'Refilled' | 'Diagnostics' | 'WiFi' | 'Errors';
  dosageText: string;
  detailText: string;
}

export interface NotificationsConfig {
  medicineReminder: boolean;
  missedDoseAlert: boolean;
  lowMedicineAlert: boolean;
  deviceOfflineAlert: boolean;
}

export interface Settings {
  apiMode: 'REAL_DEVICE' | 'SIMULATOR';
  esp32Ip: string;
  tempThreshold?: number;
  notifications: NotificationsConfig;
}

export interface HardwareComponent {
  id: string;
  name: string;
  status: 'Healthy' | 'Warning' | 'Offline' | 'Testing';
  description: string;
}

export interface DeviceConfig {
  connected: boolean;
  strength?: number;
  batterySupported?: boolean;
  battery?: number;
  tempSupported?: boolean;
  internalTemp?: number;
  speakerSupported?: boolean;
  irSupported?: boolean;
  rtcSupported?: boolean;
  lcdSupported?: boolean;
}
