import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient, DiagnosticItem } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ComponentEntry {
  key: string;
  label: string;
  icon: string;
  item: DiagnosticItem & { testing?: boolean };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const LABEL_MAP: Record<string, { label: string; icon: string }> = {
  wifi:     { label: 'Wi-Fi Module',      icon: 'wifi' },
  rtc:      { label: 'RTC Clock',         icon: 'schedule' },
  stepper1: { label: 'Slot 1 Motor',      icon: 'settings_motion_mode' },
  stepper2: { label: 'Slot 2 Motor',      icon: 'settings_motion_mode' },
  stepper3: { label: 'Slot 3 Motor',      icon: 'settings_motion_mode' },
  ir:       { label: 'IR Drop Sensor',    icon: 'sensors' },
  speaker:  { label: 'Audio Buzzer',      icon: 'volume_up' },
  storage:  { label: 'LittleFS Storage',  icon: 'storage' },
  memory:   { label: 'System Memory',     icon: 'memory' },
  firmware: { label: 'Firmware',          icon: 'deployed_code' },
};

// Per-motor accent config
const MOTOR_CONFIG: Record<string, { slot: number; accent: string; accentBg: string; accentDark: string }> = {
  stepper1: { slot: 1, accent: 'text-teal-600',   accentBg: 'bg-teal-50   dark:bg-teal-900/25',   accentDark: 'dark:text-teal-400'   },
  stepper2: { slot: 2, accent: 'text-violet-600', accentBg: 'bg-violet-50 dark:bg-violet-900/25', accentDark: 'dark:text-violet-400' },
  stepper3: { slot: 3, accent: 'text-amber-600',  accentBg: 'bg-amber-50  dark:bg-amber-900/25',  accentDark: 'dark:text-amber-400'  },
};

function getLabelInfo(key: string) {
  return LABEL_MAP[key] ?? { label: key.charAt(0).toUpperCase() + key.slice(1), icon: 'developer_board' };
}

function formatRelative(unixSec: number | null | undefined): string {
  if (!unixSec) return 'Never';
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ─── Status Chip ──────────────────────────────────────────────────────────────
function StatusChip({ status, testing }: { status: string; testing?: boolean }) {
  if (testing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30">
        <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>
        Testing
      </span>
    );
  }
  if (status === 'fail') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30">
      <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
      FAIL
    </span>
  );
  return null;
}

// ─── Motor Card (Stepper Motors only) ────────────────────────────────────────
function MotorCard({
  entry,
  onTest,
}: {
  entry: ComponentEntry;
  onTest: (key: string) => void;
}) {
  const { key, item } = entry;
  const cfg = MOTOR_CONFIG[key];
  const isFail = item.status === 'fail';
  const isTesting = !!item.testing;

  return (
    <div className={`rounded-2xl border p-4 shadow-sm transition-all duration-200 ${
      isFail
        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`}>
      {/* Slot badge + title row */}
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-3">
          {/* Slot number pill */}
          <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 text-xl font-black ${
            isFail
              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
              : `${cfg.accentBg} ${cfg.accent} ${cfg.accentDark}`
          }`}>
            {cfg.slot}
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">Slot {cfg.slot} Motor</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">Drives pill cartridge #{cfg.slot}</p>
          </div>
        </div>
        {(isFail || isTesting) && <StatusChip status={item.status} testing={isTesting} />}
      </div>

      {/* Status line */}
      <div className="flex items-center gap-2 mb-3">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
          isTesting  ? 'bg-blue-500 animate-pulse' :
          isFail     ? 'bg-rose-500' :
          item.status === 'ok' ? 'bg-emerald-500' : 'bg-slate-400'
        }`} />
        <p className="text-[9px] font-mono text-slate-400 dark:text-slate-500">
          Checked: {formatRelative(item.lastChecked)}
        </p>
      </div>

      {/* Detail */}
      {item.detail && (
        <p className={`text-[10px] font-medium px-2.5 py-2 rounded-lg leading-relaxed mb-3 ${
          isFail
            ? 'bg-rose-100/60 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
        }`}>
          {item.detail}
        </p>
      )}

      {/* Test button */}
      <button
        type="button"
        onClick={() => onTest(key)}
        disabled={isTesting}
        className={`w-full h-8 text-[10px] font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 border ${
          isTesting
            ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed bg-transparent'
            : isFail
              ? 'border-rose-300 dark:border-rose-800/50 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/20'
              : `border-slate-200 dark:border-slate-800 ${cfg.accent} ${cfg.accentDark} hover:${cfg.accentBg} hover:border-${cfg.accent.split('-')[1]}-300`
        }`}
      >
        {isTesting ? (
          <><span className="material-symbols-outlined text-sm animate-spin">sync</span><span>Testing motor...</span></>
        ) : (
          <><span className="material-symbols-outlined text-sm">play_circle</span><span>Test Motor</span></>
        )}
      </button>
    </div>
  );
}

