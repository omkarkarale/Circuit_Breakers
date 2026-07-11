import { Preferences } from '@capacitor/preferences';

const IP_KEY = 'esp32_ip';

export async function getSavedIp(): Promise<string | null> {
  const { value } = await Preferences.get({ key: IP_KEY });
  return value;
}

export async function saveIp(ip: string): Promise<void> {
  await Preferences.set({ key: IP_KEY, value: ip });
}

export async function clearIp(): Promise<void> {
  await Preferences.remove({ key: IP_KEY });
}

export async function fetchWithTimeout(url: string, options: RequestInit = {}, timeoutMs = 3000): Promise<Response> {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error('Request timeout');
    }
    throw error;
  } finally {
    clearTimeout(id);
  }
}

const MOCK_MEDICINES_KEY = 'mock_medicines';
const MOCK_LOGS_KEY = 'mock_logs';

const DEFAULT_MOCK_MEDICINES: MedicineEntry[] = [
  {
    slot: 1,
    assigned: true,
    name: "Aspirin 81mg",
    type: "Tablet",
    remainingPills: 28,
    dosePerReminder: 1,
    notes: "Take after food",
    repeatFrequency: "Daily",
    times: ["08:00", "20:00"],
    lowStockThreshold: 5,
    todayRemainingDoses: 2,
    status: "ok"
  },
  {
    slot: 2,
    assigned: true,
    name: "Ibuprofen 400mg",
    type: "Capsule",
    remainingPills: 7,
    dosePerReminder: 2,
    notes: "",
    repeatFrequency: "Daily",
    times: ["12:00"],
    lowStockThreshold: 10,
    todayRemainingDoses: 0,
    status: "low"
  },
  {
    slot: 3,
    assigned: false,
    name: "",
    type: "",
    remainingPills: 0,
    dosePerReminder: 0,
    notes: "",
    repeatFrequency: "Daily",
    times: [],
    lowStockThreshold: 5,
    todayRemainingDoses: 0,
    status: "empty"
  }
];

async function getMockMedicines(): Promise<MedicineEntry[]> {
  const { value } = await Preferences.get({ key: MOCK_MEDICINES_KEY });
  if (!value) {
    await Preferences.set({ key: MOCK_MEDICINES_KEY, value: JSON.stringify(DEFAULT_MOCK_MEDICINES) });
    return DEFAULT_MOCK_MEDICINES;
  }
  try {
    return JSON.parse(value);
  } catch {
    return DEFAULT_MOCK_MEDICINES;
  }
}

async function saveMockMedicines(meds: MedicineEntry[]): Promise<void> {
  await Preferences.set({ key: MOCK_MEDICINES_KEY, value: JSON.stringify(meds) });
}

function defaultMockLogs(): LogItem[] {
  const now = Math.floor(Date.now() / 1000);
  return [
    { ts: now - 240, type: "dispensed", detail: "Aspirin dispensed successfully from slot 1" },
    { ts: now - 900, type: "reminder", detail: "Reminder triggered for Vitamin D" },
    { ts: now - 1800, type: "low_stock", detail: "Slot 2 is running low" },
    { ts: now - 3600, type: "dispensed", detail: "Metformin dispensed successfully from slot 3" },
    { ts: now - 7200, type: "missed", detail: "Scheduled dose missed for slot 2" },
    { ts: now - 10800, type: "refill", detail: "Slot 3 refilled with 30 pills" },
    { ts: now - 14400, type: "connection", detail: "Device reconnected to local network" },
    { ts: now - 21600, type: "reminder", detail: "Evening dose reminder queued" },
    { ts: now - 86400, type: "dispensed", detail: "Night dose dispensed successfully from slot 4" }
  ];
}

async function getMockLogs(): Promise<LogItem[]> {
  const { value } = await Preferences.get({ key: MOCK_LOGS_KEY });
  if (!value) {
    const logs = defaultMockLogs();
    await Preferences.set({ key: MOCK_LOGS_KEY, value: JSON.stringify(logs) });
    return logs;
  }
  try {
    return JSON.parse(value);
  } catch {
    return defaultMockLogs();
  }
}

async function appendMockLog(type: string, detail: string): Promise<void> {
  const logs = await getMockLogs();
  const nextLogs = [{ ts: Math.floor(Date.now() / 1000), type, detail }, ...logs].slice(0, 100);
  await Preferences.set({ key: MOCK_LOGS_KEY, value: JSON.stringify(nextLogs) });
}

