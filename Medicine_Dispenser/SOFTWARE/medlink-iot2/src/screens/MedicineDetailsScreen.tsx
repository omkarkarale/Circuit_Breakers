import React from 'react';
import { Medicine } from '../types';

interface MedicineDetailsViewProps {
  medicine: Medicine | null;
  onNavigate: (screen: string, selectedId?: string) => void;
  onRefill: (id: string) => void;
  onTriggerDispense: (med: Medicine) => void;
  onDelete: (id: string) => void;
}

export default function MedicineDetailsView({
  medicine,
  onNavigate,
  onRefill,
  onTriggerDispense,
  onDelete
}: MedicineDetailsViewProps) {
  if (!medicine) {
    return (
      <div className="bg-white p-6 rounded-2xl text-center border border-[#c3c6d7] space-y-4">
        <span className="material-symbols-outlined text-4xl text-[#737686]">warning</span>
        <p className="text-[#434655]">Medication details could not be found.</p>
        <button
          onClick={() => onNavigate('medicines')}
          className="text-xs font-bold text-[#004ac6] underline"
        >
          Back to Medicines
        </button>
      </div>
    );
  }

  const isLow = medicine.remainingPills < 10;
  const fillPercentage = Math.round((medicine.remainingPills / medicine.maxPills) * 100);

  return (
    <div className="space-y-6 pt-4">
      {/* Back button and screen context is handled by parent, but let's build a beautiful back option inside */}
      <div className="flex justify-between items-center mb-4">
        <button
          onClick={() => onNavigate('medicines')}
          className="flex items-center gap-1.5 text-xs text-[#004ac6] font-bold"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          <span>Back to Medicines</span>
        </button>
      </div>

      {/* Header Section: Large Icon & Title */}
      <section className="flex flex-col items-center text-center">
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-white font-bold shadow-md shadow-black/5"
          style={{ backgroundColor: medicine.color }}
        >
          <span className="material-symbols-outlined text-5xl">medication</span>
        </div>
        <h2 className="text-2xl font-bold text-[#111c2d] tracking-tight mt-4">{medicine.name}</h2>
        <p className="text-xs text-[#737686] mt-1.5 font-medium">{medicine.category || 'Medication'}</p>
      </section>

      {/* Inventory Status (Bento-inspired Card) */}
      <section className="bg-white p-5 rounded-2xl border border-[#c3c6d7]/30 shadow-sm">
        <div className="flex justify-between items-end mb-2">
          <div>
            <h3 className="text-xs font-semibold text-[#737686] uppercase tracking-wider">Inventory Status</h3>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl font-mono font-bold text-[#111c2d]">{medicine.remainingPills}</span>
              <span className="text-xs text-[#737686]">/ {medicine.maxPills} Pills remaining</span>
            </div>
          </div>
          {isLow ? (
            <span className="bg-[#ffdad6] text-[#93000a] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider animate-pulse">
              Low Stock
            </span>
          ) : (
            <span className="bg-[#7cf994]/20 text-[#007230] text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
              Optimal
            </span>
          )}
        </div>
        <div className="w-full h-3 bg-[#f0f3ff] rounded-full overflow-hidden mt-3">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              isLow ? 'bg-[#ba1a1a]' : 'bg-[#006e2d]'
            }`}
            style={{ width: `${fillPercentage}%` }}
          ></div>
        </div>
        <p className="text-xs text-[#737686] mt-3.5 flex items-center gap-1.5 font-medium">
          <span className="material-symbols-outlined text-sm text-[#004ac6]">event_repeat</span>
          <span>Estimated empty in {Math.round(medicine.remainingPills / (medicine.schedules.length || 1))} days (Friday)</span>
        </p>
      </section>

      {/* Schedules Section */}
      <section className="space-y-3">
        <h3 className="text-xs font-semibold text-[#737686] uppercase tracking-wider px-1">Daily Reminder Schedules</h3>
        <div className="flex flex-wrap gap-2">
          {medicine.schedules.map((time, index) => (
            <div
              key={index}
              className="flex items-center gap-1.5 bg-[#e7eeff] text-[#004ac6] px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#004ac6]/10 shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">alarm</span>
              <span>{time}</span>
            </div>
          ))}
        </div>
        {medicine.instructions && (
          <p className="text-xs text-[#737686] px-1 mt-2.5 italic">
            * Note: {medicine.instructions}
          </p>
        )}
      </section>

      {/* Historical Statistics Widget */}
      <section className="grid grid-cols-2 gap-3.5">
        <div className="bg-[#f0f3ff] p-4 rounded-xl border border-[#c3c6d7]/10">
          <span className="material-symbols-outlined text-[#004ac6] text-lg mb-1">history</span>
          <p className="text-[10px] text-[#737686] uppercase tracking-wider">Last Taken</p>
          <p className="text-xs font-bold text-[#111c2d] mt-1">Today, 08:05 AM</p>
        </div>
        <div className="bg-[#f0f3ff] p-4 rounded-xl border border-[#c3c6d7]/10">
          <span className="material-symbols-outlined text-[#004ac6] text-lg mb-1">local_fire_department</span>
          <p className="text-[10px] text-[#737686] uppercase tracking-wider">Streak</p>
          <p className="text-xs font-bold text-[#111c2d] mt-1">12 Days Solid</p>
        </div>
      </section>

      {/* Actions Section */}
      <section className="space-y-3.5 pt-2">
        <button
          onClick={() => onRefill(medicine.id)}
          className="w-full h-12 bg-[#004ac6] hover:bg-[#2563eb] text-white rounded-xl font-bold text-sm shadow flex items-center justify-center gap-2 transition-all active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">shopping_cart</span>
          <span>Refill Inventory (to Max)</span>
        </button>

        <button
          onClick={() => onTriggerDispense(medicine)}
          className="w-full h-12 bg-[#7cf994] text-[#007230] border border-[#007230]/20 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all hover:brightness-105 active:scale-95"
        >
          <span className="material-symbols-outlined text-lg">precision_manufacturing</span>
          <span>Run Test Dispense</span>
        </button>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onNavigate('add-edit', medicine.id)}
            className="h-12 bg-[#dee8ff] hover:bg-[#c3c6d7]/50 text-[#111c2d] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
            <span>Edit Medicine</span>
          </button>
          <button
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${medicine.name}?`)) {
                onDelete(medicine.id);
              }
            }}
            className="h-12 bg-[#ffdad6] hover:bg-red-100 text-[#ba1a1a] rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <span className="material-symbols-outlined text-lg">delete</span>
            <span>Delete Schedule</span>
          </button>
        </div>
      </section>
    </div>
  );
}