// ─── Single Component Card ─────────────────────────────────────────────────────
function ComponentCard({
  entry,
  onTest,
}: {
  entry: ComponentEntry;
  onTest: (key: string) => void;
}) {
  const { key, label, icon, item } = entry;
  const isFail = item.status === 'fail';
  const isTesting = !!item.testing;

  return (
    <div className={`rounded-2xl border p-4 space-y-3 shadow-sm transition-all duration-200 ${
      isFail
        ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
    }`}>
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            isFail
              ? 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400'
              : 'bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400'
          }`}>
            <span className="material-symbols-outlined text-lg">{icon}</span>
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-800 dark:text-white leading-tight">{label}</p>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5 font-mono">
              Checked: {formatRelative(item.lastChecked)}
            </p>
          </div>
        </div>
        {(isFail || isTesting) && <StatusChip status={item.status} testing={isTesting} />}
      </div>

      {/* Detail string */}
      {item.detail && (
        <p className={`text-[10px] font-medium px-2.5 py-2 rounded-lg leading-relaxed ${
          isFail
            ? 'bg-rose-100/60 dark:bg-rose-900/20 text-rose-700 dark:text-rose-300'
            : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400'
        }`}>
          {item.detail}
        </p>
      )}

      {/* Test button */}
      <button
        type="button"
        onClick={() => onTest(key)}
        disabled={isTesting}
        className={`w-full h-8 text-[10px] font-bold rounded-xl transition-all active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1 border ${
          isTesting
            ? 'border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed bg-transparent'
            : 'border-slate-200 dark:border-slate-800 text-teal-600 dark:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:border-teal-300 dark:hover:border-teal-800'
        }`}
      >
        {isTesting ? (
          <>
            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
            <span>Testing...</span>
          </>
        ) : (
          <>
            <span className="material-symbols-outlined text-sm">play_circle</span>
            <span>Test Component</span>
          </>
        )}
      </button>
    </div>
  );
}

// ─── Summary Banner ────────────────────────────────────────────────────────────
function SummaryBanner({ entries, running }: { entries: ComponentEntry[]; running: boolean }) {
  if (running) {
    return (
      <div className="rounded-2xl border border-blue-200 dark:border-blue-800/40 bg-blue-50 dark:bg-blue-950/30 px-4 py-3 flex items-center gap-3">
        <span className="material-symbols-outlined text-blue-500 animate-spin text-lg shrink-0">sync</span>
        <div>
          <p className="text-xs font-bold text-blue-700 dark:text-blue-300">Running full hardware test…</p>
          <p className="text-[9px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">This may take a few seconds. Do not leave the screen.</p>
        </div>
      </div>
    );
  }

  const total = entries.length;
  if (total === 0) return null;

  const passed = entries.filter(e => e.item.status === 'ok').length;
  const failed = entries.filter(e => e.item.status === 'fail');
  const allPass = failed.length === 0;

  // Only show after at least one component has been last-checked
  const anyChecked = entries.some(e => e.item.lastChecked);
  if (!anyChecked) return null;

  return (
    <div className={`rounded-2xl border px-4 py-3 ${
      allPass
        ? 'border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/30'
        : 'border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/30'
    }`}>
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined text-lg ${allPass ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
          {allPass ? 'check_circle' : 'warning'}
        </span>
        <p className={`text-xs font-bold ${allPass ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
          {passed} of {total} passed
          {!allPass && ` — ${failed.map(f => f.label).join(', ')} failed`}
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function DiagnosticsView() {
  const [entries, setEntries] = useState<ComponentEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fullTestRunning, setFullTestRunning] = useState(false);

  // ── fetch initial diagnostics ─────────────────────────────────────────────
  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await ApiClient.getDiagnostics();
      if (res && res.data) {
        const mapped = Object.entries(res.data).map(([key, item]) => {
          const { label, icon } = getLabelInfo(key);
          return { key, label, icon, item };
        });
        setEntries(mapped);
      }
    } catch {
      setError('Could not reach dispenser diagnostics.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDiagnostics(); }, [fetchDiagnostics]);

  // ── test single component ─────────────────────────────────────────────────
  const handleTest = useCallback(async (key: string) => {
    // Mark that component as testing
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, item: { ...e.item, testing: true } } : e
    ));
    try {
      const res = await ApiClient.testDiagnosticComponent(key);
      setEntries(prev => prev.map(e => {
        if (e.key !== key) return e;
        return {
          ...e,
          item: {
            ...e.item,
            testing: false,
            status: res.pass ? 'ok' : 'fail',
            detail: res.detail,
            lastChecked: (res as any).lastChecked ?? Math.floor(Date.now() / 1000)
          }
        };
      }));
    } catch {
      setEntries(prev => prev.map(e =>
        e.key === key
          ? { ...e, item: { ...e.item, testing: false, status: 'unknown', detail: 'Test request failed.' } }
          : e
      ));
    }
  }, []);

  // ── run full test ─────────────────────────────────────────────────────────
  const handleFullTest = useCallback(async () => {
    if (fullTestRunning) return;
    setFullTestRunning(true);
    // Mark ALL as testing
    setEntries(prev => prev.map(e => ({ ...e, item: { ...e.item, testing: true } })));
    try {
      const res = await ApiClient.testAllDiagnostics();
      if (res && res.data) {
        const now = Math.floor(Date.now() / 1000);
        setEntries(prev => prev.map(e => {
          const result = res.data[e.key];
          if (!result) return { ...e, item: { ...e.item, testing: false } };
          return {
            ...e,
            item: {
              ...e.item,
              testing: false,
              status: result.pass ? 'ok' : 'fail',
              detail: result.detail,
              lastChecked: now
            }
          };
        }));
      }
    } catch {
      // On failure clear testing flags
      setEntries(prev => prev.map(e => ({ ...e, item: { ...e.item, testing: false, status: 'unknown' } })));
    } finally {
      setFullTestRunning(false);
    }
  }, [fullTestRunning]);

  // ── loading state ─────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <span className="material-symbols-outlined text-4xl text-teal-500 dark:text-teal-400 animate-spin">sync</span>
        <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading diagnostics…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 gap-4">
        <span className="material-symbols-outlined text-4xl text-rose-500">error</span>
        <p className="text-sm font-bold text-slate-800 dark:text-white">{error}</p>
        <button
          type="button"
          onClick={fetchDiagnostics}
          className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs rounded-xl cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 pb-6 font-sans animate-fade-in">

      {/* Header */}
      <div>
        <h1 className="text-lg font-bold text-slate-800 dark:text-white">Hardware Diagnostics</h1>
        <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mt-0.5">
          {entries.length} component{entries.length !== 1 ? 's' : ''} detected
        </p>
      </div>

      {/* Summary / Progress Banner */}
      <SummaryBanner entries={entries} running={fullTestRunning} />

      {/* Component Cards */}
      <div className="space-y-3">
        {/* Stepper motors as a dedicated grouped section */}
        {entries.some(e => e.key.startsWith('stepper')) && (
          <div>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">Pill Dispensing Motors</p>
            <div className="grid grid-cols-3 gap-2">
              {entries
                .filter(e => e.key.startsWith('stepper'))
                .sort((a, b) => a.key.localeCompare(b.key))
                .map(entry => (
                  <MotorCard key={entry.key} entry={entry} onTest={handleTest} />
                ))}
            </div>
          </div>
        )}

        {/* All other components */}
        <div>
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-2 px-1">System Components</p>
          <div className="space-y-3">
            {entries
              .filter(e => !e.key.startsWith('stepper'))
              .map(entry => (
                <ComponentCard key={entry.key} entry={entry} onTest={handleTest} />
              ))}
          </div>
        </div>
      </div>

      {/* Run Full Hardware Test */}
      <div className="pt-2">
        <button
          type="button"
          onClick={handleFullTest}
          disabled={fullTestRunning}
          className={`w-full h-13 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all active:scale-[0.99] cursor-pointer shadow-sm ${
            fullTestRunning
              ? 'bg-slate-100 dark:bg-slate-850 border border-slate-200 dark:border-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-teal-600 hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-400 text-white shadow-teal-500/20'
          }`}
        >
          {fullTestRunning ? (
            <>
              <span className="material-symbols-outlined text-xl animate-spin">sync</span>
              <span>Running Full Test…</span>
            </>
          ) : (
            <>
              <span className="material-symbols-outlined text-xl">labs</span>
              <span>Run Full Hardware Test</span>
            </>
          )}
        </button>
      </div>

    </div>
  );
}
