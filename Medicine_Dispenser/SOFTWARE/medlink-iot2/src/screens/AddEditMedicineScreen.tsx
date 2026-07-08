import React, { useState } from 'react';
import { Medicine, MedicineType } from '../types';

interface AddEditMedicineViewProps {
  medicineId: string | null;
  medicines: Medicine[];
  onSave: (medicine: Omit<Medicine, 'id'> & { id?: string }) => void;
  onDelete: (id: string) => void;
  onNavigate: (screen: string, selectedId?: string) => void;
}

const COLORS = [
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#fbbf24', // Yellow
  '#10b981', // Green
  '#8b5cf6', // Purple
];

const WEEKDAYS = [
  { label: 'Mon', value: 'Monday' },
  { label: 'Tue', value: 'Tuesday' },
  { label: 'Wed', value: 'Wednesday' },
  { label: 'Thu', value: 'Thursday' },
  { label: 'Fri', value: 'Friday' },
  { label: 'Sat', value: 'Saturday' },
  { label: 'Sun', value: 'Sunday' }
];

export default function AddEditMedicineView({
  medicineId,
  medicines,
  onSave,
  onDelete,
  onNavigate
}: AddEditMedicineViewProps) {
  
  // Resolve preselected slot and existing medicine
  let initialSlot: 1 | 2 | 3 = 1;
  let existing: Medicine | undefined = undefined;

  if (medicineId && medicineId.startsWith('slot-')) {
    const sNum = parseInt(medicineId.split('-')[1]);
    initialSlot = (sNum === 1 || sNum === 2 || sNum === 3) ? sNum : 1;
    existing = medicines.find(m => m.slot === initialSlot);
  } else {
    existing = medicines.find(m => m.id === medicineId);
    if (existing) {
      initialSlot = existing.slot;
    }
  }

  // Form states
  const [name, setName] = useState(existing?.name || '');
  const [type, setType] = useState<MedicineType>(existing?.type || 'Tablet');
  const [color, setColor] = useState(existing?.color || COLORS[0]);
  const [slot, setSlot] = useState<1 | 2 | 3>(initialSlot);
  const [remaining, setRemaining] = useState(existing?.remainingPills || 30);
  const [maxPills] = useState(existing?.maxPills || 30);
  const [dose, setDose] = useState(existing?.dosePerReminder || 1);

  // Weekdays multiselect state
  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(() => {
    if (!existing) return WEEKDAYS.map(d => d.value); // default daily
    const pat = existing.repeatPattern;
    if (pat === 'Daily') return WEEKDAYS.map(d => d.value);
    return pat.split(', ').map(d => d.trim()).filter(d => WEEKDAYS.some(w => w.value === d));
  });

  const [schedules, setSchedules] = useState<string[]>(existing?.schedules || ['08:00 AM']);
  const [newTime, setNewTime] = useState('08:00');

  const isDaily = selectedWeekdays.length === 7;

  const handleToggleDaily = () => {
    if (isDaily) {
      setSelectedWeekdays([]);
    } else {
      setSelectedWeekdays(WEEKDAYS.map(d => d.value));
    }
  };

  const toggleWeekday = (day: string) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day]);
    }
  };

  // Check if slot X is currently assigned to ANOTHER medicine
  const isSlotOccupied = (sVal: 1 | 2 | 3) => {
    return medicines.some(m => m.slot === sVal && m.id !== existing?.id);
  };

  const handleAddTime = () => {
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
    if (selectedWeekdays.length === 0) {
      alert('Please select at least one weekday.');
      return;
    }

    // Validate slot assignment safety
    const duplicate = medicines.find(m => m.slot === slot && m.id !== existing?.id);
    if (duplicate) {
      alert(`Conflict: Dispenser slot ${slot} is already assigned to ${duplicate.name}. Please select an empty slot.`);
      return;
    }

    // Determine final repeatPattern string
    const repeatPatternStr = selectedWeekdays.length === 7 ? 'Daily' : selectedWeekdays.join(', ');

    onSave({
      id: existing?.id,
      name,
      type,
      color,
      slot,
      remainingPills: remaining,
      maxPills: Math.max(remaining, maxPills),
      dosePerReminder: dose,
      repeatPattern: repeatPatternStr as any,
      schedules,
      enabled: existing ? existing.enabled : true,
      category: type === 'Tablet' ? 'Tablet Medication' : type === 'Capsule' ? 'Capsule Medication' : 'Softgel Medication',
      instructions: existing?.instructions || 'Take with water.'
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 text-light dark:text-white">
      {/* Configuration Card */}
      <section className="card-glass p-5 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-bold">Dispenser Configuration</h2>
          <p className="text-[10px] text-muted dark:text-slate-400">Configure physical cartridge slots and medicine profiles.</p>
        </div>

        <div className="space-y-4">
          {/* Medicine Name */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted dark:text-slate-455" htmlFor="med-name">Medicine Name</label>
            <input
              id="med-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              className="input-custom text-xs"
            />
          </div>

          {/* Slot Selection */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted dark:text-slate-455">Dispenser Slot</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map(s => {
                const occupied = isSlotOccupied(s);
                const isActive = slot === s;
                const isReadOnly = occupied && !isActive;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSlot(s)}
                    className={`flex-1 h-12 rounded-sm font-bold text-xs transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                      isActive
                        ? 'bg-accent text-white shadow dark:bg-[#a78bfa] dark:text-slate-950'
                        : occupied
                        ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border border-transparent cursor-not-allowed'
                        : 'bg-accent-light/35 border border-border-custom dark:border-slate-800 text-accent dark:text-[#a78bfa] hover:bg-accent-light/60 cursor-pointer'
                    }`}
                  >
                    <span>Slot {s}</span>
                    <span className="text-[8px] font-normal font-mono opacity-80">
                      {isActive ? 'Current' : occupied ? 'Occupied' : 'Empty'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>


          {/* Color Pickers */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted dark:text-slate-455">Pill Color Code</label>
            <div className="flex items-center gap-2 h-10">
              {COLORS.map(c => {
                const isSelected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-7 h-7 rounded-full border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-accent dark:border-[#a78bfa] scale-110 shadow-md' 
                        : 'border-transparent'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Pill Counters — Equal Width Cards & Centered Values */}
      <section className="grid grid-cols-2 gap-4">
        <div className="card-glass p-4 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-muted dark:text-slate-400 mb-2">Pills Loaded</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setRemaining(prev => Math.max(0, prev - 5))}
              className="w-8 h-8 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              -
            </button>
            <span className="text-lg font-mono font-bold w-12 text-center text-light dark:text-white">{remaining}</span>
            <button
              type="button"
              onClick={() => setRemaining(prev => prev + 5)}
              className="w-8 h-8 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        <div className="card-glass p-4 flex flex-col items-center justify-center text-center">
          <span className="text-xs font-bold text-muted dark:text-slate-400 mb-2">Dose per Alarm</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDose(prev => Math.max(1, prev - 1))}
              className="w-8 h-8 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              -
            </button>
            <span className="text-lg font-mono font-bold w-12 text-center text-light dark:text-white">{dose}</span>
            <button
              type="button"
              onClick={() => setDose(prev => prev + 1)}
              className="w-8 h-8 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              +
            </button>
          </div>
        </div>
      </section>

      {/* Repeat Weekdays Grid Selector */}
      <section className="card-glass p-5 space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-base font-bold">Repeat Frequency</h2>
            <p className="text-[10px] text-muted dark:text-slate-400 mt-0.5">Determine scheduled active days.</p>
          </div>
          <button
            type="button"
            onClick={handleToggleDaily}
            className={`px-3 py-1 text-[10px] font-bold rounded-sm border uppercase tracking-wider transition-all cursor-pointer ${
              isDaily
                ? 'bg-accent border-accent text-white dark:bg-[#a78bfa] dark:border-[#a78bfa] dark:text-slate-950'
                : 'bg-primary/20 border-border-custom dark:border-slate-800 text-muted dark:text-slate-300'
            }`}
          >
            Daily
          </button>
        </div>

        {/* Days of week checkbox grid */}
        <div className="grid grid-cols-4 gap-2">
          {WEEKDAYS.map(day => {
            const isSelected = selectedWeekdays.includes(day.value);
            return (
              <button
                key={day.value}
                type="button"
                onClick={() => toggleWeekday(day.value)}
                className={`py-2 rounded-sm text-[10px] font-bold border transition-all cursor-pointer text-center ${
                  isSelected
                    ? 'bg-accent border-accent text-white dark:bg-[#a78bfa] dark:border-[#a78bfa] dark:text-slate-950'
                    : 'bg-primary/20 border-border-custom dark:border-slate-800 text-muted dark:text-slate-350 hover:bg-accent-light/45'
                }`}
              >
                {day.label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Reminder Times Chips */}
      <section className="card-glass p-5 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold">Reminder Times</h2>
          <p className="text-[10px] text-muted dark:text-slate-400">Manage daily alarm triggers for this slot.</p>
        </div>

        <div className="flex gap-2">
          <input
            type="time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            className="flex-grow h-10 px-3 rounded-sm border border-border-custom dark:border-slate-700 bg-primary/45 dark:bg-slate-900/35 text-xs text-light dark:text-white focus:border-border-accent outline-none"
          />
          <button
            type="button"
            onClick={handleAddTime}
            className="btn-primary rounded-sm text-xs font-bold px-4 h-10 flex items-center justify-center cursor-pointer shrink-0"
          >
            Add Time
          </button>
        </div>

        {/* Removable Chips list */}
        <div className="flex flex-wrap gap-2 pt-1">
          {schedules.map((time, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 bg-accent-light dark:bg-slate-800 text-accent dark:text-[#a78bfa] px-3.5 py-1.5 rounded-full text-xs font-bold border border-accent/15 animate-fade-in"
            >
              <span>{time}</span>
              <button
                type="button"
                onClick={() => handleRemoveTime(index)}
                className="w-4 h-4 rounded-full flex items-center justify-center hover:bg-accent/25 dark:hover:bg-slate-700 font-bold shrink-0 cursor-pointer text-sm"
              >
                ×
              </button>
            </span>
          ))}
          {schedules.length === 0 && (
            <p className="text-xs italic text-muted">No reminder times set yet.</p>
          )}
        </div>
      </section>

      {/* Bottom Actions */}
      <footer className="flex flex-col gap-3.5 pt-2">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => onNavigate('medicines')}
            className="flex-1 h-12 border border-border-custom dark:border-slate-800 hover:bg-accent-light dark:hover:bg-slate-800 text-muted dark:text-slate-300 font-bold text-sm rounded-sm transition-all cursor-pointer flex items-center justify-center"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="flex-1 h-12 bg-accent hover:bg-accent-hover text-white font-bold text-sm rounded-sm shadow transition-all active:scale-95 cursor-pointer dark:bg-accent dark:hover:bg-accent-hover"
          >
            Save Medicine
          </button>
        </div>

        {existing && (
          <button
            type="button"
            onClick={() => {
              if (confirm(`Are you sure you want to delete ${existing.name} configuration?`)) {
                onDelete(existing.id);
              }
            }}
            className="w-full h-12 bg-error-bg dark:bg-red-950/20 text-error-custom dark:text-red-400 border border-error-custom/25 hover:bg-error-custom hover:text-white dark:hover:bg-red-955/40 rounded-sm font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer"
          >
            <span className="material-symbols-outlined text-sm font-bold">delete</span>
            <span>Remove Configuration</span>
          </button>
        )}
      </footer>
    </form>
  );
}
