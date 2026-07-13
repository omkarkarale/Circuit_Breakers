import React, { useEffect, useMemo, useState } from 'react';
import { ApiClient, LogItem } from '../services/apiClient';
import { activityIcon } from '../utils/activityIcon';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOG_FILTERS = [
  { key: 'all',              label: 'All' },
  { key: 'dispensed',        label: 'Dispensed' },
  { key: 'reminder',         label: 'Reminder' },
  { key: 'low_stock',        label: 'Low stock' },
  { key: 'missed',           label: 'Missed' },
  { key: 'refill',           label: 'Refill' },
  { key: 'medicine_assign',  label: 'Assigned' },
  { key: 'medicine_removed', label: 'Removed' },
  { key: 'setting_change',   label: 'Settings' },
  { key: 'connection',       label: 'Connection' },
] as const;

type LogFilter = typeof LOG_FILTERS[number]['key'];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function relativeTime(ts: number): string {
  if (!ts || isNaN(ts)) return 'Unknown relative time';
  const seconds = Math.max(0, Math.floor(Date.now() / 1000) - ts);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function logTypeLabel(type: string): string {
  return LOG_FILTERS.find(item => item.key === type)?.label ?? type.replace(/_/g, ' ');
}

// ─── Log Row ──────────────────────────────────────────────────────────────────

function formatAbsoluteTime(ts: number): string {
  if (!ts || isNaN(ts)) return 'Unknown date/time';
  const d = new Date(ts * 1000);
  if (isNaN(d.getTime())) return 'Unknown date/time';
  return d.toLocaleString([], { hour: '2-digit', minute: '2-digit', hour12: true }) + ' • ' + d.toLocaleDateString([], { day: 'numeric', month: 'short' });
}

function LogRow({ log, isLast }: { log: LogItem; isLast: boolean }) {
  const { icon, color } = activityIcon(log.type);
  
  const slotMatch = log.detail.match(/Slot\s+(\d+)/i);
  const slotNum = slotMatch ? slotMatch[1] : null;

  // Map type → bg classes for icon badge and label chip
  const bgMap: Record<string, string> = {
    dispensed:        'bg-teal-50    dark:bg-teal-900/30',
    reminder:         'bg-blue-50    dark:bg-blue-900/30',
    low_stock:        'bg-amber-50   dark:bg-amber-900/30',
    missed:           'bg-rose-50    dark:bg-rose-900/30',
    refill:           'bg-emerald-50 dark:bg-emerald-900/30',
    medicine_assign:  'bg-violet-50  dark:bg-violet-900/30',
    medicine_removed: 'bg-rose-50    dark:bg-rose-900/30',
    setting_change:   'bg-indigo-50  dark:bg-indigo-900/30',
    connection:       'bg-slate-100  dark:bg-slate-800',
  };
  const chipMap: Record<string, string> = {
    dispensed:        'bg-teal-100 dark:bg-teal-900/40 text-teal-700 dark:text-teal-400',
    reminder:         'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
    low_stock:        'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    missed:           'bg-rose-100 dark:bg-rose-900/40 text-rose-700 dark:text-rose-400',
    refill:           'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400',
    medicine_assign:  'bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-400',
    medicine_removed: 'bg-rose-100 dark:bg-rose-900/40 text-rose-605 dark:text-rose-400',
    setting_change:   'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-400',
    connection:       'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400',
  };
  const iconBg = bgMap[log.type] ?? 'bg-slate-100 dark:bg-slate-800';
  const chipCls = chipMap[log.type] ?? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';

  return (
    <>
      <div className="flex items-start gap-3.5 px-4 py-3.5">
        {/* Icon badge */}
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${iconBg}`}>
          <span className={`material-symbols-outlined text-base ${color}`}>{icon}</span>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
            {log.detail}
          </p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5">
            <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md ${chipCls}`}>
              {logTypeLabel(log.type)}
            </span>
            {slotNum && (
              <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md bg-teal-50 dark:bg-teal-950 text-teal-650 dark:text-teal-400 border border-teal-200/20 dark:border-teal-800/20">
                Slot {slotNum}
              </span>
            )}
            <span className="text-[9px] text-slate-400 dark:text-slate-500 font-mono flex items-center gap-1">
              <span className="material-symbols-outlined text-[10px]">schedule</span>
              {relativeTime(log.ts)} ({formatAbsoluteTime(log.ts)})
            </span>
          </div>
        </div>
      </div>
      {!isLast && <div className="h-px bg-slate-100 dark:bg-slate-800 mx-4" />}
    </>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 gap-3 text-center">
      <span className="material-symbols-outlined text-4xl text-slate-300 dark:text-slate-700">history</span>
      <div>
        <p className="text-sm font-bold text-slate-500 dark:text-slate-400">No logs found</p>
        <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
          {hasFilter ? 'Try a different filter or search term.' : 'Activity will appear here once the dispenser starts operating.'}
        </p>
      </div>
    </div>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────

export default function LogsView({ onNavigate }: { onNavigate: (screen: string) => void }) {
  const [logs, setLogs]       = useState<LogItem[]>([]);
  const [query, setQuery]     = useState('');
  const [filter, setFilter]   = useState<LogFilter>('all');
  const [loading, setLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<number>(Date.now());

  // Auto-poll every 5 seconds; also refresh on window focus
  useEffect(() => {
    let active = true;

    const loadLogs = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const res = await ApiClient.getLogs();
        if (active) {
          const fetchedLogs = res.data || [];
          fetchedLogs.sort((a, b) => b.ts - a.ts);
          if (fetchedLogs.length >= 200) {
            console.warn('[LogsView] Logs limit reached (200 entries). Auto-clearing logs...');
            try {
              await ApiClient.clearLogs();
              setLogs([{
                ts: Math.floor(Date.now() / 1000),
                type: 'connection',
                detail: 'Logs auto-cleared (reached limit of 200 entries)'
              }]);
            } catch (clearErr) {
              console.error('[LogsView] Failed to auto-clear logs:', clearErr);
              setLogs(fetchedLogs);
            }
          } else {
            setLogs(fetchedLogs);
          }
          setLastRefreshed(Date.now());
        }
      } catch {
        // swallow — stale data is fine
      } finally {
        if (active) setLoading(false);
      }
    };

    loadLogs(true);
    const timer = window.setInterval(() => loadLogs(), 5000);
    const handleFocus = () => loadLogs();
    window.addEventListener('focus', handleFocus);

    return () => {
      active = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);

  const visible = useMemo(() =>
    logs.filter(log =>
      (filter === 'all' || log.type === filter) &&
      `${log.type} ${log.detail}`.toLowerCase().includes(query.toLowerCase())
    ),
    [logs, filter, query]
  );

  const hasActiveFilter = filter !== 'all' || query.trim().length > 0;

  // Relative "updated X seconds ago" label
  const [, forceUpdate] = useState(0);
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 10000);
    return () => clearInterval(t);
  }, []);
  const secondsAgo = Math.floor((Date.now() - lastRefreshed) / 1000);
  const updatedLabel = secondsAgo < 10 ? 'Just updated' : `Updated ${secondsAgo}s ago`;

  return (
    <div className="min-h-full flex flex-col bg-slate-50 dark:bg-slate-950 font-sans animate-fade-in">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-3 px-5 py-4">
          <button
            type="button"
            onClick={() => onNavigate('home')}
            className="w-10 h-10 rounded-full flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-650 dark:text-slate-350 active:scale-95 transition-all cursor-pointer hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Back"
          >
            <span className="material-symbols-outlined">arrow_back</span>
          </button>
          <div className="flex-1">
            <h1 className="text-base font-bold text-slate-800 dark:text-white">Activity Logs</h1>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-widest font-bold">
              Complete history
            </p>
          </div>
          {/* Live indicator */}
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase shrink-0">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            {loading ? 'Refreshing...' : updatedLabel}
          </div>
        </div>

        {/* ── Search bar ────────────────────────────────────────────────────── */}
        <div className="px-5 pb-3">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-base pointer-events-none">search</span>
            <input
              type="search"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search logs..."
              className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-800 dark:text-white outline-none focus:border-teal-500 dark:focus:border-teal-400 transition-colors"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            )}
          </div>
        </div>

        {/* ── Filter chips ──────────────────────────────────────────────────── */}
        <div className="flex gap-2 px-5 pb-3 overflow-x-auto no-scrollbar">
          {LOG_FILTERS.map(item => (
            <button
              key={item.key}
              type="button"
              onClick={() => setFilter(item.key)}
              className={`shrink-0 px-3 py-1.5 rounded-xl text-[10px] font-bold cursor-pointer transition-all active:scale-95 ${
                filter === item.key
                  ? 'bg-teal-600 dark:bg-teal-500 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Count bar ───────────────────────────────────────────────────────── */}
      <div className="px-5 py-2.5 flex items-center justify-between">
        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">
          {loading ? 'Loading…' : `${visible.length} event${visible.length !== 1 ? 's' : ''}`}
        </p>
        {hasActiveFilter && (
          <button
            type="button"
            onClick={() => { setFilter('all'); setQuery(''); }}
            className="text-[10px] font-bold text-teal-600 dark:text-teal-400 cursor-pointer"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* ── Log list ────────────────────────────────────────────────────────── */}
      <main className="flex-1 px-4 pb-8">
        {loading && logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <span className="material-symbols-outlined text-3xl text-teal-500 dark:text-teal-400 animate-spin">sync</span>
            <p className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Loading logs…</p>
          </div>
        ) : visible.length === 0 ? (
          <EmptyState hasFilter={hasActiveFilter} />
        ) : (
          <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
            {visible.map((log, i) => (
              <LogRow key={`${log.ts}-${i}`} log={log} isLast={i === visible.length - 1} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
