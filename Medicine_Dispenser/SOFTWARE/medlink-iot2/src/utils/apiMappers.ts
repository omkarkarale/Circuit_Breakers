import {
  DeviceConfig,
  ApiDeviceStatus,
  Medicine,
  ApiMedicine,
  MedicineType,
  Log,
  ApiLogEntry,
  LogStatus,
  HardwareComponent,
  ApiDiagnosticComponent
} from '../types';

/**
 * Maps raw ApiDeviceStatus from ESP32 to React internal DeviceConfig
 */
export function mapDeviceStatus(apiStatus: ApiDeviceStatus): DeviceConfig {
  return {
    connected: apiStatus.connected,
    ssid: apiStatus.wifiSSID,
    strength: apiStatus.signalStrength,
    battery: apiStatus.batteryPercentage,
    lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    firmware: apiStatus.firmwareVersion,
    internalTemp: apiStatus.temperature,
    batterySupported: apiStatus.batterySupported !== undefined ? apiStatus.batterySupported : false,
    tempSupported: apiStatus.tempSupported !== undefined 
      ? apiStatus.tempSupported 
      : (apiStatus.temperatureSupported !== undefined ? apiStatus.temperatureSupported : false),
    rtcSupported: apiStatus.rtcSupported !== undefined ? apiStatus.rtcSupported : true,
    speakerSupported: apiStatus.speakerSupported !== undefined ? apiStatus.speakerSupported : true,
    irSupported: apiStatus.irSupported !== undefined ? apiStatus.irSupported : true,
    lcdSupported: apiStatus.lcdSupported !== undefined ? apiStatus.lcdSupported : true,
    epochTime: apiStatus.epochTime,
    ipAddress: apiStatus.ipAddress
  };
}

/**
 * Maps raw ApiMedicine from ESP32 to React internal Medicine
 */
export function mapMedicine(apiMed: ApiMedicine): Medicine {
  return {
    id: String(apiMed.id),
    name: apiMed.name,
    type: apiMed.type as MedicineType,
    color: apiMed.colorHex || '#2563eb',
    slot: apiMed.slot as 1 | 2 | 3,
    remainingPills: apiMed.pillsRemaining,
    maxPills: apiMed.maxCapacity,
    dosePerReminder: apiMed.dosePerReminder,
    repeatPattern: apiMed.repeatPattern as 'Daily' | 'Weekdays' | 'Custom',
    schedules: apiMed.scheduleTimes ? apiMed.scheduleTimes.map(s => s.time) : [],
    enabled: apiMed.isEnabled,
    category: apiMed.dosage,
    instructions: apiMed.dosage
  };
}

/**
 * Maps React internal Medicine to raw ApiMedicine payload for saving to ESP32
 */
export function mapMedicineToApi(med: Medicine): Omit<ApiMedicine, 'streakDays' | 'lastTakenTime'> {
  return {
    id: isNaN(Number(med.id)) ? 0 : Number(med.id),
    name: med.name,
    type: med.type,
    colorHex: med.color,
    slot: med.slot,
    pillsRemaining: med.remainingPills,
    maxCapacity: med.maxPills,
    dosePerReminder: med.dosePerReminder,
    repeatPattern: med.repeatPattern,
    scheduleTimes: med.schedules.map((time, idx) => ({
      id: idx + 1,
      time,
      enabled: med.enabled
    })),
    isEnabled: med.enabled,
    dosage: med.instructions || ''
  };
}

/**
 * Maps raw ApiLogEntry from ESP32 to React internal Log entry
 */
export function mapLog(apiLog: ApiLogEntry): Log {
  return {
    id: String(apiLog.id),
    timestamp: new Date(apiLog.timestamp).toISOString(),
    medicineName: apiLog.medicationName,
    dosageText: apiLog.dosage,
    status: apiLog.status as LogStatus,
    detailText: apiLog.description
  };
}

// Maps Kotlin ComponentType enum names to readable metadata
const COMPONENT_DETAILS: Record<string, { name: string; icon: string; description: string }> = {
  STEPPER_MOTOR_1: { name: 'Stepper Motor 1', icon: 'rotate_right', description: 'Rotator slot A1 motor control' },
  STEPPER_MOTOR_2: { name: 'Stepper Motor 2', icon: 'rotate_right', description: 'Rotator slot A2 motor control' },
  STEPPER_MOTOR_3: { name: 'Stepper Motor 3', icon: 'rotate_right', description: 'Rotator slot A3 motor control' },
  RTC_MODULE: { name: 'RTC Clock Module', icon: 'schedule', description: 'Real-time clock chip DS3231' },
  IR_SENSOR: { name: 'IR Beam Sensor', icon: 'sensors', description: 'Infrared pill drop detection beam' },
  SPEAKER: { name: 'Speaker Chimes', icon: 'volume_up', description: 'DFPlayer audio controller & buzzer' },
  OLED_DISPLAY: { name: 'OLED Display', icon: 'developer_board', description: 'SSD1306 display screen unit' },
  WIFI_STACK: { name: 'WiFi Stack', icon: 'wifi', description: 'Network stack radio status' },
  API_GATEWAY: { name: 'REST API Gateway', icon: 'dns', description: 'REST API router handler' }
};

/**
 * Maps raw ApiDiagnosticComponent from ESP32 to React internal HardwareComponent status
 */
export function mapDiagnosticComponent(apiComp: ApiDiagnosticComponent): HardwareComponent {
  const meta = COMPONENT_DETAILS[apiComp.component] || {
    name: apiComp.component,
    icon: 'build',
    description: apiComp.message || 'Chassis component diagnostic status'
  };

  let status: 'Working' | 'Warning' | 'Offline' = 'Working';
  if (apiComp.status === 'WARNING') status = 'Warning';
  if (apiComp.status === 'ERROR' || apiComp.status === 'OFFLINE') status = 'Offline';

  return {
    id: apiComp.component,
    name: meta.name,
    description: meta.description,
    status,
    icon: meta.icon
  };
}
