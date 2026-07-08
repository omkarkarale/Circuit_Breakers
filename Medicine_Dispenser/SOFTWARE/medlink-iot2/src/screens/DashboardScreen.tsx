import React from 'react';
import { Medicine, Log, Settings, DeviceConfig } from '../types';

interface DashboardViewProps {
  medicines: Medicine[];
  logs: Log[];
  config: DeviceConfig;
  onNavigate: (screen: string, selectedId?: string) => void;
  onRefillAll: () => void;
  onTriggerDispense: (med: Medicine) => void;
  onEmergencyDispense: () => void;
  currentClockTime: number;
  settings: Settings;
}

interface DoseEventItem {
  medicine: Medicine;
  timeStr: string;
  targetTime: Date;
}

// Helper to calculate the next scheduled dose event(s)
function getNextDoseEvent(medicines: Medicine[], currentTimestamp: number) {
  const now = new Date(currentTimestamp);
  const activeMeds = medicines.filter(m => m.enabled && m.remainingPills > 0);
  
  if (activeMeds.length === 0) return null;
  
  const allEvents: DoseEventItem[] = [];
  
  activeMeds.forEach(med => {
    med.schedules.forEach(scheduleStr => {
      const match = scheduleStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return;
      
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();

      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const todayDose = new Date(now);
      todayDose.setHours(hours, minutes, 0, 0);
      
      if (todayDose.getTime() > now.getTime()) {
        allEvents.push({
          medicine: med,
          timeStr: scheduleStr,
          targetTime: todayDose
        });
      } else {
        const tomorrowDose = new Date(now);
        tomorrowDose.setDate(tomorrowDose.getDate() + 1);
        tomorrowDose.setHours(hours, minutes, 0, 0);
        allEvents.push({
          medicine: med,
          timeStr: scheduleStr,
          targetTime: tomorrowDose
        });
      }
    });
  });
  
  if (allEvents.length === 0) return null;
  
  allEvents.sort((a, b) => a.targetTime.getTime() - b.targetTime.getTime());
  
  const nextTargetTime = allEvents[0].targetTime;
  const nextTimeStr = allEvents[0].timeStr;
  
  const items = allEvents.filter(e => Math.abs(e.targetTime.getTime() - nextTargetTime.getTime()) < 1000);
  
  return {
    targetTime: nextTargetTime,
    timeStr: nextTimeStr,
    items
  };
}

