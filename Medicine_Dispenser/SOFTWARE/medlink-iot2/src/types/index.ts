/**
 * Types for MedLink IoT Smart Medicine Dispenser
 */

export type MedicineType = 'Tablet' | 'Capsule' | 'Softgel';

export interface Medicine {
  id: string;
  name: string;
  type: MedicineType;
  color: string; // hex or tailwind class name
  slot: 1 | 2 | 3;
  remainingPills: number;
  maxPills: number;
  dosePerReminder: number;
  repeatPattern: 'Daily' | 'Weekdays' | 'Custom';
  schedules: string[]; // e.g. ["08:00 AM", "09:00 PM"]
  enabled: boolean;
  category?: string; // e.g. "Antidiabetic", "Cholesterol", "Hypertension"
  instructions?: string; // e.g. "Take with food as prescribed"
}

export type LogStatus = 'Taken' | 'Missed' | 'Cancelled' | 'Failed';

export interface Log {
  id: string;
  timestamp: string; // ISO string
  medicineId?: string;
  medicineName: string;
  dosageText: string;
  status: LogStatus;
  detailText: string;
}

export interface HardwareComponent {
  id: string;
  name: string;
  description: string;
  status: 'Working' | 'Warning' | 'Offline';
  icon: string; // Lucide icon name or Material Symbol name
}

export interface DeviceConfig {
  connected: boolean;
  ssid: string;
  strength: number; // 0 to 4
  battery: number; // 0 to 100
  lastSync: string; // relative time or ISO string
  firmware: string;
  internalTemp: number; // in Celsius
}

// Application Modes
export enum ApiMode {
  MOCK = 'MOCK',
  SIMULATOR = 'SIMULATOR',
  REAL_DEVICE = 'REAL_DEVICE'
}

// Application Settings
export interface Settings {
  esp32Ip: string;
  apiMode: ApiMode;
  isDarkMode: boolean;
  isDeveloperMode: boolean;
}

// WiFi Configuration payload
export interface WiFiConfiguration {
  ssid: string;
  password?: string;
}

// Summary interface for inventory views
export interface MedicineSummary {
  id: string;
  name: string;
  slot: 1 | 2 | 3;
  remainingPills: number;
  maxPills: number;
}

// Response payload for Dashboard stats
export interface DashboardResponse {
  nextDose: Medicine | null;
  adherencePercent: number;
  completedDoses: number;
  totalScheduledToday: number;
}

// Hardware component diagnostics status response
export interface DiagnosticResult {
  componentId: string;
  status: 'Working' | 'Warning' | 'Offline';
  details?: string;
}

// LogEntry matching Log interface or mapping
export interface LogEntry {
  id: string;
  timestamp: string;
  medicineId?: string;
  medicineName: string;
  dosageText: string;
  status: LogStatus;
  detailText: string;
}

// Device Status representing /api/v1/status
export interface DeviceStatus {
  connected: boolean;
  ssid: string;
  strength: number;
  battery: number;
  lastSync: string;
  firmware: string;
  internalTemp: number;
}

// ==========================================
// Raw ESP32 Firmware API Response Payload Interfaces
// ==========================================

export interface ApiSchedule {
  id: number;
  time: string;
  enabled: boolean;
}

export interface ApiMedicine {
  id: number;
  name: string;
  type: string;
  colorHex: string;
  slot: number;
  pillsRemaining: number;
  maxCapacity: number;
  dosePerReminder: number;
  repeatPattern: string;
  scheduleTimes: ApiSchedule[];
  isEnabled: boolean;
  lastTakenTime: string | null;
  streakDays: number;
  dosage: string;
}

export interface ApiLogEntry {
  id: number;
  medicationName: string;
  dosage: string;
  timestamp: number;
  status: string;
  description: string;
  categoryDate: string;
}

export interface ApiDiagnosticComponent {
  component: string;
  status: 'OK' | 'WARNING' | 'ERROR' | 'OFFLINE' | 'TESTING';
  lastTest: number | null;
  message: string | null;
}

export interface ApiDiagnosticResult {
  components: ApiDiagnosticComponent[];
  temperature: number;
}

export interface ApiDeviceStatus {
  connected: boolean;
  deviceName: string;
  firmwareVersion: string;
  uptimeSeconds: number;
  batteryPercentage: number;
  batteryCharging: boolean;
  wifiSSID: string;
  ipAddress: string;
  signalStrength: number;
  temperature: number;
  nextDoseCountdown: number;
}

export interface ApiDashboardData {
  deviceStatus: ApiDeviceStatus;
  nextDoseCountdown: number;
  adherencePercentage: number;
  inventory: ApiMedicine[];
  recentLogs: ApiLogEntry[];
}
