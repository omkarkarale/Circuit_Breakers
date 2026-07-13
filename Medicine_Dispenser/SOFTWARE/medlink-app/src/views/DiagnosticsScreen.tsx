import React, { useCallback, useEffect, useState } from 'react';
import { ApiClient, DiagnosticItem, appendLog } from '../services/apiClient';

// ─── Types ────────────────────────────────────────────────────────────────────
interface ComponentEntry {
  key: string;
  label: string;
  icon: string;
  item: DiagnosticItem & { testing?: boolean };
}

// ─── Constant Setup ───────────────────────────────────────────────────────────
const DIAGNOSTIC_KEYS = ['wifi', 'rtc', 'stepper1', 'stepper2', 'stepper3', 'ir', 'speaker'];

const LABEL_MAP: Record<string, { label: string; icon: string; description: string }> = {
  wifi:     { label: 'Wi-Fi Module',      icon: 'wifi',                 description: 'Local connection and signal status' },
  rtc:      { label: 'RTC Clock',         icon: 'schedule',             description: 'Real-time hardware clock sync' },
  stepper1: { label: 'Slot 1 Motor',      icon: 'settings_motion_mode',  description: 'Drives cartridge #1' },
  stepper2: { label: 'Slot 2 Motor',      icon: 'settings_motion_mode',  description: 'Drives cartridge #2' },
  stepper3: { label: 'Slot 3 Motor',      icon: 'settings_motion_mode',  description: 'Drives cartridge #3' },
  ir:       { label: 'IR Drop Sensor',    icon: 'sensors',              description: 'Detects pills as they drop' },
  speaker:  { label: 'Audio Buzzer',      icon: 'volume_up',            description: 'Alert alarms and audio beeps' },
};

function getLabelInfo(key: string) {
  return LABEL_MAP[key] ?? { label: key.charAt(0).toUpperCase() + key.slice(1), icon: 'developer_board', description: '' };
}

function formatRelative(unixSec: number | null | undefined): string {
  if (!unixSec) return 'Never';
  const diff = Math.floor(Date.now() / 1000) - unixSec;
  if (diff < 60) return 'Just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

const INITIAL_ENTRIES: ComponentEntry[] = DIAGNOSTIC_KEYS.map(key => {
  const { label, icon } = getLabelInfo(key);
  return {
    key,
    label,
    icon,
    item: {
      status: 'unknown',
      lastChecked: 0,
      detail: ''
    }
  };
});

// ─── Status Chip ──────────────────────────────────────────────────────────────
function StatusChip({ status, testing }: { status: string; testing?: boolean }) {
  if (testing) {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30 animate-pulse">
        <span className="material-symbols-outlined text-[10px] animate-spin">sync</span>
        Testing
      </span>
    );
  }
  if (status === 'fail') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-800/30">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
        FAIL
      </span>
    );
  }
  if (status === 'ok') {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-455 border border-emerald-200/50 dark:border-emerald-800/30">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        OK
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide bg-slate-50 dark:bg-slate-950/40 text-slate-500 dark:text-slate-405 border border-slate-200/50 dark:border-slate-800/30">
      <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
      UNKNOWN
    </span>
  );
}