/**
 * Public log helper.
 * In mock/bypass mode: writes to Preferences.
 * On real hardware: firmware logs internally; this is a no-op so we don't
 * need a dedicated POST endpoint on the ESP.
 */
export async function appendLog(type: string, detail: string): Promise<void> {
  const ip = await getSavedIp();
  if (isBypassIp(ip)) {
    await appendMockLog(type, detail);
  }
  // On real device the firmware's StorageManager::appendLog handles it
}

const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function medicineRunsOnDate(medicine: MedicineEntry, date: Date): boolean {
  if (medicine.repeatFrequency === 'Daily') return true;
  return medicine.repeatFrequency === WEEKDAY_NAMES[date.getDay()];
}

function scheduledDateForTime(date: Date, time: string): Date | null {
  const match = time.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  const scheduled = new Date(date);
  scheduled.setHours(parseInt(match[1], 10), parseInt(match[2], 10), 0, 0);
  return scheduled;
}

function isBypassIp(ip: string | null): boolean {
  if (!ip) return false;
  const trimmed = ip.trim().toLowerCase();
  return trimmed === '1.1.1.1' || trimmed === 'mock';
}

// ─────────────────────────────────────────────────────────────────────────────
// API Base Client helper
// ─────────────────────────────────────────────────────────────────────────────
async function apiRequest<T>(endpoint: string, options: RequestInit = {}, timeoutMs = 3000): Promise<T> {
  const ip = await getSavedIp();
  if (!ip) {
    throw new Error('Device not configured');
  }

  if (isBypassIp(ip)) {
    await new Promise(resolve => setTimeout(resolve, 300));
    if (endpoint.endsWith('/status')) {
      return {
        success: true,
        message: "Bypass Mode Activated",
        connected: true,
        ssid: "MedLink_Bypass_WiFi",
        ipAddress: ip,
        time: Math.floor(Date.now() / 1000),
        timeSynced: true
      } as unknown as T;
    }
    if (endpoint.endsWith('/capabilities')) {
      return {
        success: true,
        message: "Capabilities mock",
        data: {
          steppers: [true, true, true],
          rtc: true,
          ir: true,
          speaker: true,
          display: true,
          storage: true,
          wifi: true,
          memory: true
        }
      } as unknown as T;
    }
    if (endpoint.endsWith('/info')) {
      return {
        success: true,
        message: "Info mock",
        firmwareVersion: "1.0.0-bypass",
        deviceId: "MEDLINK-BYPASS-001"
      } as unknown as T;
    }
    if (endpoint.endsWith('/medicines')) {
      const meds = await getMockMedicines();
      return {
        success: true,
        message: "Medicines retrieved",
        data: meds
      } as unknown as T;
    }
    if (endpoint.match(/\/medicines\/\d+\/refill$/)) {
      const slotMatch = endpoint.match(/\/medicines\/(\d+)\/refill$/);
      const slotNum = parseInt(slotMatch![1]);
      const meds = await getMockMedicines();
      const body = JSON.parse(options.body as string);
      const qty = body.quantity || 0;
      
      const updated = meds.map(m => {
        if (m.slot === slotNum) {
          const newQty = m.remainingPills + qty;
          let status = "ok";
          if (newQty === 0) status = "empty";
          else if (newQty <= m.lowStockThreshold) status = "low";
          return { ...m, remainingPills: newQty, status };
        }
        return m;
      });
      await saveMockMedicines(updated);
      await appendMockLog("refill", `Slot ${slotNum} refilled with ${qty} pills`);
      return {
        success: true,
        message: "Refill successful",
        remainingPills: updated.find(m => m.slot === slotNum)?.remainingPills || 0
      } as unknown as T;
    }
    if (endpoint.match(/\/medicines\/\d+$/)) {
      const slotMatch = endpoint.match(/\/medicines\/(\d+)$/);
      const slotNum = parseInt(slotMatch![1]);
      const meds = await getMockMedicines();
      if (options.method === 'DELETE') {
        const updated = meds.map(m => {
          if (m.slot === slotNum) {
            return {
              slot: slotNum,
              assigned: false,
              name: "",
              type: "",
              remainingPills: 0,
              dosePerReminder: 0,
              notes: "",
              repeatFrequency: "Daily",
              times: [],
              lowStockThreshold: 5,
              todayRemainingDoses: 0,
              status: "empty"
            };
          }
          return m;
        });
        await saveMockMedicines(updated);
        await appendMockLog("refill", `Slot ${slotNum} cleared`);
        return {
          success: true,
          message: "Medicine deleted successfully"
        } as unknown as T;
      } else {
        const body = JSON.parse(options.body as string);
        const updated = meds.map(m => {
          if (m.slot === slotNum) {
            const remainingPills = typeof body.remainingPills === 'number' ? body.remainingPills : m.remainingPills;
            const lowStockThreshold = typeof body.lowStockThreshold === 'number' ? body.lowStockThreshold : m.lowStockThreshold;
            let status = "ok";
            if (remainingPills === 0) status = "empty";
            else if (remainingPills <= lowStockThreshold) status = "low";
            
            return {
              ...m,
              ...body,
              slot: slotNum,
              assigned: true,
              status
            };
          }
          return m;
        });
        await saveMockMedicines(updated);
        await appendMockLog("refill", `Slot ${slotNum} updated${body.name ? ` for ${body.name}` : ""}`);
        return {
          success: true,
          message: "Medicine updated successfully"
        } as unknown as T;
      }
    }
    if (endpoint.match(/\/dispense\/\d+$/)) {
      const slotMatch = endpoint.match(/\/dispense\/(\d+)$/);
      const slotNum = parseInt(slotMatch![1]);
      const meds = await getMockMedicines();
      const updated = meds.map(m => {
        if (m.slot !== slotNum || !m.assigned) return m;
        const remainingPills = Math.max(0, m.remainingPills - Math.max(1, m.dosePerReminder || 1));
        let status = "ok";
        if (remainingPills === 0) status = "empty";
        else if (remainingPills <= m.lowStockThreshold) status = "low";
        return { ...m, remainingPills, status };
      });
      const medicine = updated.find(m => m.slot === slotNum);
      await saveMockMedicines(updated);
      await appendMockLog("dispensed", `${medicine?.name || `Slot ${slotNum}`} dispensed successfully from slot ${slotNum}`);
      if (medicine && medicine.status === "low") {
        await appendMockLog("low_stock", `Slot ${slotNum} is running low`);
      }
      return {
        success: true,
        message: "Medicine dispensed successfully",
        slot: slotNum
      } as unknown as T;
    }
    if (endpoint.endsWith('/settings')) {
      if (options.method === 'PUT') {
        await appendMockLog("connection", "Settings updated");
        return {
          success: true,
          message: "Settings updated successfully"
        } as unknown as T;
      }
      return {
        success: true,
        message: "Settings retrieved",
        data: {
          notifications: {
            medicineReminder: true,
            missedDoseAlert: true,
            lowMedicineAlert: true,
            deviceOfflineAlert: true
          },
          accessibility: {
            soundVolume: 80
          }
        }
      } as unknown as T;
    }
    if (endpoint.endsWith('/logs')) {
      const logs = await getMockLogs();
      return {
        success: true,
        message: "Logs mock",
        data: logs
      } as unknown as T;
    }
    if (endpoint.endsWith('/home')) {
      const now = Math.floor(Date.now() / 1000);
      const meds = await getMockMedicines();
      
      const todaySchedule: any[] = [];
      const nextDoses: any[] = [];
      const today = new Date();
      const currentMs = Date.now();

      meds.forEach(m => {
        if (!m.assigned) return;

        if (medicineRunsOnDate(m, today)) {
          m.times.forEach(time => {
            todaySchedule.push({
              slot: m.slot,
              medicineName: m.name,
              dose: m.dosePerReminder,
              scheduledTime: time,
              remainingPills: m.remainingPills,
              notes: m.notes
            });
          });
        }

        let foundUpcomingForMedicine = false;
        for (let dayOffset = 0; dayOffset < 8; dayOffset += 1) {
          const checkDate = new Date(today);
          checkDate.setDate(today.getDate() + dayOffset);
          if (!medicineRunsOnDate(m, checkDate)) continue;

          m.times.forEach(time => {
            const scheduled = scheduledDateForTime(checkDate, time);
            if (!scheduled || scheduled.getTime() < currentMs) return;
            foundUpcomingForMedicine = true;
            nextDoses.push({
              slot: m.slot,
              medicineName: m.name,
              dose: m.dosePerReminder,
              scheduledTime: time,
              countdownSeconds: Math.max(0, Math.floor((scheduled.getTime() - currentMs) / 1000)),
              notes: m.notes,
              isToday: dayOffset === 0
            });
          });

          if (foundUpcomingForMedicine) {
            return;
          }
        }
      });

      todaySchedule.sort((a, b) => a.scheduledTime.localeCompare(b.scheduledTime));
      nextDoses.sort((a, b) => a.countdownSeconds - b.countdownSeconds);

      return {
        success: true,
        message: "Home data mock",
        nextDoses,
        todaySchedule,
        recentActivity: (await getMockLogs()).slice(0, 5),
        deviceTime: now
      } as unknown as T;
    }
    if (endpoint.endsWith('/diagnostics/test-all')) {
      await new Promise(resolve => setTimeout(resolve, 2500)); // simulate test duration
      const now = Math.floor(Date.now() / 1000);
      await appendMockLog("connection", "Full diagnostics completed");
      return {
        success: true,
        message: "Full diagnostics complete",
        data: {
          wifi:     { pass: true,  detail: "Wi-Fi connected, RSSI -62 dBm" },
          rtc:      { pass: true,  detail: "RTC time synced: " + new Date().toISOString() },
          stepper1: { pass: true,  detail: "Stepper 1 homed successfully in 340 ms" },
          stepper2: { pass: false, detail: "Stepper 2 stall detected — check cartridge alignment" },
          stepper3: { pass: true,  detail: "Stepper 3 homed successfully in 310 ms" },
          ir:       { pass: true,  detail: "IR beam clear, baseline 1023" },
          speaker:  { pass: true,  detail: "Audio tone 1kHz played OK" },
          storage:  { pass: true,  detail: "LittleFS mounted, 68 KB free" },
          memory:   { pass: true,  detail: "Heap free: 28744 B" },
          firmware: { pass: true,  detail: "Firmware v2.0.0, CRC OK", ts: now }
        }
      } as unknown as T;
    }
    if (endpoint.match(/\/diagnostics\/test\/(.+)$/)) {
      const compMatch = endpoint.match(/\/diagnostics\/test\/(.+)$/);
      const comp = compMatch![1];
      await new Promise(resolve => setTimeout(resolve, 900));
      const now = Math.floor(Date.now() / 1000);
      const detailMap: Record<string, string> = {
        wifi:     "Wi-Fi connected, RSSI -62 dBm",
        rtc:      "RTC time synced: " + new Date().toISOString(),
        stepper1: "Stepper 1 homed successfully in 340 ms",
        stepper2: "Stepper 2 stall detected — check cartridge alignment",
        stepper3: "Stepper 3 homed successfully in 310 ms",
        ir:       "IR beam clear, baseline 1023",
        speaker:  "Audio tone 1kHz played OK",
        storage:  "LittleFS mounted, 68 KB free",
        memory:   "Heap free: 28744 B",
        firmware: "Firmware v2.0.0, CRC OK"
      };
      const failSet = new Set(['stepper2']);
      await appendMockLog(failSet.has(comp) ? "missed" : "connection", `Diagnostic test completed for ${comp}`);
      return {
        success: true,
        message: `Test for ${comp} complete`,
        pass: !failSet.has(comp),
        detail: detailMap[comp] || `Component ${comp} tested`,
        lastChecked: now
      } as unknown as T;
    }
    if (endpoint.endsWith('/diagnostics')) {
      const now = Math.floor(Date.now() / 1000);
      return {
        success: true,
        message: "Diagnostics data",
        data: {
          wifi:     { status: "ok",      lastChecked: now - 120, detail: "Wi-Fi connected, RSSI -62 dBm" },
          rtc:      { status: "ok",      lastChecked: now - 300, detail: "RTC time synced" },
          stepper1: { status: "ok",      lastChecked: now - 300, detail: "Motor driver responding" },
          stepper2: { status: "fail",    lastChecked: now - 300, detail: "Stepper 2 stall detected" },
          stepper3: { status: "ok",      lastChecked: now - 300, detail: "Motor driver responding" },
          ir:       { status: "ok",      lastChecked: now - 300, detail: "IR beam clear" },
          speaker:  { status: "ok",      lastChecked: now - 300, detail: "Audio driver OK" },
          storage:  { status: "ok",      lastChecked: now - 300, detail: "LittleFS 68 KB free" },
          memory:   { status: "ok",      lastChecked: now - 300, detail: "Heap: 28744 B free" },
          firmware: { status: "ok",      lastChecked: now - 300, detail: "v2.0.0, CRC OK" }
        }
      } as unknown as T;
    }
    if (endpoint.endsWith('/wifi/forget')) {
      await appendMockLog("connection", "Wi-Fi configuration forgotten");
    } else if (endpoint.endsWith('/device/reboot')) {
      await appendMockLog("connection", "Device reboot requested");
    } else if (endpoint.endsWith('/device/factory-reset')) {
      await Preferences.remove({ key: MOCK_LOGS_KEY });
      await appendMockLog("connection", "Factory reset completed");
    } else if (options.method && options.method !== 'GET') {
      await appendMockLog("connection", "Device action completed");
    }
    return { success: true, message: "Mocked action successful" } as unknown as T;
  }

  const url = `http://${ip}${endpoint}`;
  const response = await fetchWithTimeout(url, options, timeoutMs);
  if (!response.ok) {
    throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
  }
  return await response.json();
}