export default function DashboardView({
  medicines,
  logs,
  config,
  onNavigate,
  onRefillAll,
  currentClockTime,
  settings
}: DashboardViewProps) {

  const nextDoseEvent = getNextDoseEvent(medicines, currentClockTime);

  const getCountdownString = () => {
    if (!nextDoseEvent) return '--:--:--';
    const diffMs = nextDoseEvent.targetTime.getTime() - currentClockTime;
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));
    const h = Math.floor(diffSec / 3600);
    const m = Math.floor((diffSec % 3600) / 60);
    const s = diffSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const todayString = new Date(currentClockTime).toDateString();
  const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === todayString);
  const completedDosesToday = todayLogs.filter(l => l.status === 'Taken' && l.category !== 'Refilled').length;
  
  const totalScheduledToday = medicines.reduce((acc, curr) => {
    if (!curr.enabled) return acc;
    return acc + curr.schedules.length;
  }, 0);

  const progressPercent = totalScheduledToday > 0 
    ? Math.round((completedDosesToday / totalScheduledToday) * 100)
    : 100;

  // Generate today's schedule list
  const todaySchedules: { timeStr: string; timeValue: number; medName: string; status: 'Taken' | 'Missed' | 'Pending'; color: string; slot: number }[] = [];
  const now = new Date(currentClockTime);
  const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();

  medicines.filter(m => m.enabled).forEach(med => {
    med.schedules.forEach(scheduleStr => {
      const match = scheduleStr.match(/^(\d+):(\d+)\s*(AM|PM)$/i);
      if (!match) return;
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3].toUpperCase();
      if (ampm === 'PM' && hours < 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      const scheduleTotalMinutes = hours * 60 + minutes;

      const takenToday = logs.some(l => {
        if (l.medicineName !== med.name || l.status !== 'Taken') return false;
        const logDate = new Date(l.timestamp);
        if (logDate.toDateString() !== now.toDateString()) return false;
        const logTotalMinutes = logDate.getHours() * 60 + logDate.getMinutes();
        return Math.abs(logTotalMinutes - scheduleTotalMinutes) < 60;
      });

      let status: 'Taken' | 'Missed' | 'Pending' = 'Pending';
      if (takenToday) {
        status = 'Taken';
      } else if (currentTotalMinutes > scheduleTotalMinutes + 30) {
        status = 'Missed';
      }

      todaySchedules.push({
        timeStr: scheduleStr,
        timeValue: scheduleTotalMinutes,
        medName: med.name,
        status,
        color: med.color,
        slot: med.slot
      });
    });
  });

  todaySchedules.sort((a, b) => a.timeValue - b.timeValue);

  return (
    <div className="space-y-6 text-light dark:text-white">
      {/* Next Dose Card */}
      {nextDoseEvent ? (
        <section className="bg-gradient-to-br from-accent/95 to-accent-hover/90 dark:from-accent/70 dark:to-accent-hover/60 border border-white/25 text-white rounded-sm p-6 relative overflow-hidden shadow-lg animate-fade-in">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-lg"></div>

          <div className="relative z-10">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-sm backdrop-blur-sm border border-white/10">
              Next Scheduled Dose
            </span>
            
            <div className="flex justify-between items-baseline mt-4">
              <h2 className="text-2xl font-bold tracking-tight">Time: {nextDoseEvent.timeStr}</h2>
              <div className="text-xs text-white/80 font-mono">
                {nextDoseEvent.items.length} Medication{nextDoseEvent.items.length > 1 ? 's' : ''}
              </div>
            </div>

            <div className="mt-3 space-y-2">
              {nextDoseEvent.items.map(item => (
                <div key={item.medicine.id} className="flex justify-between items-center bg-white/10 px-3.5 py-2.5 rounded-sm border border-white/5 backdrop-blur-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.medicine.color }}></span>
                    <span className="text-sm font-semibold">{item.medicine.name}</span>
                    <span className="text-[10px] bg-white/25 px-1.5 py-0.2 rounded font-medium">{item.medicine.type}</span>
                  </div>
                  <div className="flex items-center gap-2 text-right">
                    <span className="text-xs bg-white/10 border border-white/25 px-2 py-0.5 rounded">Slot {item.medicine.slot}</span>
                    <span className="text-xs font-mono font-bold">{item.medicine.dosePerReminder} Pill{item.medicine.dosePerReminder > 1 ? 's' : ''}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex items-end justify-between relative z-10">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70">Dispensing in</p>
              <p className="text-3xl font-mono font-bold">
                {getCountdownString()}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <div className="card-glass p-6 text-center">
          <span className="material-symbols-outlined text-4xl text-muted">medication</span>
          <p className="text-muted dark:text-slate-400 mt-2 font-medium">No active medicine schedules.</p>
        </div>
      )}

      {/* Today's Schedule Panel */}
      <section className="card-glass p-5 space-y-3.5">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold tracking-tight">Today's Schedule</h3>
          <span className="text-[10px] text-muted font-bold font-mono">
            {todaySchedules.filter(s => s.status === 'Taken').length}/{todaySchedules.length} Done
          </span>
        </div>
        <div className="space-y-2">
          {todaySchedules.map((sched, idx) => (
            <div key={idx} className="flex justify-between items-center p-2.5 rounded-sm bg-primary/45 dark:bg-slate-900/35 border border-border-custom text-xs">
              <div className="flex items-center gap-3">
                <span className="font-mono font-bold text-muted w-14">{sched.timeStr}</span>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: sched.color }}></span>
                <span className="font-semibold text-light dark:text-white">{sched.medName}</span>
                <span className="text-[9px] text-muted dark:text-slate-550 font-medium">Slot {sched.slot}</span>
              </div>
              <div>
                {sched.status === 'Taken' ? (
                  <span className="text-success-custom dark:text-green-400 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    <span>Taken</span>
                  </span>
                ) : sched.status === 'Missed' ? (
                  <span className="text-error-custom dark:text-red-400 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    <span>Missed</span>
                  </span>
                ) : (
                  <span className="text-muted font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">schedule</span>
                    <span>Pending</span>
                  </span>
                )}
              </div>
            </div>
          ))}
          {todaySchedules.length === 0 && (
            <p className="text-xs text-center text-muted py-2 font-medium">No schedules active today.</p>
          )}
        </div>
      </section>

      {/* Daily Adherence */}
      <section className="card-glass p-5 flex items-center justify-around gap-4">
        <div className="relative w-22 h-22 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="rgba(79, 70, 229, 0.06)"
              strokeWidth="3.2"
              className="dark:stroke-slate-800/80"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="var(--color-accent)"
              strokeWidth="3.2"
              strokeDasharray={`${progressPercent} 100`}
              strokeLinecap="round"
              className="transition-all duration-1000 dark:stroke-[#a78bfa]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-lg font-bold text-accent dark:text-[#a78bfa] font-mono leading-none">
              {completedDosesToday}/{totalScheduledToday}
            </span>
            <span className="text-[9px] text-muted dark:text-slate-400 font-medium mt-0.5">Doses</span>
          </div>
        </div>
        <div className="flex-grow">
          <h4 className="text-sm font-bold">Daily Adherence</h4>
          <p className="text-xs text-muted dark:text-slate-400 mt-1 leading-relaxed">
            {progressPercent >= 80 
              ? "Excellent adherence! Dispense logs are verified and safe." 
              : "Keep up with your schedules to ensure medication compliance."}
          </p>
          <div className="mt-2 text-[10px] font-bold text-accent dark:text-[#a78bfa] bg-accent-light dark:bg-slate-800/80 border border-accent/15 px-2.5 py-0.5 rounded-sm inline-block">
            {progressPercent}% Correct
          </div>
        </div>
      </section>

      {/* Medicine Inventory */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-sm font-bold">Medicine Inventory</h3>
          <button
            onClick={onRefillAll}
            className="text-xs font-bold text-accent dark:text-[#a78bfa] hover:underline cursor-pointer"
          >
            Refill All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3">
          {medicines.map(med => {
            const isLow = med.remainingPills < 10;
            const remainingPercent = Math.min(100, Math.round((med.remainingPills / med.maxPills) * 100));

            return (
              <div
                key={med.id}
                onClick={() => onNavigate('add-edit', 'slot-' + med.slot)}
                className="card-glass p-3.5 cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: med.color }}
                    ></span>
                    <span className="text-sm font-semibold">{med.name}</span>
                    <span className="text-[10px] text-muted dark:text-slate-450">Slot {med.slot}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${isLow ? 'text-error-custom dark:text-red-400' : 'text-success-custom dark:text-green-400'}`}>
                    {med.remainingPills} / {med.maxPills} left
                  </span>
                </div>
                <div className="w-full bg-accent-light dark:bg-slate-850 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLow ? 'bg-error-custom' : 'bg-accent dark:bg-[#a78bfa]'
                    }`}
                    style={{ width: `${remainingPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
          {medicines.length === 0 && (
            <p className="text-xs text-center text-muted py-2">No slots initialized.</p>
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <h3 className="text-sm font-bold">Recent Activity</h3>
        <div className="card-glass p-4 space-y-4 relative before:absolute before:left-6 before:top-6 before:bottom-6 before:w-[2px] before:bg-accent-light dark:before:bg-slate-800/80">
          {logs.filter(l => l.category !== 'Refilled').slice(0, 3).map((log) => {
            let statusColor = 'bg-accent dark:bg-[#a78bfa] text-white dark:text-slate-900';
            let iconName = 'check_circle';

            if (log.status === 'Missed') {
              statusColor = 'bg-amber-600 dark:bg-amber-500 text-white';
              iconName = 'history';
            } else if (log.status === 'Cancelled') {
              statusColor = 'bg-slate-500 dark:bg-slate-600 text-white';
              iconName = 'cancel';
            } else if (log.status === 'Failed') {
              statusColor = 'bg-error-custom text-white';
              iconName = 'error';
            }

            const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={log.id} className="flex gap-4 relative z-10 items-start animate-fade-in">
                <div className={`w-6 h-6 rounded-full ${statusColor} flex items-center justify-center ring-4 ring-white dark:ring-slate-900 shrink-0 shadow-sm`}>
                  <span className="material-symbols-outlined text-[13px] fill-icon">{iconName}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold">{log.medicineName} {log.status}</p>
                  <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">{logTime} • {log.detailText}</p>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <p className="text-xs text-center text-muted py-2">No activity logs recorded.</p>
          )}
        </div>
      </section>

      {/* Connection & Telemetry Status (battery/temp hidden if not supported by firmware) */}
      <section className="card-glass p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full flex items-center justify-center bg-accent-light/40 text-accent dark:bg-accent/20 dark:text-[#a78bfa] shrink-0">
              <span className="material-symbols-outlined text-xl">
                {settings.apiMode === 'REAL_DEVICE' ? 'dns' : 'wifi'}
              </span>
            </div>
            <div>
              <h3 className="text-xs font-bold">
                {settings.apiMode === 'REAL_DEVICE' ? 'ESP8266 IoT Hub Connected' : 'Simulated Dispenser Online'}
              </h3>
              <p className="text-[9px] text-muted dark:text-slate-400 mt-1 font-semibold uppercase tracking-wider font-mono">
                IP: {settings.esp32Ip || '192.168.4.1'} • RSSI: {config.strength ? `${-100 + config.strength * 15} dBm` : 'Offline'}
              </p>
            </div>
          </div>
          <span className={`w-2.5 h-2.5 rounded-full ${config.connected ? 'bg-success-custom animate-pulse' : 'bg-error-custom'}`}></span>
        </div>

        {/* Dynamic Telemetry row (Battery & Temperature) — ONLY show if supported by firmware */}
        {(config.batterySupported || config.tempSupported) && (
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border-custom dark:border-slate-800">
            {config.batterySupported && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary/45 dark:bg-slate-900/30 text-xs">
                <span className="material-symbols-outlined text-muted text-base">battery_charging_full</span>
                <div>
                  <p className="text-[9px] text-muted uppercase font-bold">Battery</p>
                  <p className="font-bold font-mono">{config.battery}%</p>
                </div>
              </div>
            )}
            {config.tempSupported && (
              <div className="flex items-center gap-2 px-3 py-2 rounded-sm bg-primary/45 dark:bg-slate-900/30 text-xs">
                <span className="material-symbols-outlined text-muted text-base">thermostat</span>
                <div>
                  <p className="text-[9px] text-muted uppercase font-bold">Internal Temp</p>
                  <p className="font-bold font-mono">{config.internalTemp}°C</p>
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
