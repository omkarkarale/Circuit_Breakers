import React from 'react';
import { Medicine, Log } from '../types';

interface MedicinesViewProps {
  medicines: Medicine[];
  logs: Log[];
  onNavigate: (screen: string, selectedId?: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onRefill: (id: string) => void;
}

export default function MedicinesView({
  medicines,
  logs,
  onNavigate,
  onToggleEnabled,
  onRefill
}: MedicinesViewProps) {
  // Low stock summary
  const lowStockCount = medicines.filter(m => m.remainingPills < 10).length;

  return (
    <div className="space-y-6 pt-2 text-[#111c2d] dark:text-white">
      {/* Low Stock Alert card - keep only inventory info, remove duplicate adherence */}
      <section className="grid grid-cols-1 gap-4">
        <div className="bg-[#dee8ff] dark:bg-slate-800 p-5 rounded-2xl flex flex-col justify-center items-center text-center border border-[#c3c6d7]/30 dark:border-slate-700/30 shadow-sm">
          <span className="material-symbols-outlined text-[#004ac6] dark:text-[#7cf994] text-3xl mb-1.5 fill-icon">inventory_2</span>
          <p className="text-xs font-bold text-[#434655] dark:text-slate-400">Low Stock Slots Alert</p>
          <p className={`text-xl font-bold mt-0.5 ${lowStockCount > 0 ? 'text-[#ba1a1a] dark:text-red-450' : 'text-[#006e2d] dark:text-[#7cf994]'}`}>
            {lowStockCount} Slot{lowStockCount !== 1 ? 's' : ''} Need Refill
          </p>
        </div>
      </section>

      {/* Header Info */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-base font-bold">Physical Dispenser Slots</h2>
        <span className="text-xs text-[#737686] dark:text-slate-400 font-medium">3 Slots Configured</span>
      </div>

      {/* Slots List */}
      <div className="grid grid-cols-1 gap-4.5">
        {([1, 2, 3] as const).map(slotNum => {
          const med = medicines.find(m => m.slot === slotNum);
          
          if (med) {
            const isLow = med.remainingPills < 10;
            return (
              <div
                key={med.id}
                className={`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-[#c3c6d7]/35 dark:border-slate-700/30 p-5 flex flex-col gap-4 relative ${
                  !med.enabled ? 'opacity-70 grayscale-[20%]' : ''
                }`}
              >
                {/* Slot Title & Status Badge */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold font-mono"
                      style={{ backgroundColor: med.color }}
                    >
                      S{slotNum}
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-none">{med.name}</h3>
                      <p className="text-[10px] text-[#737686] dark:text-slate-400 mt-1 font-semibold uppercase tracking-wider">{med.type}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-0.5 font-bold text-[9px] rounded-full uppercase tracking-wider ${
                    med.enabled ? 'bg-[#7cf994]/20 text-[#006e2d] dark:text-[#7cf994]' : 'bg-[#e7eeff] text-[#737686]'
                  }`}>
                    {med.enabled ? 'Active' : 'Muted'}
                  </span>
                </div>

                {/* Details Table Info */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-[#c3c6d7]/20 dark:border-slate-700/30 text-xs">
                  <div>
                    <p className="text-[9px] text-[#737686] dark:text-slate-450 uppercase tracking-wider font-bold">Remaining</p>
                    <p className={`font-bold font-mono mt-0.5 ${isLow ? 'text-[#ba1a1a] dark:text-red-400' : 'text-[#111c2d] dark:text-blue-300'}`}>
                      {med.remainingPills} / {med.maxPills}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#737686] dark:text-slate-450 uppercase tracking-wider font-bold">Dose</p>
                    <p className="font-bold text-[#111c2d] dark:text-blue-300 mt-0.5">{med.dosePerReminder} Pill{med.dosePerReminder > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-[#737686] dark:text-slate-450 uppercase tracking-wider font-bold">Pattern</p>
                    <p className="font-bold text-[#111c2d] dark:text-blue-300 mt-0.5">{med.repeatPattern}</p>
                  </div>
                </div>

                {/* Schedule list */}
                <div className="space-y-1">
                  <span className="text-[9px] text-[#737686] dark:text-slate-450 uppercase tracking-wider font-bold">Reminder Times</span>
                  <div className="flex flex-wrap gap-1.5">
                    {med.schedules.map((time, idx) => (
                      <span key={idx} className="bg-[#f0f3ff] dark:bg-slate-700 text-[#004ac6] dark:text-[#7cf994] px-2 py-0.5 rounded font-mono text-[10px] font-bold">
                        {time}
                      </span>
                    ))}
                    {med.schedules.length === 0 && <span className="text-[10px] italic text-[#737686]">No reminders set</span>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-3 gap-2 mt-2 pt-2 border-t border-[#cbd5e1]/10">
                  <button
                    onClick={() => onRefill(med.id)}
                    className="py-2 bg-[#dee8ff] dark:bg-slate-700 hover:bg-[#cbe0ff] dark:hover:bg-slate-600 text-[#004ac6] dark:text-[#7cf994] rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">replay</span>
                    <span>Refill</span>
                  </button>
                  <button
                    onClick={() => onNavigate('add-edit', med.id)}
                    className="py-2 border border-[#c3c6d7] dark:border-slate-650 text-[#434655] dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">edit</span>
                    <span>Edit Schedule</span>
                  </button>
                  <button
                    onClick={() => onNavigate('add-edit', `slot-${slotNum}`)}
                    className="py-2 border border-[#c3c6d7] dark:border-slate-650 text-[#ba1a1a] hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1"
                  >
                    <span className="material-symbols-outlined text-sm">swap_horiz</span>
                    <span>Replace</span>
                  </button>
                </div>

                {/* Inline reminder toggle switch */}
                <div className="absolute top-5 right-5">
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={med.enabled}
                      onChange={(e) => onToggleEnabled(med.id, e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-10 h-5.5 bg-[#c3c6d7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-[#004ac6]"></div>
                  </label>
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={slotNum}
                className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-dashed border-[#c3c6d7] dark:border-slate-700/60 p-6 flex flex-col items-center justify-center text-center gap-3"
              >
                <div className="w-12 h-12 rounded-full bg-[#f0f3ff] dark:bg-slate-700 text-[#004ac6] dark:text-[#7cf994] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">medical_services</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Slot {slotNum} — Empty Slot</h4>
                  <p className="text-xs text-[#737686] dark:text-slate-450 mt-1 max-w-[200px]">
                    No medication assigned to this physical slot dispenser.
                  </p>
                </div>
                <button
                  onClick={() => onNavigate('add-edit', `slot-${slotNum}`)}
                  className="px-4 py-2 bg-[#004ac6] dark:bg-[#7cf994] text-white dark:text-[#002109] font-bold text-xs rounded-xl shadow active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Assign Medicine</span>
                </button>
              </div>
            );
          }
        })}
      </div>
    </div>
  );
}
