import React, { useEffect, useState } from 'react';
import { ApiClient, MedicineEntry } from '../services/apiClient';
import { appendLog } from '../services/apiClient';

interface AddEditMedicineViewProps {
  medicineId: string | null; // This represents the selected slot index (e.g. "1", "2", "3")
  onNavigate: (screen: string, selectedId?: string) => void;
}

export default function AddEditMedicineView({ medicineId, onNavigate }: AddEditMedicineViewProps) {
  const slotNumber = medicineId ? parseInt(medicineId) : 1;
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  // Form Fields State
  const [name, setName] = useState('');
  const [remainingPills, setRemainingPills] = useState(30);
  const [dosePerReminder, setDosePerReminder] = useState(1);
  const [lowStockThreshold, setLowStockThreshold] = useState(5);
  const [notes, setNotes] = useState('');
  const DAYS = [
    { short: 'S', value: 'Sunday' },
    { short: 'M', value: 'Monday' },
    { short: 'T', value: 'Tuesday' },
    { short: 'W', value: 'Wednesday' },
    { short: 'T', value: 'Thursday' },
    { short: 'F', value: 'Friday' },
    { short: 'S', value: 'Saturday' },
  ];

  const [selectedDays, setSelectedDays] = useState<string[]>(
    DAYS.map(d => d.value)
  );
  const [times, setTimes] = useState<string[]>(['08:00']);

  const allDaysSelected = selectedDays.length === DAYS.length;

  const serializeRepeatFrequency = (days: string[]) => {
    if (days.length === DAYS.length) return 'Daily';
    return days.join(',');
  };

  const toggleDay = (day: string) => {
    setSelectedDays(prev =>
      prev.includes(day)
        ? prev.filter(d => d !== day)
        : [...prev, day]
    );
  };

  const toggleDaily = () => {
    setSelectedDays(prev =>
      prev.length === DAYS.length ? [] : DAYS.map(d => d.value)
    );
  };

  // Fetch slot configuration to see if it is edit or create mode
  useEffect(() => {
    async function loadSlotDetail() {
      setLoading(true);
      try {
        const res = await ApiClient.getMedicines();
        if (res && res.data) {
          const match = res.data.find(m => m.slot === slotNumber);
          if (match && match.assigned) {
            setIsEditMode(true);
            setName(match.name || '');
            setRemainingPills(typeof match.remainingPills === 'number' ? match.remainingPills : 30);
            setDosePerReminder(typeof match.dosePerReminder === 'number' ? match.dosePerReminder : 1);
            setLowStockThreshold(typeof match.lowStockThreshold === 'number' ? match.lowStockThreshold : 5);
            setNotes(match.notes || '');
            if (match.repeatFrequency === 'Daily') {
              setSelectedDays(DAYS.map(d => d.value));
            } else if (typeof match.repeatFrequency === 'string' && match.repeatFrequency.length > 0) {
              setSelectedDays(match.repeatFrequency.split(',').filter(Boolean));
            } else {
              setSelectedDays(DAYS.map(d => d.value));
            }
            setTimes(match.times && match.times.length > 0 ? match.times : ['08:00']);
          } else {
            setIsEditMode(false);
            // Default new slot configuration
            setName('');
            setRemainingPills(30);
            setDosePerReminder(1);
            setLowStockThreshold(5);
            setNotes('');
            setSelectedDays(DAYS.map(d => d.value));
            setTimes(['08:00']);
          }
        }
      } catch (err) {
        console.error('Failed to load slot details:', err);
      } finally {
        setLoading(false);
      }
    }
    loadSlotDetail();
  }, [slotNumber]);

  // Times Helpers
  const handleAddTime = () => {
    setTimes(prev => [...prev, '08:00']);
  };

  const handleRemoveTime = (index: number) => {
    if (times.length <= 1) return; // Keep at least one time slot
    setTimes(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleTimeChange = (index: number, val: string) => {
    setTimes(prev => prev.map((t, idx) => (idx === index ? val : t)));
  };

  // Actions
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setSaving(true);
    const payload: Partial<MedicineEntry> = {
      name: name.trim(),
      remainingPills,
      dosePerReminder,
      lowStockThreshold,
      notes: notes.trim(),
      repeatFrequency: serializeRepeatFrequency(selectedDays),
      times: times.filter(t => !!t)
    };

    try {
      const res = await ApiClient.updateMedicine(slotNumber, payload);
      if (res && res.success) {
        const verb = isEditMode ? 'updated' : 'assigned';
        await appendLog('medicine_assign', `Slot ${slotNumber} ${verb}: ${name.trim()} — ${remainingPills} pills, ${dosePerReminder} per dose`);
        onNavigate('home');
      } else {
        alert('Could not update slot configuration.');
      }
    } catch {
      alert('Network request failed. Verify connectivity.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const confirmDelete = window.confirm(`Are you sure you want to clear cartridge Slot ${slotNumber}? This resets the cartridge configuration and marks it as unassigned.`);
    if (confirmDelete) {
      setSaving(true);
      try {
        const res = await ApiClient.deleteMedicine(slotNumber);
        if (res && res.success) {
          await appendLog('medicine_removed', `Slot ${slotNumber} cleared (medicine removed)`);
          onNavigate('home');
        } else {
          alert('Failed to clear slot.');
        }
      } catch {
        alert('Network request failed.');
      } finally {
        setSaving(false);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-full flex items-center justify-center p-6 bg-slate-50 dark:bg-slate-950 font-sans">
        <div className="flex flex-col items-center gap-3">
          <span className="material-symbols-outlined text-4xl text-teal-655 dark:text-teal-400 animate-spin">sync</span>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">Loading configuration...</p>
        </div>
      </div>
    );
  }

  const repeatOptions = [['M', 'Monday'], ['Tu', 'Tuesday'], ['W', 'Wednesday'], ['Th', 'Thursday'], ['F', 'Friday'], ['Sa', 'Saturday'], ['Su', 'Sunday']] as const;

  return (
    <div className="min-h-full flex flex-col p-6 bg-slate-50 dark:bg-slate-950 font-sans select-none animate-fade-in pb-20">
      
      {/* Header */}
      <header className="flex items-center justify-between py-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-350 active:scale-95 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-800 dark:text-white">
              {isEditMode ? 'Edit Medicine' : 'Configure Cartridge'}
            </h1>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-extrabold">Slot {slotNumber} Configuration</p>
          </div>
        </div>
      </header>

      {/* Main Form scrollable container */}
      <main className="flex-1 py-6 max-w-sm mx-auto w-full">
        <form onSubmit={handleSave} className="space-y-6">
          
          {/* General Specs Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-left">
            <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Medicine Specs</h2>

            {/* Medicine Name */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="med-name">
                Medicine Name
              </label>
              <input
                id="med-name"
                type="text"
                required
                placeholder="e.g. Metformin 500mg"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:border-teal-500 dark:focus:border-teal-400 text-slate-850 dark:text-slate-100"
              />
            </div>

            {/* Numbers Grid */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="med-qty">
                  Remaining
                </label>
                <input
                  id="med-qty"
                  type="number"
                  min="0"
                  max="500"
                  required
                  value={remainingPills}
                  onChange={e => setRemainingPills(parseInt(e.target.value) || 0)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="med-dose">
                  Dose size
                </label>
                <input
                  id="med-dose"
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={dosePerReminder}
                  onChange={e => setDosePerReminder(parseInt(e.target.value) || 1)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="med-low">
                  Low Limit
                </label>
                <input
                  id="med-low"
                  type="number"
                  min="1"
                  max="50"
                  required
                  value={lowStockThreshold}
                  onChange={e => setLowStockThreshold(parseInt(e.target.value) || 5)}
                  className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-800 dark:text-slate-100"
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="med-notes">
                Notes / Instructions
              </label>
              <textarea
                id="med-notes"
                placeholder="Instructions (e.g. Take on empty stomach)"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                className="w-full h-18 p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-medium outline-none focus:border-teal-500 dark:focus:border-teal-400 text-slate-800 dark:text-slate-200 resize-none"
              />
            </div>
          </div>

          {/* Scheduling Card */}
          <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm space-y-4 text-left">
            <h2 className="text-[10px] text-teal-655 dark:text-teal-400 font-bold uppercase tracking-wider">Reminder Schedule</h2>

            {/* Repeat Frequency */}
            <div className="space-y-3">
              <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase block">
                Repeat Frequency
              </span>

              {/* Daily */}
              <button
                type="button"
                onClick={toggleDaily}
                className={`w-full h-10 rounded-xl border text-xs font-bold transition-all ${
                  allDaysSelected
                    ? "bg-teal-600 border-teal-600 text-white"
                    : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300"
                }`}
              >
                Daily
              </button>

              {/* Days */}
              <div className="flex justify-between">
                {DAYS.map(day => {
                  const active = selectedDays.includes(day.value);

                  return (
                    <button
                      key={day.value}
                      type="button"
                      onClick={() => toggleDay(day.value)}
                      className={`w-10 h-10 rounded-full border text-xs font-bold transition-all ${
                        active
                          ? "bg-teal-600 border-teal-600 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300"
                      }`}
                    >
                      {day.short}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Reminder Times list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase">Times ({times.length})</span>
                <button
                  type="button"
                  onClick={handleAddTime}
                  className="text-xs font-bold text-teal-655 dark:text-teal-400 hover:text-teal-700 flex items-center gap-0.5"
                >
                  <span className="material-symbols-outlined text-sm font-bold">add</span>
                  <span>Add Time</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {times.map((t, idx) => (
                  <div key={idx} className="flex items-center gap-2 animate-fade-in">
                    <span className="material-symbols-outlined text-slate-400 text-base">schedule</span>
                    <input
                      type="time"
                      required
                      value={t}
                      onChange={e => handleTimeChange(idx, e.target.value)}
                      className="flex-1 h-9 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs font-mono font-bold text-slate-700 dark:text-slate-200 focus:border-teal-500"
                    />
                    <button
                      type="button"
                      disabled={times.length <= 1}
                      onClick={() => handleRemoveTime(idx)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center border ${
                        times.length <= 1
                          ? 'border-slate-100 text-slate-300 dark:border-slate-800 dark:text-slate-700 cursor-not-allowed'
                          : 'border-rose-100 text-rose-500 hover:bg-rose-50 dark:border-rose-900/30'
                      }`}
                    >
                      <span className="material-symbols-outlined text-base">close</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Form Actions Footer */}
          <div className="space-y-3 pt-2">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => onNavigate('home')}
                disabled={saving}
                className="h-11 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-655 dark:text-slate-350 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="h-11 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                ) : (
                  <span className="material-symbols-outlined text-sm">check</span>
                )}
                <span>Save Config</span>
              </button>
            </div>

            {isEditMode && (
              <button
                type="button"
                onClick={handleDelete}
                disabled={saving}
                className="w-full h-11 border border-rose-500/20 bg-rose-500/5 hover:bg-rose-500/10 text-rose-600 dark:text-rose-455 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">delete</span>
                <span>Delete Medicine</span>
              </button>
            )}
          </div>

        </form>
      </main>

    </div>
  );
}
