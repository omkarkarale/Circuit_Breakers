import React, { useState, useEffect } from 'react';
import { Medicine, Log, DeviceConfig } from '../types';

interface DashboardViewProps {
  medicines: Medicine[];
  logs: Log[];
  config: DeviceConfig;
  onNavigate: (screen: string, selectedId?: string) => void;
  onRefillAll: () => void;
  onTriggerDispense: (med: Medicine) => void;
  onEmergencyDispense: () => void;
}

export default function DashboardView({
  medicines,
  logs,
  config,
  onNavigate,
  onRefillAll,
  onTriggerDispense,
  onEmergencyDispense
}: DashboardViewProps) {
  // Find next medicine scheduled
  const activeMeds = medicines.filter(m => m.enabled && m.remainingPills > 0);
  const nextMed = activeMeds[0] || medicines[0]; // Fallback to first med

  // Live Countdown timer simulation
  const [timeLeft, setTimeLeft] = useState({ hours: 1, minutes: 23, seconds: 57 });

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        } else {
          return { hours: 2, minutes: 0, seconds: 0 }; // reset
        }
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (num: number) => String(num).padStart(2, '0');

  // Adherence Calculation (Dynamic based on logs today)
  const today = new Date().toDateString();
  const todayLogs = logs.filter(l => new Date(l.timestamp).toDateString() === today);
  const completedDoses = todayLogs.filter(l => l.status === 'Taken').length;
  const totalScheduledToday = medicines.reduce((acc, curr) => {
    if (!curr.enabled) return acc;
    return acc + curr.schedules.length;
  }, 0);
  
  // Safe defaults
  const displayTotal = totalScheduledToday > 0 ? totalScheduledToday : 10;
  const displayCompleted = completedDoses > 0 ? completedDoses : Math.min(8, displayTotal);
  const progressPercent = Math.round((displayCompleted / displayTotal) * 100);

  return (
    <div className="space-y-6">
      {/* Device Status Card */}
      <section className="bg-white border border-[#c3c6d7] shadow-sm rounded-2xl p-4 flex items-center justify-between transition-all hover:shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#7cf994] text-[#007230] flex items-center justify-center">
            <span className="material-symbols-outlined fill-icon text-2xl">wifi</span>
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#111c2d]">Dispenser Connected</h3>
            <p className="text-xs text-[#434655]">Last sync {config.lastSync}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-center gap-1 text-[#006e2d] font-bold text-sm">
              <span className="material-symbols-outlined text-sm">battery_charging_80</span>
              <span>{config.battery}%</span>
            </div>
            <span className="text-[10px] text-[#737686] uppercase tracking-wider block">Battery</span>
          </div>
        </div>
      </section>

      {/* Next Dose Card (Hero Card) */}
      {nextMed ? (
        <section className="bg-gradient-to-br from-[#0053db] to-[#2563eb] text-white rounded-2xl p-6 relative overflow-hidden shadow-lg transition-transform hover:scale-[1.01]">
          {/* Decorative design nodes representing IoT telemetry flow */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-10 -mt-10 blur-xl"></div>
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full -ml-8 -mb-8 blur-lg"></div>

          <div className="relative z-10 flex justify-between items-start">
            <div>
              <span className="text-xs font-semibold bg-white/20 px-3 py-1 rounded-full backdrop-blur-sm">
                Next Dose
              </span>
              <h2 className="text-2xl font-bold mt-4 tracking-tight">{nextMed.name}</h2>
              <div className="flex items-center gap-1.5 mt-2 text-white/90 text-sm">
                <span className="material-symbols-outlined text-sm">schedule</span>
                <span>Scheduled {nextMed.schedules[0] || '08:00 AM'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-semibold bg-white/10 border border-white/20 px-2.5 py-1 rounded-md">
                Slot #{nextMed.slot}
              </span>
              <p className="text-xs text-white/80 mt-2 font-mono">{nextMed.dosePerReminder} Pill{nextMed.dosePerReminder > 1 ? 's' : ''}</p>
            </div>
          </div>

          <div className="mt-8 flex items-end justify-between relative z-10">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-white/70">Dispensing in</p>
              <p className="text-3xl font-mono font-bold">
                {formatTime(timeLeft.hours)}:{formatTime(timeLeft.minutes)}:{formatTime(timeLeft.seconds)}
              </p>
            </div>
            <button
              onClick={() => onTriggerDispense(nextMed)}
              className="bg-white text-[#004ac6] hover:bg-[#eeefff] transition-all rounded-full px-5 py-2.5 text-xs font-bold shadow-md hover:shadow-lg active:scale-95 flex items-center gap-1.5"
            >
              <span>Take Now</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>
        </section>
      ) : (
        <div className="bg-white p-6 rounded-2xl text-center border border-[#c3c6d7]">
          <span className="material-symbols-outlined text-4xl text-[#737686]">medication</span>
          <p className="text-[#434655] mt-2">No active medicine schedules.</p>
        </div>
      )}

      {/* Today's Progress Card */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-[#c3c6d7] flex items-center justify-around gap-4">
        <div className="relative w-24 h-24 flex items-center justify-center shrink-0">
          {/* Circular Progress Path */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="15.915"
              fill="none"
              stroke="#e7eeff"
              strokeWidth="3.2"
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
              className="transition-all duration-1000"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-[#004ac6] font-mono leading-none">
              {displayCompleted}/{displayTotal}
            </span>
            <span className="text-[10px] text-[#737686] font-medium mt-0.5">Doses</span>
          </div>
        </div>
        <div className="flex-1">
          <h4 className="text-base font-bold text-[#111c2d]">Daily Adherence</h4>
          <p className="text-xs text-[#434655] mt-1">
            {progressPercent >= 80 
              ? "You're doing great today! Only minor doses remaining." 
              : "Keep up with your medicine schedule for clinical accuracy."}
          </p>
          <div className="mt-2 text-[10px] font-semibold text-[#004ac6] bg-[#e7eeff] inline-block px-2.5 py-0.5 rounded-full">
            {progressPercent}% Complete
          </div>
        </div>
      </section>

      {/* Medicine Inventory */}
      <section className="space-y-3">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-base font-bold text-[#111c2d]">Medicine Inventory</h3>
          <button
            onClick={onRefillAll}
            className="text-xs font-bold text-[#004ac6] hover:underline"
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
                className="bg-white p-3.5 rounded-2xl shadow-sm border border-[#c3c6d7] hover:shadow transition-all cursor-pointer flex flex-col gap-2.5"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: med.color }}
                    ></span>
                    <span className="text-sm font-semibold text-[#111c2d]">{med.name}</span>
                  </div>
                  <span className={`text-xs font-bold font-mono ${isLow ? 'text-[#ba1a1a]' : 'text-[#006e2d]'}`}>
                    {med.remainingPills} / {med.maxPills} left
                  </span>
                </div>
                <div className="w-full bg-[#f0f3ff] rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isLow ? 'bg-[#ba1a1a]' : 'bg-[#006e2d]'
                    }`}
                    style={{ width: `${remainingPercent}%` }}
                  ></div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Quick Actions */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-[#111c2d]">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => onNavigate('add-edit')}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-[#f0f3ff] hover:bg-[#dee8ff] border border-[#c3c6d7]/30 rounded-2xl text-[#004ac6] transition-all hover:shadow active:scale-95 group text-center"
          >
            <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">add_circle</span>
            <span className="text-xs font-bold">Add Medicine</span>
          </button>
          <button
            onClick={() => onTriggerDispense(nextMed)}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-[#f0f3ff] hover:bg-[#dee8ff] border border-[#c3c6d7]/30 rounded-2xl text-[#004ac6] transition-all hover:shadow active:scale-95 group text-center"
          >
            <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">vaccines</span>
            <span className="text-xs font-bold">Dispense Test</span>
          </button>
          <button
            onClick={() => onNavigate('logs-list')}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-[#f0f3ff] hover:bg-[#dee8ff] border border-[#c3c6d7]/30 rounded-2xl text-[#004ac6] transition-all hover:shadow active:scale-95 group text-center"
          >
            <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110">history</span>
            <span className="text-xs font-bold">View Logs</span>
          </button>
          <button
            onClick={onEmergencyDispense}
            className="flex flex-col items-center justify-center gap-2 p-4 bg-[#ffdad6] hover:bg-[#ffb95f]/20 border border-[#ba1a1a]/20 rounded-2xl text-[#ba1a1a] transition-all hover:shadow active:scale-95 group text-center"
          >
            <span className="material-symbols-outlined text-3xl transition-transform group-hover:scale-110 fill-icon animate-pulse text-[#ba1a1a]">emergency</span>
            <span className="text-xs font-bold">Emergency</span>
          </button>
        </div>
      </section>

      {/* Recent Activity */}
      <section className="space-y-3">
        <h3 className="text-base font-bold text-[#111c2d]">Recent Activity</h3>
        <div className="bg-white rounded-2xl p-4 border border-[#c3c6d7] space-y-4 relative before:absolute before:left-6 before:top-6 before:bottom-6 before:w-[2px] before:bg-[#e7eeff]">
          {logs.slice(0, 3).map((log, index) => {
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
                <div className={`w-6 h-6 rounded-full ${statusColor} text-white flex items-center justify-center ring-4 ring-white shrink-0 shadow-sm`}>
                  <span className="material-symbols-outlined text-[13px] fill-icon">{iconName}</span>
                </div>
                <div className="flex-1">
                  <p className="text-xs font-bold text-[#111c2d]">{log.medicineName} {log.status}</p>
                  <p className="text-[10px] text-[#737686] mt-0.5">{logTime} • {log.detailText}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