// ─────────────────────────────────────────────────────────────────────────────
// Typed API Endpoints
// ─────────────────────────────────────────────────────────────────────────────
export interface StatusResponse {
  success: boolean;
  message: string;
  connected: boolean;
  ssid: string;
  ipAddress: string;
  time: number;
  timeSynced: boolean;
}

export interface CapabilitiesResponse {
  success: boolean;
  message: string;
  data: {
    steppers: boolean[];
    rtc: boolean;
    ir: boolean;
    speaker: boolean;
    display: boolean;
    storage: boolean;
    wifi: boolean;
    memory: boolean;
  };
}

export interface InfoResponse {
  success: boolean;
  message: string;
  firmwareVersion: string;
  deviceId: string;
}

export interface HomeResponse {
  success: boolean;
  message: string;
  nextDoses: Array<{
    slot: number;
    medicineName: string;
    dose: number;
    scheduledTime: string;
    countdownSeconds: number;
    notes?: string;
    isToday?: boolean;
  }>;
  todaySchedule: Array<{
    slot: number;
    medicineName: string;
    scheduledTime: string;
    remainingPills: number;
    dose: number;
    notes: string;
  }>;
  recentActivity: Array<{
    ts: number;
    type: string;
    detail: string;
  }>;
  deviceTime?: number; // optional unix epoch from device for clock sync
}

