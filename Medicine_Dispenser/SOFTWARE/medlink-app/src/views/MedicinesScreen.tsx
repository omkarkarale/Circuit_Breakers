import React, { useEffect, useState, useCallback } from 'react';
import { ApiClient, MedicineEntry, appendLog } from '../services/apiClient';

interface MedicinesViewProps {
  onNavigate: (screen: string, selectedId?: string) => void;
}

export default function MedicinesView({ onNavigate }: MedicinesViewProps) {
  const [slots, setSlots] = useState<MedicineEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // States for custom refill modal
  const [showRefillModal, setShowRefillModal] = useState(false);
  const [refillSlot, setRefillSlot] = useState<number | null>(null);
  const [refillQuantity, setRefillQuantity] = useState('30');
  const [refilling, setRefilling] = useState(false);

  const loadSlots = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getMedicines();
      if (res && res.data) {
        // Real device always returns 3 slots, make sure they are ordered by slot index
        const sorted = [...res.data].sort((a, b) => a.slot - b.slot);
        setSlots(sorted);
      }
    } catch {
      setError('Could not retrieve slot configurations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSlots();
  }, [loadSlots]);

  const handleOpenRefill = (slot: number) => {
    setRefillSlot(slot);
    setRefillQuantity('30');
    setShowRefillModal(true);
  };

  const handleRefillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (refillSlot === null) return;
    const qty = parseInt(refillQuantity);
    if (isNaN(qty) || qty <= 0) return;

    setRefilling(true);
    try {
      const res = await ApiClient.refillMedicine(refillSlot, qty);
      if (res && res.success) {
        await appendLog('refill', `Slot ${refillSlot} refilled with ${qty} pill${qty !== 1 ? 's' : ''}`);
        setShowRefillModal(false);
        const fresh = await ApiClient.getMedicines();
        if (fresh && fresh.data) {
          setSlots([...fresh.data].sort((a, b) => a.slot - b.slot));
        }
      }
    } catch {
      alert('Failed to refill slot.');
    } finally {
      setRefilling(false);
      setRefillSlot(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-4xl text-teal-650 dark:text-teal-400 animate-spin">sync</span>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading slot data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6">
        <span className="material-symbols-outlined text-4xl text-rose-500 mb-3">error</span>
        <p className="text-sm font-bold text-slate-800 dark:text-white mb-4">{error}</p>
        <button
          type="button"
          onClick={loadSlots}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-sm mx-auto animate-fade-in pb-16 font-sans">
      
      {/* Title Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">Medicine Slots</h1>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mt-0.5">Physical Cartridges</p>
      </div>

      {/* Cartridge Cards */}
      <div className="space-y-5">
        {slots.map((slot) => {
          if (!slot.assigned) {
            return (
              <div
                key={slot.slot}
                className="relative rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/40 dark:bg-slate-900/30 p-6 flex flex-col items-center justify-center text-center min-h-[160px] hover:border-teal-500/50 hover:bg-teal-50/5 dark:hover:bg-teal-950/5 transition-all duration-200"
              >
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 flex items-center justify-center mb-3">
                  <span className="material-symbols-outlined text-lg">medical_services</span>
                </div>
                <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Slot {slot.slot} Unassigned</h3>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 max-w-[200px] mt-1 leading-relaxed">No medicine loaded in this cartridge compartment.</p>
                <button
                  type="button"
                  onClick={() => onNavigate('add-edit', String(slot.slot))}
                  className="mt-4 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-teal-600 dark:text-teal-400 hover:border-teal-500 hover:text-teal-700 hover:bg-slate-50 dark:hover:bg-slate-850 text-[11px] font-bold rounded-xl active:scale-[0.98] transition-all cursor-pointer shadow-sm"
                >
                  + Assign Medicine
                </button>
              </div>
            );
          }

          // Assigned Slot
          const isLow = slot.remainingPills <= slot.lowStockThreshold;

          return (
            <div
              key={slot.slot}
              className="rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-5 shadow-sm space-y-4 hover:shadow-md transition-all duration-200"
            >
              {/* Header Info */}
              <div className="flex justify-between items-start gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] bg-teal-500/10 text-teal-600 dark:text-teal-400 font-extrabold px-1.5 py-0.5 rounded-md font-mono">
                      SLOT {slot.slot}
                    </span>
                    {isLow && <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider text-amber-700 bg-amber-50 dark:bg-amber-950/40 dark:text-amber-400">Low</span>}
                  </div>
                  <h2 className="text-base font-bold text-slate-800 dark:text-white mt-1.5">{slot.name}</h2>
                </div>

                <div className="text-right shrink-0">
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Remaining</p>
                  <p className={`text-lg font-bold font-mono tracking-tight mt-0.5 ${slot.remainingPills <= slot.lowStockThreshold ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {slot.remainingPills}
                  </p>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold mt-2">Dose per take</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 font-mono mt-0.5">{slot.dosePerReminder} pill{slot.dosePerReminder > 1 ? 's' : ''}</p>
                </div>
              </div>

              {/* Sub Details Grid */}
              <div className="grid grid-cols-2 gap-3.5 bg-slate-50 dark:bg-slate-900 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800 text-left">
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Today's Left Doses</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 font-mono">
                    {slot.todayRemainingDoses !== undefined ? slot.todayRemainingDoses : 'N/A'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold">Schedule Times</p>
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5 font-mono leading-relaxed">
                    {slot.times && slot.times.length > 0 ? slot.times.join(', ') : 'None'}
                  </p>
                </div>
              </div>

              {/* Action Buttons Row */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                {/* 1. Edit */}
                <button
                  type="button"
                  onClick={() => onNavigate('add-edit', String(slot.slot))}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">edit</span>
                  <span>Edit</span>
                </button>

                {/* 2. Refill */}
                <button
                  type="button"
                  onClick={() => handleOpenRefill(slot.slot)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all hover:bg-slate-50 dark:hover:bg-slate-800/50 flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <span className="material-symbols-outlined text-base">input</span>
                  <span>Refill</span>
                </button>

              </div>

            </div>
          );
        })}
      </div>

      {/* REFILL POPUP MODAL DIALOG */}
      {showRefillModal && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-sm z-50 flex items-center justify-center p-6 animate-fade-in">
          <form
            onSubmit={handleRefillSubmit}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 w-full max-w-xs shadow-2xl space-y-4"
          >
            <h3 className="text-sm font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <span className="material-symbols-outlined text-teal-600 dark:text-teal-400">input</span>
              <span>Refill Slot {refillSlot}</span>
            </h3>

            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase" htmlFor="refill-qty">
                Pill Quantity
              </label>
              <input
                id="refill-qty"
                type="number"
                min="1"
                max="100"
                required
                value={refillQuantity}
                onChange={e => setRefillQuantity(e.target.value)}
                className="w-full h-10 px-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs outline-none focus:border-teal-500 dark:focus:border-teal-400 font-mono"
              />
              <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-relaxed">
                Enter the number of pills you are physically adding to the cartridge slot.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowRefillModal(false);
                  setRefillSlot(null);
                }}
                disabled={refilling}
                className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-300 font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={refilling}
                className="h-10 bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white font-bold text-xs rounded-xl active:scale-[0.98] transition-all cursor-pointer flex items-center justify-center gap-1"
              >
                {refilling ? (
                  <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                ) : (
                  'Confirm'
                )}
              </button>
            </div>
          </form>
        </div>
      )}

    </div>
  );
}
