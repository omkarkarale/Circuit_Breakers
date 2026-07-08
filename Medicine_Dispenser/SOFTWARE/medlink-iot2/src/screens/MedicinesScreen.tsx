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
  onNavigate,
  onRefill
}: MedicinesViewProps) {
  // Low stock summary
  const lowStockCount = medicines.filter(m => m.remainingPills < 10).length;

  return (
    <div className="space-y-6 pt-2 text-light dark:text-white">
      {/* Low Stock Alert card */}
      <section className="grid grid-cols-1 gap-4">
        <div className="card-glass p-5 flex flex-col justify-center items-center text-center">
          <span className="material-symbols-outlined text-accent dark:text-[#7cf994] text-3xl mb-1.5 fill-icon">inventory_2</span>
          <p className="text-xs font-bold text-muted dark:text-slate-400 font-sans">Low Stock Slots Alert</p>
          <p className={`text-xl font-bold mt-0.5 ${lowStockCount > 0 ? 'text-error-custom dark:text-red-400' : 'text-success-custom dark:text-[#7cf994]'}`}>
            {lowStockCount} Slot{lowStockCount !== 1 ? 's' : ''} Need Refill
          </p>
        </div>
      </section>

      {/* Header Info */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-base font-bold">Physical Dispenser Slots</h2>
        <span className="text-xs text-muted dark:text-slate-400 font-medium">3 Slots Configured</span>
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
                onClick={() => onNavigate('add-edit', 'slot-' + slotNum)}
                className="card-glass p-5 flex flex-col gap-4 relative transition-all cursor-pointer hover:scale-[1.01]"
              >
                {/* Slot Title */}
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2.5">
                    <div
                      className="w-10 h-10 rounded-sm flex items-center justify-center text-white text-xs font-bold font-mono"
                      style={{ backgroundColor: med.color }}
                    >
                      S{slotNum}
                    </div>
                    <div>
                      <h3 className="text-base font-bold leading-none">{med.name}</h3>
                      <p className="text-[10px] text-muted dark:text-slate-400 mt-1.5 font-semibold uppercase tracking-wider">{med.type}</p>
                    </div>
                  </div>
                </div>

                {/* Details Table Info */}
                <div className="grid grid-cols-3 gap-2 py-3 border-y border-border-custom dark:border-slate-850 text-xs">
                  <div>
                    <p className="text-[9px] text-muted dark:text-slate-400 uppercase tracking-wider font-bold">Remaining</p>
                    <p className={`font-bold font-mono mt-0.5 ${isLow ? 'text-error-custom dark:text-red-400' : 'text-accent dark:text-[#7cf994]'}`}>
                      {med.remainingPills} / {med.maxPills}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted dark:text-slate-400 uppercase tracking-wider font-bold">Dose</p>
                    <p className="font-bold mt-0.5">{med.dosePerReminder} Pill{med.dosePerReminder > 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted dark:text-slate-400 uppercase tracking-wider font-bold">Pattern</p>
                    <p className="font-bold mt-0.5 truncate">{med.repeatPattern}</p>
                  </div>
                </div>

                {/* Schedule list */}
                <div className="space-y-1">
                  <span className="text-[9px] text-muted dark:text-slate-400 uppercase tracking-wider font-bold">Reminder Times</span>
                  <div className="flex flex-wrap gap-1.5">
                    {med.schedules.map((time, idx) => (
                      <span key={idx} className="bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] border border-accent/10 px-2 py-0.5 rounded-sm font-mono text-[10px] font-bold">
                        {time}
                      </span>
                    ))}
                    {med.schedules.length === 0 && <span className="text-[10px] italic text-muted">No reminders set</span>}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-border-custom dark:border-slate-850">
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // prevent opening configuration page
                      onRefill(med.id);
                    }}
                    className="py-2 bg-accent-light hover:bg-accent/15 text-accent dark:bg-slate-800 dark:hover:bg-slate-700/80 dark:text-[#7cf994] rounded-sm text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">replay</span>
                    <span>Refill</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // prevent opening twice
                      onNavigate('add-edit', 'slot-' + slotNum);
                    }}
                    className="py-2 border border-border-custom text-muted hover:bg-accent-light dark:hover:bg-slate-800 rounded-sm text-xs font-bold transition-all active:scale-95 flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-sm font-bold">edit</span>
                    <span>Edit</span>
                  </button>
                </div>
              </div>
            );
          } else {
            return (
              <div
                key={slotNum}
                onClick={() => onNavigate('add-edit', 'slot-' + slotNum)}
                className="bg-primary/30 dark:bg-slate-900/30 backdrop-blur-md rounded-sm shadow-sm border border-dashed border-border-custom dark:border-slate-800 p-6 flex flex-col items-center justify-center text-center gap-3 cursor-pointer hover:scale-[1.01] transition-transform"
              >
                <div className="w-12 h-12 rounded-full bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">medical_services</span>
                </div>
                <div>
                  <h4 className="text-sm font-bold">Slot {slotNum} — Empty Slot</h4>
                  <p className="text-xs text-muted dark:text-slate-400 mt-1 max-w-[200px]">
                    No medication assigned to this physical slot dispenser.
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation(); // prevent opening twice
                    onNavigate('add-edit', 'slot-' + slotNum);
                  }}
                  className="btn-primary px-4 py-2 text-xs rounded-sm cursor-pointer"
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