export interface MedicineEntry {
  slot: number;
  assigned: boolean;
  name: string;
  type: string;
  remainingPills: number;
  dosePerReminder: number;
  notes: string;
  repeatFrequency: string;
  times: string[];
  lowStockThreshold: number;
  todayRemainingDoses?: number;
  status?: string;
}

export interface MedicinesResponse {
  success: boolean;
  message: string;
  data: MedicineEntry[];
}

export interface DiagnosticItem {
  status: 'ok' | 'fail' | 'unknown';
  lastChecked: number;
  detail: string;
}

export interface DiagnosticsResponse {
  success: boolean;
  message: string;
  data: {
    [key: string]: DiagnosticItem;
  };
}

export interface SettingsData {
  notifications: {
    medicineReminder: boolean;
    missedDoseAlert: boolean;
    lowMedicineAlert: boolean;
    deviceOfflineAlert: boolean;
  };
  accessibility: {
    soundVolume: number;
  };
}

export interface SettingsResponse {
  success: boolean;
  message: string;
  data: SettingsData;
}

export interface LogItem {
  ts: number;
  type: string;
  detail: string;
}

export interface LogsResponse {
  success: boolean;
  message: string;
  data: LogItem[];
}

// ─────────────────────────────────────────────────────────────────────────────
// API Methods
// ─────────────────────────────────────────────────────────────────────────────
export const ApiClient = {
  // Test connection directly with an IP (used on configuration/setup screen)
  checkStatusAtIp: async (ip: string): Promise<StatusResponse> => {
    const trimmed = ip.trim().toLowerCase();
    if (trimmed === '1.1.1.1' || trimmed === 'mock') {
      await new Promise(resolve => setTimeout(resolve, 800)); // Loading feel
      return {
        success: true,
        message: "Bypass Mode Activated",
        connected: true,
        ssid: "MedLink_Bypass_WiFi",
        ipAddress: ip,
        time: Math.floor(Date.now() / 1000),
        timeSynced: true
      };
    }
    const url = `http://${ip}/api/v1/status`;
    const response = await fetchWithTimeout(url, { method: 'GET' }, 3000);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  },

  getInfoAtIp: async (ip: string): Promise<InfoResponse> => {
    const trimmed = ip.trim().toLowerCase();
    if (trimmed === '1.1.1.1' || trimmed === 'mock') {
      return {
        success: true,
        message: "Info mock",
        firmwareVersion: "1.0.0-bypass",
        deviceId: "MEDLINK-BYPASS-001"
      };
    }
    const url = `http://${ip}/api/v1/info`;
    const response = await fetchWithTimeout(url, { method: 'GET' }, 3000);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  },

  getSettingsAtIp: async (ip: string): Promise<SettingsResponse> => {
    const trimmed = ip.trim().toLowerCase();
    if (trimmed === '1.1.1.1' || trimmed === 'mock') {
      return {
        success: true,
        message: "Settings retrieved",
        data: {
          notifications: {
            medicineReminder: true,
            missedDoseAlert: true,
            lowMedicineAlert: true,
            deviceOfflineAlert: true
          },
          accessibility: {
            soundVolume: 80
          }
        }
      };
    }
    const url = `http://${ip}/api/v1/settings`;
    const response = await fetchWithTimeout(url, { method: 'GET' }, 3000);
    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }
    return await response.json();
  },

  getStatus: (): Promise<StatusResponse> => {
    return apiRequest<StatusResponse>('/api/v1/status');
  },

  getCapabilities: (): Promise<CapabilitiesResponse> => {
    return apiRequest<CapabilitiesResponse>('/api/v1/capabilities');
  },

  getInfo: (): Promise<InfoResponse> => {
    return apiRequest<InfoResponse>('/api/v1/info');
  },

  getHome: (): Promise<HomeResponse> => {
    return apiRequest<HomeResponse>('/api/v1/home');
  },

  getMedicines: (): Promise<MedicinesResponse> => {
    return apiRequest<MedicinesResponse>('/api/v1/medicines');
  },

  updateMedicine: (slot: number, data: Partial<MedicineEntry>): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/api/v1/medicines/${slot}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  },

  deleteMedicine: (slot: number): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>(`/api/v1/medicines/${slot}`, {
      method: 'DELETE'
    });
  },

  refillMedicine: (slot: number, quantity: number): Promise<{ success: boolean; message: string; remainingPills: number }> => {
    return apiRequest<{ success: boolean; message: string; remainingPills: number }>(`/api/v1/medicines/${slot}/refill`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity })
    });
  },

  dispense: (slot: number): Promise<{ success: boolean; message: string; slot: number }> => {
    return apiRequest<{ success: boolean; message: string; slot: number }>(`/api/v1/dispense/${slot}`, {
      method: 'POST'
    }, 5000);
  },

  getDiagnostics: (): Promise<DiagnosticsResponse> => {
    return apiRequest<DiagnosticsResponse>('/api/v1/diagnostics');
  },

  testAllDiagnostics: (): Promise<{ success: boolean; message: string; data: { [key: string]: { pass: boolean; detail: string } } }> => {
    return apiRequest<{ success: boolean; message: string; data: { [key: string]: { pass: boolean; detail: string } } }>('/api/v1/diagnostics/test-all', {
      method: 'POST'
    }, 15000);
  },

  testDiagnosticComponent: (component: string): Promise<{ success: boolean; message: string; pass: boolean; detail: string }> => {
    return apiRequest<{ success: boolean; message: string; pass: boolean; detail: string }>(`/api/v1/diagnostics/test/${component}`, {
      method: 'POST'
    }, 8000);
  },

  getSettings: (): Promise<SettingsResponse> => {
    return apiRequest<SettingsResponse>('/api/v1/settings');
  },

  updateSettings: (settings: Partial<SettingsData>): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/v1/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    });
  },

  connectWifi: async (ssid: string, password?: string): Promise<{ success: boolean; message: string }> => {
    const trimmed = ssid.trim().toLowerCase();
    if (trimmed === '1.1.1.1' || trimmed === 'mock') {
      await saveIp(trimmed);
      await appendMockLog("connection", "Bypass Wi-Fi connection activated");
      return { success: true, message: "Bypass Wifi connection activated" };
    }
    return apiRequest<{ success: boolean; message: string }>('/api/v1/wifi/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ssid, password })
    });
  },

  startWifiSetup: (): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/v1/wifi/start-setup', {
      method: 'POST'
    });
  },

  forgetWifi: (): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/v1/wifi/forget', {
      method: 'POST'
    });
  },

  rebootDevice: (): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/v1/device/reboot', {
      method: 'POST'
    });
  },

  factoryResetDevice: (): Promise<{ success: boolean; message: string }> => {
    return apiRequest<{ success: boolean; message: string }>('/api/v1/device/factory-reset', {
      method: 'POST'
    });
  },

  getLogs: (): Promise<LogsResponse> => {
    return apiRequest<LogsResponse>('/api/v1/logs');
  }
};
