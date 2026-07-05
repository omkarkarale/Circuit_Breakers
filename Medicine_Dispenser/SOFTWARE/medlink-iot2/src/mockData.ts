import { Medicine, Log, HardwareComponent, DeviceConfig } from './types';

export const INITIAL_MEDICINES: Medicine[] = [
  {
    id: 'med-1',
    name: 'Metformin',
    type: 'Tablet',
    color: '#3b82f6', // blue
    slot: 2,
    remainingPills: 15,
    maxPills: 30,
    dosePerReminder: 1,
    repeatPattern: 'Daily',
    schedules: ['08:00 AM', '02:00 PM', '08:00 PM'],
    enabled: true,
    category: 'Antidiabetic Medication',
    instructions: 'Take with food as prescribed by Dr. Henderson.'
  },
  {
    id: 'med-2',
    name: 'Atorvastatin',
    type: 'Tablet',
    color: '#ef4444', // red
    slot: 1,
    remainingPills: 12,
    maxPills: 40,
    dosePerReminder: 1,
    repeatPattern: 'Daily',
    schedules: ['09:00 PM'],
    enabled: true,
    category: 'Cholesterol Medication',
    instructions: 'Take before bedtime.'
  },
  {
    id: 'med-3',
    name: 'Lisinopril',
    type: 'Tablet',
    color: '#10b981', // green
    slot: 3,
    remainingPills: 24,
    maxPills: 30,
    dosePerReminder: 1,
    repeatPattern: 'Daily',
    schedules: ['10:30 AM'],
    enabled: false,
    category: 'Hypertension Medication',
    instructions: 'Monitor blood pressure regularly.'
  }
];

export const INITIAL_LOGS: Log[] = [
  {
    id: 'log-1',
    timestamp: new Date().toISOString(), // Today
    medicineId: 'med-1',
    medicineName: 'Metformin',
    dosageText: '08:00 AM • 500mg Oral',
    status: 'Taken',
    detailText: 'Dispensed successfully from SmartBox Slot A2.'
  },
  {
    id: 'log-2',
    timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // Today, 2 hours ago
    medicineId: 'med-3',
    medicineName: 'Lisinopril',
    dosageText: '10:30 AM • 10mg Oral',
    status: 'Cancelled',
    detailText: 'Manual override by user. Stated "Will take later with meal".'
  },
  {
    id: 'log-3',
    timestamp: new Date(Date.now() - 13 * 60 * 60 * 1000).toISOString(), // Yesterday
    medicineId: 'med-2',
    medicineName: 'Atorvastatin',
    dosageText: '09:00 PM • 20mg Oral',
    status: 'Failed',
    detailText: 'IoT Device Hardware Jam detected in Slot C1. Please inspect device.'
  },
  {
    id: 'log-4',
    timestamp: new Date(Date.now() - 22 * 60 * 60 * 1000).toISOString(), // Yesterday
    medicineId: 'med-4',
    medicineName: 'Vitamin D3',
    dosageText: '12:00 PM • 1000 IU',
    status: 'Missed',
    detailText: 'No response to 3 repeated alerts. Window closed at 02:00 PM.'
  },
  {
    id: 'log-5',
    timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Yesterday morning
    medicineId: 'med-1',
    medicineName: 'Metformin',
    dosageText: '08:00 AM • 500mg Oral',
    status: 'Taken',
    detailText: 'Dispensed successfully. Adherence streak: 12 days.'
  }
];

export const INITIAL_HARDWARE: HardwareComponent[] = [
  {
    id: 'hw-motor-1',
    name: 'Stepper Motor 1',
    description: 'Dispenser Drive A (Slot 1)',
    status: 'Working',
    icon: 'settings_motion_mode'
  },
  {
    id: 'hw-motor-2',
    name: 'Stepper Motor 2',
    description: 'Dispenser Drive B (Slot 2)',
    status: 'Working',
    icon: 'settings_motion_mode'
  },
  {
    id: 'hw-motor-3',
    name: 'Stepper Motor 3',
    description: 'High Friction Detected (Slot 3)',
    status: 'Warning',
    icon: 'warning'
  },
  {
    id: 'hw-rtc',
    name: 'RTC Module',
    description: 'Precision clock synchronization',
    status: 'Working',
    icon: 'schedule'
  },
  {
    id: 'hw-ir',
    name: 'IR Sensor',
    description: 'Pill detection beam',
    status: 'Offline',
    icon: 'visibility_off'
  },
  {
    id: 'hw-speaker',
    name: 'Speaker',
    description: 'Audio prompt speaker',
    status: 'Working',
    icon: 'volume_up'
  },
  {
    id: 'hw-oled',
    name: 'OLED Display',
    description: '128x64 Active panel',
    status: 'Working',
    icon: 'monitor'
  },
  {
    id: 'hw-wifi',
    name: 'WiFi Stack',
    description: 'RSSI: -42dBm, ESP32 Radio',
    status: 'Working',
    icon: 'wifi'
  }
];

export const INITIAL_CONFIG: DeviceConfig = {
  connected: true,
  ssid: 'Home_Network_5G',
  strength: 4,
  battery: 85,
  lastSync: '2 mins ago',
  firmware: 'v2.4.1-stable',
  internalTemp: 34.2,
  batterySupported: false,
  tempSupported: false
};
