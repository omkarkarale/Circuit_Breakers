import { Medicine, Log, HardwareComponent, DeviceConfig } from '../types';
import { INITIAL_MEDICINES, INITIAL_LOGS, INITIAL_HARDWARE, INITIAL_CONFIG } from '../mockData';

export type MotorState = 'IDLE' | 'ROTATING' | 'JAMMED';
export type OledState = 'POWER_OFF' | 'BOOTING' | 'CONNECTING_WIFI' | 'SYNCING' | 'READY' | 'DISPENSING' | 'ERROR';
export type SpeakerState = 'SILENT' | 'BEEP' | 'ALARM';

export interface SimulatorState {
  connected: boolean;
  ssid: string;
  strength: number;
  battery: number;
  lastSync: string;
  firmware: string;
  internalTemp: number;
  board: string;
  uptime: number;
  heap: number;

  medicines: Medicine[];
  logs: Log[];
  hardware: HardwareComponent[];

  motorState: MotorState;
  oledState: OledState;
  speakerState: SpeakerState;

  // Failure simulations
  wifiLoss: boolean;
  motorJam: boolean;
  lowBattery: boolean;
  rtcFailure: boolean;
  irBlockage: boolean;
  storageFull: boolean;

  // Clock
  clockTime: number; // Virtual time (timestamp in milliseconds)
  simulationSpeed: number; // speed multiplier (0.25, 0.5, 1, 2, 5, 10, etc.)
  isPaused: boolean;

  // Current active dispense action
  dispensingState: {
    active: boolean;
    medicineName: string;
    pillCount: number;
    color: string;
    slot: number;
    medId: string;
  } | null;
  pillsInChute: Array<{ id: number; color: string; dropped: boolean }>;
}

const STORAGE_KEY = 'medlink_virtual_esp32';

// 8:00 AM, July 4, 2026 default virtual time
const DEFAULT_CLOCK_TIME = new Date(2026, 6, 4, 8, 0, 0).getTime();

export class VirtualESP32Class {
  private state!: SimulatorState;
  private listeners: (() => void)[] = [];
  private intervalId: any = null;

  constructor() {
    this.loadState();
    this.startClock();
  }