// ─── Component Card ────────────────────────────────────────────────────────────
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
  const description = LABEL_MAP[key]?.description || '';

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
            <p className="text-[9px] text-slate-400 dark:text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>
        <StatusChip status={item.status} testing={isTesting} />
      </div>

      {/* Status info line */}
      <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 dark:text-slate-500 border-t border-slate-105 dark:border-slate-800/60 pt-2">
        <div className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
            isTesting  ? 'bg-blue-500 animate-pulse' :
            isFail     ? 'bg-rose-500' :
            item.status === 'ok' ? 'bg-emerald-500' : 'bg-slate-400'
          }`} />
          <span className="uppercase font-bold tracking-wider">
            {isTesting ? 'Testing' : item.status || 'unknown'}
          </span>
        </div>
        <span>Checked: {formatRelative(item.lastChecked)}</span>
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
  const [entries, setEntries] = useState<ComponentEntry[]>(INITIAL_ENTRIES);
  const [loading, setLoading] = useState(true);
  const [dispenserOffline, setDispenserOffline] = useState(false);
  const [fullTestRunning, setFullTestRunning] = useState(false);

  // ── fetch initial diagnostics ─────────────────────────────────────────────
  const fetchDiagnostics = useCallback(async () => {
    setLoading(true);
    setDispenserOffline(false);
    try {
      console.log('[DiagnosticsView] Fetching dispenser hardware diagnostics status...');
      const res = await ApiClient.getDiagnostics();
      console.log('[DiagnosticsView] Fetched diagnostics successfully:', res);
      const apiData = res?.data || {};

      setEntries(prev => {
        const current = prev.length ? prev : INITIAL_ENTRIES;
        return current.map(entry => {
          const apiItem = apiData[entry.key];
          if (apiItem) {
            return {
              ...entry,
              item: {
                ...entry.item,
                status: apiItem.status || 'unknown',
                lastChecked: apiItem.lastChecked || 0,
                detail: apiItem.detail || ''
              }
            };
          }
          return entry;
        });
      });
    } catch (err) {
      console.warn('[DiagnosticsView] Failed to reach dispenser diagnostics:', err);
      setDispenserOffline(true);
      // Mark all components as offline/unknown detail
      setEntries(prev => {
        const current = prev.length ? prev : INITIAL_ENTRIES;
        return current.map(entry => ({
          ...entry,
          item: {
            ...entry.item,
            detail: entry.item.detail || 'Dispenser offline / unreachable'
          }
        }));
      });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchDiagnostics(); }, [fetchDiagnostics]);

  // ── test single component ─────────────────────────────────────────────────
  const handleTest = useCallback(async (key: string) => {
    // Mark component as testing
    setEntries(prev => prev.map(e =>
      e.key === key ? { ...e, item: { ...e.item, testing: true } } : e
    ));
    try {
      console.log(`[DiagnosticsView] API request starting: POST /api/v1/diagnostics/test/${key}`);
      const res = await ApiClient.testDiagnosticComponent(key);
      console.log(`[DiagnosticsView] API request finished successfully for ${key}:`, res);
      
      const componentName = LABEL_MAP[key]?.label || key;
      await appendLog('connection', `Diagnostics: ${componentName} test ${res.pass ? 'passed' : 'failed'} — ${res.detail}`);

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
    } catch (err) {
      console.error(`[DiagnosticsView] API request failed for component ${key}:`, err);
      const componentName = LABEL_MAP[key]?.label || key;
      await appendLog('connection', `Diagnostics: ${componentName} test failed — request timeout or offline`);

      setEntries(prev => prev.map(e =>
        e.key === key
          ? { ...e, item: { ...e.item, testing: false, status: 'fail', detail: 'Test request failed / offline' } }
          : e
      ));
    }
  }, []);

  // ── run full test sequentially ────────────────────────────────────────────
  const handleFullTest = useCallback(async () => {
    if (fullTestRunning) return;
    setFullTestRunning(true);
    setEntries(prev => prev.map(e => ({ ...e, item: { ...e.item, testing: true } })));

    await appendLog('connection', 'Diagnostics: Started full hardware diagnostics test suite');

    for (const key of DIAGNOSTIC_KEYS) {
      try {
        console.log(`[DiagnosticsView] Sequential Test: Starting test for ${key}`);
        const res = await ApiClient.testDiagnosticComponent(key);
        console.log(`[DiagnosticsView] Sequential Test: Success for ${key}:`, res);
        
        const componentName = LABEL_MAP[key]?.label || key;
        await appendLog('connection', `Diagnostics: ${componentName} test ${res.pass ? 'passed' : 'failed'} — ${res.detail}`);

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
      } catch (err) {
        console.error(`[DiagnosticsView] Sequential Test: Failed for ${key}:`, err);
        const componentName = LABEL_MAP[key]?.label || key;
        await appendLog('connection', `Diagnostics: ${componentName} test failed — request timeout or offline`);

        setEntries(prev => prev.map(e => {
          if (e.key !== key) return e;
          return {
            ...e,
            item: {
              ...e.item,
              testing: false,
              status: 'fail',
              detail: 'Test failed / offline'
            }
          };
        }));
      }
    }
    await appendLog('connection', 'Diagnostics: Full hardware diagnostics test suite completed');
    setFullTestRunning(false);
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

  return (
    <div className="space-y-5 pb-6 font-sans animate-fade-in">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-800 dark:text-white">Hardware Diagnostics</h1>
          <p className="text-[9px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest mt-0.5">
            {entries.length} component{entries.length !== 1 ? 's' : ''} monitored
          </p>
        </div>
        {dispenserOffline && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-455 border border-rose-200/50 dark:border-rose-800/30">
            <span className="material-symbols-outlined text-xs">wifi_off</span>
            Offline
          </span>
        )}
      </div>

      {/* Summary / Progress Banner */}
      <SummaryBanner entries={entries} running={fullTestRunning} />

      {/* Component Cards */}
      <div className="space-y-3">
        {entries.map(entry => (
          <ComponentCard key={entry.key} entry={entry} onTest={handleTest} />
        ))}
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
