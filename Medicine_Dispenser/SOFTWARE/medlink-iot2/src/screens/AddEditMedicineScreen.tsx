import React, { useState } from 'react';
import { Medicine, MedicineType } from '../types';

interface AddEditMedicineViewProps {
  medicineId: string | null;
  medicines: Medicine[];
  onSave: (medicine: Omit<Medicine, 'id'> & { id?: string }) => void;
  onNavigate: (screen: string, selectedId?: string) => void;
}

const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#fbbf24', // Yellow
  '#10b981', // Green
  '#8b5cf6', // Purple
];

export default function AddEditMedicineView({
  medicineId,
  medicines,
  onSave,
  onNavigate
}: AddEditMedicineViewProps) {
  const existing = medicines.find(m => m.id === medicineId);

  // Form states
  const [name, setName] = useState(existing?.name || '');
  const [type, setType] = useState<MedicineType>(existing?.type || 'Tablet');
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [slot, setSlot] = useState<1 | 2 | 3>(existing?.slot || 1);
  const [remaining, setRemaining] = useState(existing?.remainingPills || 30);
  const [maxPills] = useState(existing?.maxPills || 30);
  const [dose, setDose] = useState(existing?.dosePerReminder || 1);
  const [repeat, setRepeat] = useState<'Daily' | 'Weekdays' | 'Custom'>(existing?.repeatPattern || 'Daily');
  const [schedules, setSchedules] = useState<string[]>(existing?.schedules || ['08:00 AM', '09:00 PM']);
  const [newTime, setNewTime] = useState('08:00');

  // Helper to append a time
  const handleAddTime = () => {
    // Convert 24h to 12h representation for visual matching
    const [hStr, mStr] = newTime.split(':');
    const h = parseInt(hStr);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    const formatted = `${String(hour12).padStart(2, '0')}:${mStr} ${ampm}`;

    if (!schedules.includes(formatted)) {
      setSchedules([...schedules, formatted]);
    }
  };

  const handleRemoveTime = (index: number) => {
    setSchedules(schedules.filter((_, i) => i !== index));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('Please enter a medicine name.');
      return;
    }
    if (schedules.length === 0) {
      alert('Please add at least one reminder time.');
      return;
    }

    onSave({
      id: existing?.id, // include if editing
      name,
      type,
      color,
      slot,
      remainingPills: remaining,
      maxPills: Math.max(remaining, maxPills), // Dynamic resizing
      dosePerReminder: dose,
      repeatPattern: repeat,
      schedules,
      enabled: existing ? existing.enabled : true,
      category: type === 'Tablet' ? 'Tablet Medication' : type === 'Capsule' ? 'Capsule Medication' : 'Softgel Medication',
      instructions: existing?.instructions || 'Take with water.'
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      {/* Top Banner Area */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#c3c6d7]/30 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-[#111c2d]">Medicine Details</h2>
          <p className="text-xs text-[#737686]">Identify and configure the medication for the smart dispenser.</p>
        </div>

        <div className="space-y-4">
          {/* Name Field */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#737686]" htmlFor="med-name">Medicine Name</label>
            <input
              id="med-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Lipitor 20mg"
              className="w-full h-12 px-4 rounded-xl border border-[#737686]/40 focus:border-[#004ac6] focus:ring-2 focus:ring-[#004ac6]/15 outline-none transition-all text-sm text-[#111c2d] bg-white"
            />
          </div>

          {/* Type Selector */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#737686]">Medicine Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Tablet', 'Capsule', 'Softgel'] as MedicineType[]).map(t => {
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all active:scale-95 ${
                      isActive
                        ? 'bg-[#7cf994] border-[#62df7d] text-[#007230] font-bold shadow-sm'
                        : 'bg-[#f0f3ff] border-[#c3c6d7]/50 text-[#737686]'
                    }`}
                  >
                    <span className="material-symbols-outlined text-lg">
                      {t === 'Tablet' ? 'tablet' : t === 'Capsule' ? 'capsule' : 'vaccines'}
                    </span>
                    <span className="text-[10px] uppercase tracking-wider font-semibold mt-1">{t}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Picker & Dispenser Slot */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#737686]">Pill Color</label>
              <div className="flex items-center gap-1.5 h-12">
                {COLORS.map(c => {
                  const isSelected = color === c;
                  return (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-all ${
                        isSelected 
                          ? 'border-[#004ac6] scale-110 shadow' 
                          : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#737686]">Dispenser Slot</label>
              <div className="flex gap-2 h-12">
                {([1, 2, 3] as const).map(s => {
                  const isActive = slot === s;
                  return (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSlot(s)}
                      className={`flex-1 rounded-xl font-bold text-xs transition-all active:scale-95 ${
                        isActive
                          ? 'bg-[#004ac6] text-white shadow'
                          : 'bg-[#f0f3ff] border border-[#c3c6d7]/40 text-[#737686]'
                      }`}
                    >
                      {s}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section: Inventory & Dose */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#c3c6d7]/30">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#737686]">Pills Remaining</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRemaining(prev => Math.max(0, prev - 5))}
                className="w-10 h-10 rounded-full border border-[#c3c6d7] flex items-center justify-center text-[#737686] font-bold active:bg-gray-100"
              >
                -5
              </button>
              <input
                type="number"
                value={remaining}
                onChange={e => setRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-1 text-center h-10 border border-[#c3c6d7] rounded-xl font-mono font-bold text-base bg-white"
              />
              <button
                type="button"
                onClick={() => setRemaining(prev => prev + 5)}
                className="w-10 h-10 rounded-full border border-[#c3c6d7] flex items-center justify-center text-[#737686] font-bold active:bg-gray-100"
              >
                +5
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#737686]">Dose Per Reminder</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDose(prev => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-full border border-[#c3c6d7] flex items-center justify-center text-[#737686] font-bold active:bg-gray-100"
              >
                -
              </button>
              <input
                type="number"
                value={dose}
                onChange={e => setDose(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 text-center h-10 border border-[#c3c6d7] rounded-xl font-mono font-bold text-base bg-white"
              />
              <button
                type="button"
                onClick={() => setDose(prev => prev + 1)}
                className="w-10 h-10 rounded-full border border-[#c3c6d7] flex items-center justify-center text-[#737686] font-bold active:bg-gray-100"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section: Schedule */}
      <section className="bg-white p-6 rounded-2xl shadow-sm border border-[#c3c6d7]/30 space-y-6">
        <div className="flex justify-between items-center">
          <div className="space-y-1">
            <h2 className="text-base font-bold text-[#111c2d]">Medication Schedule</h2>
            <p className="text-xs text-[#737686]">Set the times and frequency.</p>
          </div>
          <span className="material-symbols-outlined text-[#004ac6] fill-icon text-2xl">calendar_month</span>
        </div>

        {/* Frequency Selector */}
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-bold text-[#737686]">Repeat Pattern</label>
          <div className="flex gap-2">
            {(['Daily', 'Weekdays', 'Custom'] as const).map(pattern => {
              const isActive = repeat === pattern;
              return (
                <button
                  key={pattern}
                  type="button"
                  onClick={() => setRepeat(pattern)}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold shadow-sm border transition-all ${
                    isActive
                      ? 'bg-[#004ac6] text-white border-[#004ac6]'
                      : 'bg-[#f0f3ff] text-[#737686] border-[#c3c6d7]/50 hover:bg-[#dee8ff]'
                  }`}
                >
                  {pattern}
                </button>
              );
            })}
          </div>
        </div>

        {/* Time Picker */}
        <div className="space-y-4">
          <label className="text-xs font-bold text-[#737686] block">Times of Day</label>
          
          <div className="flex gap-2">
            <input
              type="time"
              value={newTime}
              onChange={e => setNewTime(e.target.value)}
              className="flex-1 h-12 px-4 rounded-xl border border-[#737686]/40 focus:border-[#004ac6] outline-none text-sm text-[#111c2d]"
            />
            <button
              type="button"
              onClick={handleAddTime}
              className="bg-[#004ac6] text-white px-5 rounded-xl text-xs font-bold hover:bg-[#2563eb]"
            >
              Add Time
            </button>
          </div>

          <div className="space-y-2">
            {schedules.map((time, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-[#f0f3ff] rounded-xl border border-[#c3c6d7]/30"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#004ac6] text-sm">alarm</span>
                  <span className="text-sm font-semibold font-mono text-[#111c2d]">{time}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleRemoveTime(index)}
                  className="text-xs text-[#ba1a1a] font-bold hover:underline"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* IoT Sync Active Card */}
      <div className="bg-[#2563eb] p-5 rounded-2xl text-white relative overflow-hidden shadow-md">
        <div className="relative z-10 flex items-center gap-3.5">
          <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-full flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-white">smart_toy</span>
          </div>
          <div>
            <h4 className="text-sm font-bold leading-none">IoT Sync Active</h4>
            <p className="text-xs text-white/80 mt-1">Changes are automatically pushed to Dispenser hub instantly.</p>
          </div>
        </div>
      </div>

      {/* Bottom Buttons */}
      <footer className="flex gap-3">
        <button
          type="button"
          onClick={() => onNavigate(medicineId ? 'details' : 'medicines', medicineId || undefined)}
          className="flex-1 h-12 bg-[#dee8ff] text-[#434655] font-bold text-sm rounded-xl transition-all"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 h-12 bg-[#004ac6] hover:bg-[#2563eb] text-white font-bold text-sm rounded-xl shadow transition-all active:scale-95"
        >
          Save Medicine
        </button>
      </footer>
    </form>
  );
}
