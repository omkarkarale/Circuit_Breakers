import {
  DashboardResponse,
  DeviceStatus,
  Medicine,
  Log,
  HardwareComponent,
  ApiMode,
  ApiDashboardData,
  ApiDeviceStatus,
  ApiMedicine,
  ApiLogEntry,
  ApiDiagnosticResult
} from '../types';
import { INITIAL_MEDICINES, INITIAL_LOGS, INITIAL_HARDWARE, INITIAL_CONFIG } from '../mockData';
import { LocalStorageService } from './LocalStorageService';
import { ApiClient } from '../api/ApiClient';
import { VirtualESP32 } from './VirtualESP32';
import {
  mapDeviceStatus,
  mapMedicine,
  mapMedicineToApi,
  mapLog,
  mapDiagnosticComponent
} from '../utils/apiMappers';

const getMode = (): ApiMode => {
  return LocalStorageService.getSettings().apiMode;
};

export const FirmwareService = {
  async getDashboard(): Promise<DashboardResponse> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const apiData = await ApiClient.get<ApiDashboardData>('/api/v1/dashboard');
      const medicines = apiData.inventory.map(mapMedicine);
      const activeMeds = medicines.filter(m => m.enabled && m.remainingPills > 0);
      const nextMed = activeMeds[0] || medicines[0] || null;
      return {
        nextDose: nextMed,
        adherencePercent: apiData.adherencePercentage,
        completedDoses: apiData.recentLogs.filter(l => l.status === 'Taken').length,
        totalScheduledToday: medicines.reduce((acc, curr) => curr.enabled ? acc + curr.schedules.length : acc, 0)
      };
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.getDashboardData();
    }

    // Fallback for MOCK
    const medicines = LocalStorageService.getCachedMedicines(INITIAL_MEDICINES);
    const logs = LocalStorageService.getCachedLogs(INITIAL_LOGS);
    
    const activeMeds = medicines.filter(m => m.enabled && m.remainingPills > 0);
    const nextMed = activeMeds[0] || medicines[0] || null;

    // Adherence Calculation
    const today = new Date().toDateString();
    const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
    const completedDoses = todayLogs.filter(l => l.status === 'Taken').length;
    const totalScheduledToday = medicines.reduce((acc, curr) => {
      if (!curr.enabled) return acc;
      return acc + curr.schedules.length;
    }, 0);

    const displayTotal = totalScheduledToday > 0 ? totalScheduledToday : 10;
    const displayCompleted = completedDoses > 0 ? completedDoses : Math.min(8, displayTotal);
    const adherencePercent = Math.round((displayCompleted / displayTotal) * 100);

    return {
      nextDose: nextMed,
      adherencePercent,
      completedDoses: displayCompleted,
      totalScheduledToday: displayTotal
    };
  },

  async getStatus(): Promise<DeviceStatus> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const apiStatus = await ApiClient.get<ApiDeviceStatus>('/api/v1/status');
      return mapDeviceStatus(apiStatus);
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.getStatus();
    }

    const config = LocalStorageService.getCachedConfig(INITIAL_CONFIG);
    return {
      connected: config.connected,
      ssid: config.ssid,
      strength: config.strength,
      battery: config.battery,
      lastSync: config.lastSync,
      firmware: config.firmware,
      internalTemp: config.internalTemp
    };
  },

  async getMedicines(): Promise<Medicine[]> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const apiMeds = await ApiClient.get<ApiMedicine[]>('/api/v1/medicines');
      return apiMeds.map(mapMedicine);
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.getMedicines();
    }
    return LocalStorageService.getCachedMedicines(INITIAL_MEDICINES);
  },

  async getLogs(): Promise<Log[]> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const apiLogs = await ApiClient.get<ApiLogEntry[]>('/api/v1/logs');
      return apiLogs.map(mapLog);
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.getLogs();
    }
    return LocalStorageService.getCachedLogs(INITIAL_LOGS);
  },

  async getDiagnostics(): Promise<HardwareComponent[]> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const apiDiag = await ApiClient.get<ApiDiagnosticResult>('/api/v1/diagnostics');
      return apiDiag.components.map(mapDiagnosticComponent);
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.getDiagnostics();
    }
    return LocalStorageService.getCachedHardware(INITIAL_HARDWARE);
  },

  async dispense(medId: string, slot: number, count: number): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/test/dispenser/' + slot);
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.dispensePill(medId, slot, count);
    }
    console.log(`[Simulator/Mock] Dispensing medicine ${medId} from slot ${slot}, count: ${count}`);
    return true;
  },

  async runMotorTest(slot: number): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/test/dispenser/' + slot);
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.dispensePill('', slot, 1);
    }
    console.log(`[Simulator/Mock] Testing motor at slot ${slot}`);
    return true;
  },

  async runAudioTest(): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/test/audio');
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 523.25; // C5 chord beep
        gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.4);
        osc.stop(audioCtx.currentTime + 0.4);
      } catch (e) {}
      return true;
    }
    console.log('[Simulator/Mock] Testing audio speaker');
    return true;
  },

  async runRtcTest(): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/test/rtc');
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      const state = VirtualESP32.getgetState();
      if (state.rtcFailure) return false;
      return true;
    }
    console.log('[Simulator/Mock] Testing RTC clock module');
    return true;
  },

  async runIrTest(): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/test/ir');
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      const state = VirtualESP32.getgetState();
      if (state.irBlockage) return false;
      return true;
    }
    console.log('[Simulator/Mock] Testing IR beam sensor');
    return true;
  },

  async connectWiFi(ssid: string, password?: string): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/wifi/connect', { ssid, password });
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      const state = VirtualESP32.getgetState();
      state.ssid = ssid;
      VirtualESP32.saveState();
      return true;
    }
    console.log(`[Simulator/Mock] Connecting WiFi network: ${ssid}`);
    return true;
  },

  async rebootDevice(): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const result = await ApiClient.post<{ success: boolean }>('/api/v1/device/reboot');
      return result.success;
    } else if (mode === ApiMode.SIMULATOR) {
      VirtualESP32.triggerReboot();
      return true;
    }
    console.log('[Simulator/Mock] Rebooting device...');
    return true;
  },

  async saveMedicine(med: Medicine): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const apiBody = mapMedicineToApi(med);
      await ApiClient.post<ApiMedicine>('/api/v1/medicines', apiBody);
      return true;
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.saveMedicine(med);
    }
    return true;
  },

  async deleteMedicine(id: string): Promise<boolean> {
    const mode = getMode();
    if (mode === ApiMode.REAL_DEVICE) {
      const numericId = isNaN(Number(id)) ? 0 : Number(id);
      await ApiClient.delete('/api/v1/medicines/' + numericId);
      return true;
    } else if (mode === ApiMode.SIMULATOR) {
      return VirtualESP32.deleteMedicine(id);
    }
    return true;
  }
};
