import React, { useState, useEffect } from 'react';
import { Medicine, Log, DeviceConfig, Settings } from '../types';

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
      
      // Candidate today
      const todayDose = new Date(now);
      todayDose.setHours(hours, minutes, 0, 0);
      
      if (todayDose.getTime() > now.getTime()) {
        allEvents.push({
          medicine: med,
          timeStr: scheduleStr,
          targetTime: todayDose
        });
      } else {
        // Candidate tomorrow
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
  
  // Sort chronologically
  allEvents.sort((a, b) => a.targetTime.getTime() - b.targetTime.getTime());
  
  const nextTargetTime = allEvents[0].targetTime;
  const nextTimeStr = allEvents[0].timeStr;
  
  // Group all events that occur at this same target time
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
  onTriggerDispense,
  onEmergencyDispense,
  currentClockTime,
  settings
}: DashboardViewProps) {

  // Live Next Dose Calculation based on currentClockTime
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

  // Audited Adherence Calculation (Real logs and schedules)
  const todayString = new Date(currentClockTime).toDateString();
  const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === todayString);
  const completedDosesToday = todayLogs.filter(l => l.status === 'Taken').length;
  
  const totalScheduledToday = medicines.reduce((acc, curr) => {
    if (!curr.enabled) return acc;
    return acc + curr.schedules.length;
  }, 0);

  const progressPercent = totalScheduledToday > 0 
    ? Math.round((completedDosesToday / totalScheduledToday) * 100)
    : 100; // default to 100 if no active schedules are set

  return (
    <div className="space-y-6 text-[#111c2d] dark:text-white">
      {/* Device Status Card */}
      <section className="bg-white dark:bg-slate-800 border border-[#c3c6d7] dark:border-slate-700/50 shadow-sm rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${config.connected ? 'bg-[#7cf994] text-[#007230]' : 'bg-[#ffdad6] text-[#ba1a1a]'}`}>
            <span className="material-symbols-outlined text-2xl">{config.connected ? 'wifi' : 'wifi_off'}</span>
          </div>
          <div>
            <h3 className="text-base font-semibold">
              {config.connected ? 'Dispenser Connected' : 'Dispenser Offline'}
            </h3>
            <p className="text-xs text-[#434655] dark:text-slate-400">
              SSID: {config.ssid || '--'} • IP: {config.ipAddress || settings.esp32Ip || 'Unavailable'}
            </p>
          </div>
        </div>

        {/* Battery section - show only when supported */}
        {config.batterySupported && (
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="flex items-center gap-1 text-[#006e2d] dark:text-[#7cf994] font-bold text-sm">
                <span className="material-symbols-outlined text-sm">battery_charging_80</span>
                <span>{config.battery}%</span>
              </div>
              <span className="text-[10px] text-[#737686] dark:text-slate-400 uppercase tracking-wider block">Battery</span>
            </div>
          </div>
        )}
      </section>

      {/* Next Dose Card (Hero Card) */}
      {nextDoseEvent ? (
        <section className="bg-gradient-to-br from-[#0053db] to-[#2563eb] text-white rounded-2xl p-6 relative overflow-hidden shadow-lg transition-transform hover:scale-[1.01]">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-lg"></div>

          <div className="relative z-10">
            <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
              Next Scheduled Dose
            </span>
            
            <div className="flex justify-between items-baseline mt-4">
              <h2 className="text-2xl font-bold tracking-tight">Time: {nextDoseEvent.timeStr}</h2>
              <div className="text-xs text-white/80 font-mono">
                {nextDoseEvent.items.length} Medication{nextDoseEvent.items.length > 1 ? 's' : ''}
              </div>
            </div>

            {/* Medicines List at this time */}
            <div className="mt-3 space-y-2.5">
              {nextDoseEvent.items.map(item => (
                <div key={item.medicine.id} className="flex justify-between items-center bg-white/10 px-3.5 py-2.5 rounded-xl border border-white/5 backdrop-blur-xs">
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
            
            {/* Take Now button triggers dispense for the first next medication */}
            <button
              onClick={() => onTriggerDispense(nextDoseEvent.items[0].medicine)}
              className="bg-white text-[#004ac6] hover:bg-[#eeefff] transition-all rounded-full px-5 py-2.5 text-xs font-bold shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5"
            >
              <span>Dispense Next</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl text-center border border-[#c3c6d7] dark:border-slate-700/50">
          <span className="material-symbols-outlined text-4xl text-[#737686]">medication</span>
          <p className="text-[#434655] dark:text-slate-400 mt-2 font-medium">No active medicine schedules.</p>
        </div>
      )}

      {/* Today's Progress Card */}
      <section className="bg-white dark:bg-slate-800 rounded-2xl p-5 shadow-sm border border-[#c3c6d7] dark:border-slate-700/50 flex items-center justify-around gap-4">
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#e7eeff"
              strokeWidth="3.2"
              className="dark:stroke-slate-700"
            />
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#004ac6"
              strokeWidth="3.2"
              strokeDasharray={`${progressPercent} 100`}
              strokeLinecap="round"
              className="transition-all duration-1000 dark:stroke-[#7cf994]"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[#004ac6] dark:text-[#7cf994] font-mono leading-none">
              {completedDosesToday}/{totalScheduledToday}
            </span>
            <span className="text-[10px] text-[#737686] dark:text-slate-400 font-medium mt-0.5">Doses</span>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold">Daily Adherence</h4>
          <p className="text-xs text-[#434655] dark:text-slate-400 mt-1">
            {progressPercent >= 80 
              ? "Excellent adherence! Dispense logs are verified and safe." 
              : "Keep up with your schedules to ensure medication compliance."}
          </p>
          <div className="mt-2 text-[10px] font-semibold text-[#004ac6] dark:text-[#002109] bg-[#e7eeff] dark:bg-[#7cf994] inline-block px-2.5 py-0.5 rounded-full">
            {progressPercent}% Correct
          </div>
        </div>
      </section>

      {/* Medicine Inventory */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-bold">Medicine Inventory</h3>
          <button
            onClick={onRefillAll}
            className="text-xs font-bold text-[#004ac6] dark:text-[#7cf994] hover:underline"
          >
            Refill All
          </button>
        </div>
        <div className="grid grid-cols-1 gap-2.5">
          {medicines.map(med => {
            const isLow = med.remainingPills < 10;
            const remainingPercent = Math.min(100, Math.round((med.remainingPills / med.maxPills) * 100));

            return (
              <div
                key={med.id}
                onClick={() => onNavigate('details', med.id)}
                className="bg-white dark:bg-slate-800 p-3.5 rounded-2xl shadow-sm border border-[#c3c6d7] dark:border-slate-700/50 hover:shadow transition-all cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: med.color }}
                    ></span>
                    <span className="text-sm font-semibold">{med.name}</span>
                    <span className="text-[10px] text-[#737686] dark:text-slate-400">Slot {med.slot}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${isLow ? 'text-[#ba1a1a] dark:text-red-400' : 'text-[#006e2d] dark:text-green-400'}`}>
                    {med.remainingPills} / {med.maxPills} left
                  </span>
                </div>
                <div className="w-full bg-[#f0f3ff] dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLow ? 'bg-[#ba1a1a] dark:bg-red-400' : 'bg-[#006e2d] dark:bg-green-450'
                    }`}
                    style={{ width: `${remainingPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
          {medicines.length === 0 && (
            <p className="text-xs text-center text-[#737686] py-2">No slots initialized.</p>
          )}
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <h3 className="text-base font-bold">Recent Activity</h3>
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-[#c3c6d7] dark:border-slate-700/50 space-y-4 relative before:absolute before:left-6 before:top-6 before:bottom-6 before:w-[2px] before:bg-[#e7eeff] dark:before:bg-slate-700">
          {logs.slice(0, 3).map((log) => {
            let statusColor = 'bg-[#006e2d]';
            let iconName = 'check_circle';

            if (log.status === 'Missed') {
              statusColor = 'bg-[#784b00]';
              iconName = 'history';
            } else if (log.status === 'Cancelled') {
              statusColor = 'bg-[#737686]';
              iconName = 'cancel';
            } else if (log.status === 'Failed') {
              statusColor = 'bg-[#ba1a1a]';
              iconName = 'error';
            }

            const logTime = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

            return (
              <div key={log.id} className="flex gap-4 relative z-10 items-start">
                <div className={`w-6 h-6 rounded-full ${statusColor} text-white flex items-center justify-center ring-4 ring-white dark:ring-slate-800 shrink-0 shadow-sm`}>
                  <span className="material-symbols-outlined text-[13px] fill-icon">{iconName}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold">{log.medicineName} {log.status}</p>
                  <p className="text-[10px] text-[#737686] dark:text-slate-400 mt-0.5">{logTime} • {log.detailText}</p>
                </div>
              </div>
            );
          })}
          {logs.length === 0 && (
            <p className="text-xs text-center text-[#737686] py-2">No activity logs recorded.</p>
          )}
        </div>
      </section>
    </div>
  );
}
