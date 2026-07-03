import React from 'react';
import { Medicine, Log } from '../types';

interface MedicinesViewProps {
  medicines: Medicine[];
  logs: Log[];
  onNavigate: (screen: string, selectedId?: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
}

export default function MedicinesView({
  medicines,
  logs,
  onNavigate,
  onToggleEnabled
}: MedicinesViewProps) {
  // Low stock summary
  const lowStockCount = medicines.filter(m => m.remainingPills < 10).length;

  // Adherence average calculation
  const totalLogs = logs.length;
  const takenLogs = logs.filter(l => l.status === 'Taken').length;
  const adherenceRate = totalLogs > 0 ? Math.round((takenLogs / totalLogs) * 100) : 94;

  return (
    <div className="space-y-6">
      {/* Overview stats matching reference mockup */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-2 bg-[#2563eb] text-white p-5 rounded-2xl relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="relative z-10">
            <p className="text-xs font-semibold text-white/80">Daily Adherence</p>
            <h2 className="text-2xl font-bold mt-1">{adherenceRate}% Success</h2>
            <p className="text-xs text-white/90 mt-2 max-w-[280px]">
              Great job! You are maintaining strict adherence to your clinical schedule.
            </p>
          </div>
          <div className="mt-4 flex gap-2 relative z-10">
            <div className="h-2 flex-1 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7cf994] transition-all duration-1000"
                style={{ width: `${adherenceRate}%` }}
              ></div>
            </div>
          </div>
        </div>
        <div className="bg-[#dee8ff] p-5 rounded-2xl flex flex-col justify-center items-center text-center border border-[#c3c6d7]/30 shadow-sm">
          <span className="material-symbols-outlined text-[#004ac6] text-3xl mb-1.5 fill-icon">inventory_2</span>
          <p className="text-xs font-bold text-[#434655]">Low Stock Alert</p>
          <p className={`text-xl font-bold mt-0.5 ${lowStockCount > 0 ? 'text-[#ba1a1a]' : 'text-[#006e2d]'}`}>
            {lowStockCount} Item{lowStockCount !== 1 ? 's' : ''}
          </p>
        </div>
      </section>

      {/* Header with Search and Filter actions */}
      <div className="flex justify-between items-center px-1">
        <h2 className="text-base font-bold text-[#111c2d]">Dispenser Medications</h2>
        <span className="text-xs text-[#737686] font-medium">{medicines.length} total active</span>
      </div>

      {/* Medicine Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {medicines.map(med => {
          const isLow = med.remainingPills < 10;
          const nextReminder = med.schedules[0] || 'N/A';

          return (
            <div
              key={med.id}
              onClick={() => onNavigate('details', med.id)}
              className={`bg-white rounded-2xl shadow-sm hover:shadow transition-all p-5 flex flex-col gap-4 border border-[#c3c6d7]/30 relative ${
                !med.enabled ? 'opacity-70 grayscale-[30%]' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold"
                  style={{ backgroundColor: med.color }}
                >
                  <span className="material-symbols-outlined text-2xl">medication</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('add-edit', med.id);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f3ff] text-[#434655] transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">edit</span>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onNavigate('details', med.id);
                    }}
                    className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#f0f3ff] text-[#434655] transition-all"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_forward_ios</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold text-[#111c2d] leading-none">{med.name}</h3>
                <p className="text-xs text-[#737686] mt-1.5">{med.category || 'Medication'}</p>
              </div>

              {/* Specs info grid */}
              <div className="grid grid-cols-2 gap-3 py-2 border-y border-[#c3c6d7]/20">
                <div>
                  <p className="text-[10px] text-[#737686] uppercase tracking-wider">Remaining</p>
                  <p className={`text-sm font-bold font-mono ${isLow ? 'text-[#ba1a1a]' : 'text-[#111c2d]'}`}>
                    {med.remainingPills} Pills
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-[#737686] uppercase tracking-wider">Dispenser</p>
                  <p className="text-sm font-bold text-[#111c2d]">Slot #{med.slot}</p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs text-[#004ac6] font-semibold">
                  <span className="material-symbols-outlined text-sm">schedule</span>
                  <span>Next: {nextReminder}</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    checked={med.enabled}
                    onChange={(e) => onToggleEnabled(med.id, e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-[#c3c6d7] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#004ac6]"></div>
                </label>
              </div>

              {/* Low stock tag */}
              {isLow && (
                <div className="absolute top-4 left-20 bg-[#ffdad6] text-[#93000a] text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                  Low stock
                </div>
              )}
            </div>
          );
        })}

        {/* Empty state "Add New" placeholder card */}
        <button
          onClick={() => onNavigate('add-edit')}
          className="border-2 border-dashed border-[#c3c6d7] hover:border-[#004ac6] bg-transparent hover:bg-[#e7eeff]/40 rounded-2xl flex flex-col items-center justify-center p-8 gap-3 group transition-all"
        >
          <div className="w-14 h-14 rounded-full bg-[#f0f3ff] group-hover:bg-[#004ac6]/10 flex items-center justify-center transition-all">
            <span className="material-symbols-outlined text-3xl text-[#004ac6] group-hover:scale-110 transition-transform">add</span>
          </div>
          <div className="text-center">
            <h4 className="text-sm font-bold text-[#111c2d]">Add New Medication</h4>
            <p className="text-xs text-[#737686] mt-0.5">Assign pill schedule to a physical slot</p>
          </div>
        </button>
      </div>

      {/* Floating Action Button (FAB) at the bottom right */}
      <button
        onClick={() => onNavigate('add-edit')}
        className="fixed right-6 bottom-24 w-14 h-14 bg-[#004ac6] text-white rounded-2xl shadow-lg flex items-center justify-center active:scale-95 hover:bg-[#2563eb] transition-all z-40 group"
      >
        <span className="material-symbols-outlined text-3xl transition-transform group-hover:rotate-90">add</span>
      </button>
    </div>
  );
}
