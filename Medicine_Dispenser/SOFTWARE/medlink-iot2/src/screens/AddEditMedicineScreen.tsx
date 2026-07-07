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
  
  // Advanced schedule selector states
  const [scheduleType, setScheduleType] = useState<'Daily' | 'Alternate' | 'Interval' | 'Weekdays'>(() => {
    if (!existing) return 'Daily';
    const pat = existing.repeatPattern;
    if (pat === 'Daily') return 'Daily';
    if (pat === 'Weekdays' || pat === 'Alternate Days') return 'Alternate';
    if (pat.startsWith('Every')) return 'Interval';
    return 'Weekdays';
  });

  const [intervalDays, setIntervalDays] = useState<number>(() => {
    if (existing && existing.repeatPattern.startsWith('Every')) {
      const match = existing.repeatPattern.match(/\d+/);
      return match ? parseInt(match[0]) : 3;
    }
    return 3;
  });

  const [selectedWeekdays, setSelectedWeekdays] = useState<string[]>(() => {
    if (!existing) return [];
    const pat = existing.repeatPattern;
    if (pat === 'Daily' || pat === 'Alternate Days' || pat.startsWith('Every')) return [];
    return pat.split(', ').map(d => d.trim());
  });

  const [schedules, setSchedules] = useState<string[]>(existing?.schedules || ['08:00 AM']);
  const [newTime, setNewTime] = useState('08:00');

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

  const toggleWeekday = (day: string) => {
    if (selectedWeekdays.includes(day)) {
      setSelectedWeekdays(selectedWeekdays.filter(d => d !== day));
    } else {
      setSelectedWeekdays([...selectedWeekdays, day]);
    }
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

    // Validate slot assignment safety
    const duplicate = medicines.find(m => m.slot === slot && m.id !== existing?.id);
    if (duplicate) {
      alert(`Conflict: Dispenser slot ${slot} is already assigned to ${duplicate.name}. Please select an empty slot.`);
      return;
    }

    // Determine final repeatPattern string
    let repeatPatternStr = 'Daily';
    if (scheduleType === 'Alternate') {
      repeatPatternStr = 'Alternate Days';
    } else if (scheduleType === 'Interval') {
      repeatPatternStr = `Every ${intervalDays} Days`;
    } else if (scheduleType === 'Weekdays') {
      if (selectedWeekdays.length === 0) {
        alert('Please select at least one weekday.');
        return;
      }
      repeatPatternStr = selectedWeekdays.join(', ');
    }

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
      <section className="card-glass p-6 space-y-6">
        <div className="space-y-1">
          <h2 className="text-lg font-bold">Dispenser Configuration</h2>
          <p className="text-xs text-muted dark:text-slate-400">Configure physical cartridge slots and medicine profiles.</p>
        </div>

        <div className="space-y-4">
          {/* Medicine Name */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted dark:text-slate-400" htmlFor="med-name">Medicine Name</label>
            <input
              id="med-name"
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g. Paracetamol 500mg"
              className="input-custom"
            />
          </div>

          {/* Slot Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted dark:text-slate-400">Dispenser Slot</label>
            <div className="flex gap-2">
              {([1, 2, 3] as const).map(s => {
                const occupied = isSlotOccupied(s);
                const isActive = slot === s;
                // Read-only unless the slot is empty
                const isReadOnly = occupied && !isActive;

                return (
                  <button
                    key={s}
                    type="button"
                    disabled={isReadOnly}
                    onClick={() => setSlot(s)}
                    className={`flex-1 h-12 rounded-sm font-bold text-xs transition-all active:scale-95 flex flex-col items-center justify-center gap-0.5 ${
                      isActive
                        ? 'bg-accent text-white shadow dark:bg-[#7cf994] dark:text-slate-950'
                        : occupied
                        ? 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-600 border border-transparent cursor-not-allowed'
                        : 'bg-accent-light/35 border border-border-custom dark:border-slate-800 text-accent dark:text-[#7cf994] hover:bg-accent-light/60 cursor-pointer'
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

          {/* Medicine Type */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted dark:text-slate-400">Medicine Type</label>
            <div className="grid grid-cols-3 gap-3">
              {(['Tablet', 'Capsule', 'Softgel'] as MedicineType[]).map(t => {
                const isActive = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setType(t)}
                    className={`flex flex-col items-center justify-center p-3 rounded-sm border transition-all active:scale-95 cursor-pointer ${
                      isActive
                        ? 'bg-accent border-accent text-white font-bold shadow-sm dark:bg-[#7cf994] dark:border-[#7cf994] dark:text-slate-950'
                        : 'bg-accent-light/10 border-border-custom dark:border-slate-800 text-muted dark:text-slate-300 hover:bg-accent-light/35 dark:hover:bg-slate-700/50'
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

          {/* Color Pickers */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted dark:text-slate-400">Pill Color Code</label>
            <div className="flex items-center gap-2.5 h-12">
              {COLORS.map(c => {
                const isSelected = color === c;
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={`w-8 h-8 rounded-full border-2 transition-all cursor-pointer ${
                      isSelected 
                        ? 'border-accent dark:border-[#7cf994] scale-110 shadow-md' 
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

      {/* Pill Counters */}
      <section className="card-glass p-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted dark:text-slate-400">Pills Loaded</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setRemaining(prev => Math.max(0, prev - 5))}
                className="w-10 h-10 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-accent-light dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                -5
              </button>
              <input
                type="number"
                value={remaining}
                onChange={e => setRemaining(Math.max(0, parseInt(e.target.value) || 0))}
                className="flex-grow text-center h-10 border border-border-custom dark:border-slate-700 rounded-sm font-mono font-bold text-base bg-primary/40 dark:bg-slate-900/30 text-light dark:text-white focus:border-border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setRemaining(prev => prev + 5)}
                className="w-10 h-10 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-accent-light dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                +5
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted dark:text-slate-400">Dose Per Alarm</label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setDose(prev => Math.max(1, prev - 1))}
                className="w-10 h-10 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-accent-light dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                -
              </button>
              <input
                type="number"
                value={dose}
                onChange={e => setDose(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-grow text-center h-10 border border-border-custom dark:border-slate-700 rounded-sm font-mono font-bold text-base bg-primary/40 dark:bg-slate-900/30 text-light dark:text-white focus:border-border-accent focus:outline-none"
              />
              <button
                type="button"
                onClick={() => setDose(prev => prev + 1)}
                className="w-10 h-10 rounded-full border border-border-custom dark:border-slate-700 flex items-center justify-center text-muted dark:text-slate-300 font-bold hover:bg-accent-light dark:hover:bg-slate-800 active:scale-95 cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Advanced Schedule Selector */}
      <section className="card-glass p-6 space-y-5">
        <div className="space-y-1">
          <h2 className="text-base font-bold">Repeat Frequency</h2>
          <p className="text-xs text-muted dark:text-slate-400">Choose when the dispenser alarms should sound.</p>
        </div>

        {/* Schedule Type Selection Tabs */}
        <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-200/50 dark:bg-slate-900/50 rounded-sm border border-border-custom dark:border-slate-800">
          {[
            { key: 'Daily', label: 'Daily' },
            { key: 'Alternate', label: 'Alt Days' },
            { key: 'Interval', label: 'Interval' },
            { key: 'Weekdays', label: 'Weekdays' }
          ].map(opt => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setScheduleType(opt.key as any)}
              className={`py-1.5 text-[9px] font-bold rounded-xs text-center transition-all cursor-pointer ${
                scheduleType === opt.key
                  ? 'bg-accent text-white shadow-sm dark:bg-[#7cf994] dark:text-slate-950'
                  : 'text-muted hover:text-accent dark:hover:text-[#7cf994]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Schedule Details Panels */}
        {scheduleType === 'Interval' && (
          <div className="flex flex-col gap-2 p-3 bg-primary/45 dark:bg-slate-900/35 border border-border-custom rounded-sm">
            <label className="text-[11px] font-bold text-muted dark:text-slate-400">Alarm Interval (In Days)</label>
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-light dark:text-white">Repeat Alarm Every</span>
              <input
                type="number"
                min="2"
                max="30"
                value={intervalDays}
                onChange={e => setIntervalDays(Math.max(2, parseInt(e.target.value) || 2))}
                className="w-14 h-8 text-center border border-border-custom dark:border-slate-700 bg-primary/40 text-xs font-bold font-mono rounded-sm text-light dark:text-white focus:outline-none"
              />
              <span className="text-xs font-semibold text-light dark:text-white">Days</span>
            </div>
          </div>
        )}

        {scheduleType === 'Weekdays' && (
          <div className="p-3 bg-primary/45 dark:bg-slate-900/35 border border-border-custom rounded-sm space-y-2">
            <label className="text-[11px] font-bold text-muted dark:text-slate-400 block">Select Active Weekdays</label>
            <div className="flex flex-wrap gap-1.5">
              {WEEKDAYS.map(day => {
                const isSelected = selectedWeekdays.includes(day.value);
                return (
                  <button
                    key={day.value}
                    type="button"
                    onClick={() => toggleWeekday(day.value)}
                    className={`px-3 py-1.5 rounded-sm text-[10px] font-bold border transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-accent border-accent text-white dark:bg-[#7cf994] dark:border-[#7cf994] dark:text-slate-950'
                        : 'bg-primary border-border-custom text-muted hover:bg-accent-light/50 dark:border-slate-800'
                    }`}
                  >
                    {day.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Reminder Times Chips */}
      <section className="card-glass p-6 space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold">Reminder Times</h2>
          <p className="text-xs text-muted dark:text-slate-400">Manage daily alarm triggers for this slot.</p>
        </div>

        <div className="flex gap-2">
          <input
            type="time"
            value={newTime}
            onChange={e => setNewTime(e.target.value)}
            className="flex-grow h-11 px-3 rounded-sm border border-border-custom dark:border-slate-700 bg-primary/45 dark:bg-slate-900/35 text-xs text-light dark:text-white focus:border-border-accent outline-none"
          />
          <button
            type="button"
            onClick={handleAddTime}
            className="btn-primary rounded-sm text-xs font-bold px-4 h-11 flex items-center justify-center cursor-pointer shrink-0"
          >
            Add Time
          </button>
        </div>

        {/* Removable Chips list */}
        <div className="flex flex-wrap gap-2 pt-1">
          {schedules.map((time, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1.5 bg-accent-light dark:bg-slate-800 text-accent dark:text-[#7cf994] px-3.5 py-1.5 rounded-full text-xs font-bold border border-accent/15"
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