  private loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.state = JSON.parse(saved);
        // Force recovery if states were left in temporary middle animations
        if (this.state.motorState === 'ROTATING') this.state.motorState = 'IDLE';
        if (this.state.oledState === 'DISPENSING') this.state.oledState = 'READY';
        if (this.state.speakerState === 'BEEP') this.state.speakerState = 'SILENT';
        this.state.dispensingState = null;
        this.state.pillsInChute = [];
        return;
      } catch (e) {
        console.error('Failed to parse saved VirtualESP32 state, resetting...', e);
      }
    }
    this.resetToDefaults();
  }

  public saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
  }

  public resetToDefaults() {
    this.state = {
      connected: true,
      ssid: 'Home_Network_5G',
      strength: 4,
      battery: 85,
      lastSync: 'Just now',
      firmware: 'v1.0.0',
      internalTemp: 34.2,
      board: 'ESP32-S3 DevKitC',
      uptime: 3201,
      heap: 183456,

      medicines: [...INITIAL_MEDICINES],
      logs: [...INITIAL_LOGS],
      hardware: INITIAL_HARDWARE.map(h => ({ ...h, status: 'Working' })),

      motorState: 'IDLE',
      oledState: 'READY',
      speakerState: 'SILENT',

      wifiLoss: false,
      motorJam: false,
      lowBattery: false,
      rtcFailure: false,
      irBlockage: false,
      storageFull: false,

      clockTime: DEFAULT_CLOCK_TIME,
      simulationSpeed: 1,
      isPaused: false,
      dispensingState: null,
      pillsInChute: []
    };
    this.saveState();
    this.notify();
  }

  public subscribe(cb: () => void): () => void {
    this.listeners.push(cb);
    return () => {
      this.listeners = this.listeners.filter(l => l !== cb);
    };
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  private startClock() {
    if (this.intervalId) clearInterval(this.intervalId);

    // Ticks every 1 second in real-world time
    this.intervalId = setInterval(() => {
      if (!this.state.isPaused && this.state.oledState !== 'POWER_OFF') {
        // 1s real = 1s * speed virtual
        const elapsedVirtual = 1000 * this.state.simulationSpeed;
        this.advanceTime(elapsedVirtual);
      }
    }, 1000);
  }

  public advanceTime(ms: number) {
    const oldTime = this.state.clockTime;
    const newTime = oldTime + ms;

    this.state.clockTime = newTime;
    this.state.uptime += Math.round(ms / 1000);

    // Persist and notify time tick
    this.saveState();
    this.notify();

    // Check schedules
    this.checkMedicationSchedules(oldTime, newTime);
  }

  private checkMedicationSchedules(oldTime: number, newTime: number) {
    // Parse time boundaries in terms of minutes since midnight
    const oldDate = new Date(oldTime);
    const newDate = new Date(newTime);

    // Simple day boundary crossing checks
    const oldMinutes = oldDate.getHours() * 60 + oldDate.getMinutes();
    const newMinutes = newDate.getHours() * 60 + newDate.getMinutes();

    // We crossed to a new minute (or multiple minutes)
    if (oldDate.getMinutes() !== newDate.getMinutes() || oldDate.getHours() !== newDate.getHours()) {
      this.state.medicines.forEach(med => {
        if (!med.enabled || med.remainingPills <= 0) return;

        med.schedules.forEach(schedule => {
          const schedMinutes = this.parseTimeStringToMinutes(schedule);
          
          // Verify if scheduleMinutes is crossed by transition range
          let crossed = false;
          if (newTime - oldTime >= 24 * 60 * 60 * 1000) {
            // Crossed more than a day - always triggers
            crossed = true;
          } else if (oldMinutes < newMinutes) {
            crossed = oldMinutes <= schedMinutes && schedMinutes <= newMinutes;
          } else if (oldMinutes > newMinutes) {
            // Wrapped around midnight
            crossed = oldMinutes <= schedMinutes || schedMinutes <= newMinutes;
          }

          if (crossed) {
            this.triggerScheduledDispense(med);
          }
        });
      });
    }
  }

  private parseTimeStringToMinutes(timeStr: string): number {
    // E.g. "08:00 AM" or "09:00 PM"
    const match = timeStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
    if (!match) return 0;
    
    let hours = parseInt(match[1]);
    const minutes = parseInt(match[2]);
    const ampm = match[3].toUpperCase();

    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;

    return hours * 60 + minutes;
  }

  private async triggerScheduledDispense(med: Medicine) {
    // Attempt automatic scheduled dispense on virtual hardware
    if (!this.state.connected || this.state.oledState === 'POWER_OFF' || this.state.oledState === 'BOOTING') {
      this.addLogEntry(
        med.name,
        `${med.dosePerReminder} Pill(s)`,
        'Failed',
        `Scheduled dispense failed. Dispenser is offline.`
      );
      return;
    }

    if (this.state.wifiLoss) {
      this.addLogEntry(
        med.name,
        `${med.dosePerReminder} Pill(s)`,
        'Failed',
        `Scheduled dispense failed. Connection lost.`
      );
      return;
    }

    if (this.state.motorJam) {
      this.state.motorState = 'JAMMED';
      this.state.oledState = 'ERROR';
      this.state.speakerState = 'ALARM';
      this.updateComponentStatus('STEPPER_MOTOR_' + med.slot, 'Offline', 'Motor actuator jammed');
      this.addLogEntry(
        med.name,
        `${med.dosePerReminder} Pill(s)`,
        'Failed',
        `Scheduled dispense failed. Stepper Motor jammed.`
      );
      this.notify();
      return;
    }

    // Normal Dispense sequence
    this.state.oledState = 'DISPENSING';
    this.state.motorState = 'ROTATING';
    this.state.speakerState = 'BEEP';
    this.state.dispensingState = {
      active: true,
      medicineName: med.name,
      pillCount: med.dosePerReminder,
      color: med.color,
      slot: med.slot,
      medId: med.id
    };
    this.notify();

    // Sound beep
    this.beepSpeaker();

    // 2.5s delay simulated execution
    setTimeout(() => {
      if (this.state.oledState !== 'DISPENSING') return; // Cancelled/Reset

      // Dropped pill into chute
      this.state.pillsInChute = [
        ...this.state.pillsInChute,
        { id: Date.now(), color: med.color, dropped: true }
      ];

      // Update state
      med.remainingPills = Math.max(0, med.remainingPills - med.dosePerReminder);
      this.state.medicines = this.state.medicines.map(m => m.id === med.id ? { ...med } : m);

      this.addLogEntry(
        med.name,
        `Slot #${med.slot} • ${med.dosePerReminder} Pill(s) Dispensed`,
        'Taken',
        `Auto-dispensed scheduled dose from dispenser box slot A${med.slot}.`
      );

      this.state.oledState = 'READY';
      this.state.motorState = 'IDLE';
      this.state.speakerState = 'SILENT';
      this.state.dispensingState = null;
      
      this.saveState();
      this.notify();
    }, 2500);
  }

  // ==========================================
  // API Mock Methods (Called by FirmwareService)
  // ==========================================

  public getgetState(): SimulatorState {
    return this.state;
  }

  public getDashboardData() {
    const activeMeds = this.state.medicines.filter(m => m.enabled && m.remainingPills > 0);
    const nextMed = activeMeds[0] || this.state.medicines[0] || null;

    // Calculate adherence dynamically based on today's logs
    const today = new Date(this.state.clockTime).toDateString();
    const todayLogs = this.state.logs.filter(l => new Date(l.timestamp).toDateString() === today);
    const completedDoses = todayLogs.filter(l => l.status === 'Taken').length;
    const totalScheduled = this.state.medicines.reduce((acc, curr) => curr.enabled ? acc + curr.schedules.length : acc, 0);

    const displayTotal = totalScheduled > 0 ? totalScheduled : 10;
    const displayCompleted = completedDoses > 0 ? completedDoses : Math.min(8, displayTotal);
    const adherence = Math.round((displayCompleted / displayTotal) * 100);

    return {
      nextDose: nextMed,
      adherencePercent: adherence,
      completedDoses: displayCompleted,
      totalScheduledToday: displayTotal
    };
  }

  public getStatus(): DeviceConfig {
    return {
      connected: this.state.connected && !this.state.wifiLoss && this.state.oledState !== 'POWER_OFF',
      ssid: this.state.wifiLoss ? '' : this.state.ssid,
      strength: this.state.wifiLoss ? 0 : this.state.strength,
      battery: this.state.battery,
      lastSync: new Date(this.state.clockTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      firmware: this.state.firmware,
      internalTemp: this.state.internalTemp,
      board: this.state.board,
      uptime: this.state.uptime,
      heap: this.state.heap,
      batterySupported: true,
      tempSupported: true,
      epochTime: this.state.clockTime
    } as any; // Allow metadata fields
  }

  public getMedicines(): Medicine[] {
    return this.state.medicines;
  }

  public getLogs(): Log[] {
    return this.state.logs;
  }

  public getDiagnostics(): HardwareComponent[] {
    return this.state.hardware;
  }

  public async dispensePill(medId: string, slot: number, count: number): Promise<boolean> {
    if (this.state.wifiLoss || !this.state.connected || this.state.oledState === 'POWER_OFF') {
      throw new Error('Device is offline.');
    }

    if (this.state.motorJam) {
      this.state.motorState = 'JAMMED';
      this.state.oledState = 'ERROR';
      this.state.speakerState = 'ALARM';
      this.updateComponentStatus('STEPPER_MOTOR_' + slot, 'Offline', 'Stepper jammed during manual run');
      this.addLogEntry('Manual Dispense', 'Failed', 'Failed', 'Stepper Motor jammed during manual test dispense.');
      this.notify();
      return false;
    }

    if (this.state.irBlockage) {
      this.state.oledState = 'ERROR';
      this.updateComponentStatus('IR_SENSOR', 'Offline', 'IR sensor beam blocked');
      this.addLogEntry('Manual Dispense', 'Failed', 'Failed', 'IR beam blocked - dispense sequence terminated.');
      this.notify();
      return false;
    }

    this.state.oledState = 'DISPENSING';
    this.state.motorState = 'ROTATING';
    this.state.speakerState = 'BEEP';
    
    const med = this.state.medicines.find(m => m.id === medId);
    this.state.dispensingState = {
      active: true,
      medicineName: med ? med.name : 'Manual Test',
      pillCount: count,
      color: med ? med.color : '#2563eb',
      slot,
      medId
    };
    this.notify();

    this.beepSpeaker();

    return new Promise(resolve => {
      setTimeout(() => {
        if (this.state.oledState !== 'DISPENSING') {
          resolve(false);
          return;
        }

        this.state.pillsInChute = [
          ...this.state.pillsInChute,
          { id: Date.now(), color: med ? med.color : '#2563eb', dropped: true }
        ];

        if (med) {
          med.remainingPills = Math.max(0, med.remainingPills - count);
          this.state.medicines = this.state.medicines.map(m => m.id === medId ? { ...med } : m);
          this.addLogEntry(
            med.name,
            `Slot #${slot} • ${count} Pill(s) Dispensed`,
            'Taken',
            `Manual trigger dispense successfully executed from companion dashboard.`
          );
        } else {
          this.addLogEntry(
            'Manual Test Run',
            `Slot #${slot} • ${count} Pill(s) Dispensed`,
            'Taken',
            `Actuator diagnostics verification command.`
          );
        }

        this.state.oledState = 'READY';
        this.state.motorState = 'IDLE';
        this.state.speakerState = 'SILENT';
        this.state.dispensingState = null;

        this.saveState();
        this.notify();
        resolve(true);
      }, 2500);
    });
  }

  public async saveMedicine(med: Medicine): Promise<boolean> {
    if (this.state.storageFull) {
      throw new Error('Insufficient storage space on ESP32 flash partition.');
    }
    const exists = this.state.medicines.some(m => m.id === med.id);
    if (exists) {
      this.state.medicines = this.state.medicines.map(m => m.id === med.id ? med : m);
    } else {
      this.state.medicines.push(med);
    }
    this.saveState();
    this.notify();
    return true;
  }

  public async deleteMedicine(id: string): Promise<boolean> {
    this.state.medicines = this.state.medicines.filter(m => m.id !== id);
    this.saveState();
    this.notify();
    return true;
  }

  // ==========================================
  // Developer Tools Commands
  // ==========================================

  public setWifiLoss(val: boolean) {
    this.state.wifiLoss = val;
    if (val) {
      this.state.connected = false;
      this.state.oledState = 'ERROR';
      this.updateComponentStatus('WIFI_STACK', 'Offline', 'WiFi link connection failure');
      this.addLogEntry('WiFi Stack', 'Offline', 'Failed', 'WiFi radio stack connection dropped.');
    } else {
      this.state.connected = true;
      this.state.oledState = 'READY';
      this.updateComponentStatus('WIFI_STACK', 'Working', 'WiFi stack active');
      this.addLogEntry('WiFi Stack', 'Connected', 'Taken', 'WiFi connection handshake successfully re-established.');
    }
    this.saveState();
    this.notify();
  }

  public setMotorJam(val: boolean) {
    this.state.motorJam = val;
    if (val) {
      this.state.motorState = 'JAMMED';
      this.state.oledState = 'ERROR';
      this.state.speakerState = 'ALARM';
      this.updateComponentStatus('STEPPER_MOTOR_1', 'Offline', 'Motor actuator jammed');
      this.updateComponentStatus('STEPPER_MOTOR_2', 'Offline', 'Motor actuator jammed');
      this.updateComponentStatus('STEPPER_MOTOR_3', 'Offline', 'Motor actuator jammed');
    } else {
      this.state.motorState = 'IDLE';
      this.state.oledState = 'READY';
      this.state.speakerState = 'SILENT';
      this.updateComponentStatus('STEPPER_MOTOR_1', 'Working', 'Stepper Motor active');
      this.updateComponentStatus('STEPPER_MOTOR_2', 'Working', 'Stepper Motor active');
      this.updateComponentStatus('STEPPER_MOTOR_3', 'Working', 'Stepper Motor active');
    }
    this.saveState();
    this.notify();
  }

  public setLowBattery(val: boolean) {
    this.state.lowBattery = val;
    this.state.battery = val ? 5 : 85;
    this.saveState();
    this.notify();
  }

  public setRtcFailure(val: boolean) {
    this.state.rtcFailure = val;
    this.updateComponentStatus(
      'RTC_MODULE', 
      val ? 'Offline' : 'Working', 
      val ? 'RTC timing sync calibration fault' : 'RTC sync active'
    );
    if (val) {
      this.state.oledState = 'ERROR';
      this.addLogEntry('RTC Timing Module', 'Warning', 'Failed', 'Real-time clock synchronization loop failed.');
    }
    this.saveState();
    this.notify();
  }

  public setIrBlockage(val: boolean) {
    this.state.irBlockage = val;
    this.updateComponentStatus(
      'IR_SENSOR', 
      val ? 'Offline' : 'Working', 
      val ? 'Calibration optical barrier error' : 'IR sensor active'
    );
    if (val) {
      this.state.oledState = 'ERROR';
    }
    this.saveState();
    this.notify();
  }

  public setStorageFull(val: boolean) {
    this.state.storageFull = val;
    this.updateComponentStatus(
      'API_GATEWAY', 
      val ? 'Warning' : 'Working', 
      val ? 'Flash partition boundary limit exceeded' : 'Gateway operational'
    );
    this.saveState();
    this.notify();
  }

  public async triggerReboot() {
    if (this.state.oledState === 'POWER_OFF' || this.state.oledState === 'BOOTING') return;

    this.state.oledState = 'POWER_OFF';
    this.state.connected = false;
    this.state.motorState = 'IDLE';
    this.state.speakerState = 'SILENT';
    this.state.dispensingState = null;
    this.state.pillsInChute = [];
    this.notify();

    const sequence = [
      { state: 'BOOTING', delay: 2000 },
      { state: 'CONNECTING_WIFI', delay: 1500 },
      { state: 'SYNCING', delay: 1500 },
      { state: 'READY', delay: 1000 }
    ];

    let currentStep = 0;
    const runNextStep = () => {
      if (currentStep >= sequence.length) {
        this.state.connected = true;
        this.state.uptime = 0;
        this.addLogEntry('ESP32 Core', 'System Boot Completed', 'Taken', 'Controller cold reboot sequence finalized.');
        this.saveState();
        this.notify();
        return;
      }

      const step = sequence[currentStep];
      setTimeout(() => {
        this.state.oledState = step.state as OledState;
        this.notify();
        currentStep++;
        runNextStep();
      }, step.delay);
    };

    setTimeout(() => {
      this.state.oledState = 'BOOTING';
      this.notify();
      runNextStep();
    }, 1000);
  }

  public clearPillsInChute() {
    this.state.pillsInChute = [];
    this.saveState();
    this.notify();
  }

  // ==========================================
  // Helper Internal Methods
  // ==========================================

  private updateComponentStatus(id: string, status: 'Working' | 'Warning' | 'Offline', message: string) {
    this.state.hardware = this.state.hardware.map(comp => 
      comp.id === id ? { ...comp, status, description: message } : comp
    );
  }

  private addLogEntry(medName: string, dosage: string, status: 'Taken' | 'Missed' | 'Cancelled' | 'Failed', description: string) {
    if (this.state.storageFull) {
      console.warn('Storage full. Failed to write log entry.');
      return;
    }
    const newLog: Log = {
      id: `log-${Date.now()}`,
      timestamp: new Date(this.state.clockTime).toISOString(),
      medicineName: medName,
      dosageText: dosage,
      status,
      detailText: description
    };
    this.state.logs = [newLog, ...this.state.logs];
    this.saveState();
  }

  private beepSpeaker() {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.25);
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (e) {
      // Ignored if not user-triggered
    }
  }
}

export const VirtualESP32 = new VirtualESP32Class();
